/* NepalMBBS.in — exam-api.js
   Every request the exam console makes, in one place.

   Two things it does NOT do. It does not decide what a counselor may see:
   every call carries their session JWT and the policies in 0006 answer. And it
   does not compute anything about a student's marks — totals, percentages,
   ranks and deltas all arrive from exam_report()/exam_cohort(), so the number
   on the screen, the number on the report card and the number in the WhatsApp
   message are the same number from the same query. */

(function (root) {
  'use strict';

  function base() { return (typeof SB === 'string' && SB) || root.SB; }

  async function rest(path, opts) {
    opts = opts || {};
    var res = await fetch(base() + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        root.Auth.headers(),
        opts.prefer ? { Prefer: opts.prefer } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      var text = await res.text().catch(function () { return ''; });
      var e = new Error(readable(res.status, text));
      e.status = res.status; e.body = text;
      throw e;
    }
    return res.status === 204 ? null : res.json();
  }

  function readable(status, text) {
    if (status === 401) return 'Your session has expired. Sign in again.';
    if (status === 403) return 'You do not have access to that college.';
    if (status === 409) return 'That conflicts with something already saved.';
    try {
      var body = JSON.parse(text);
      if (body.message) return body.message;
    } catch (e) {}
    return 'Request failed (' + status + ').';
  }

  function rpc(name, args) {
    return rest('rpc/' + name, { method: 'POST', body: args || {} });
  }

  /* Edge functions carry the same JWT. The console never holds a provider key;
     these two calls are the only way it reaches a model or WhatsApp. */
  async function fn(name, body) {
    var res = await fetch(base() + '/functions/v1/' + name, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, root.Auth.headers()),
      body: JSON.stringify(body || {})
    });
    var out = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var e = new Error(out.error || out.note || ('That failed (' + res.status + ').'));
      e.status = res.status; e.payload = out;
      throw e;
    }
    return out;
  }

  async function upload(bucket, path, blob, contentType) {
    var res = await fetch(base() + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': contentType || blob.type || 'application/octet-stream',
          'x-upsert': 'true' },
        root.Auth.headers()),
      body: blob
    });
    if (!res.ok) throw new Error('Could not store the file (' + res.status + ').');
    return bucket + '/' + path;
  }

  var api = {
    rest: rest, rpc: rpc, fn: fn, upload: upload,

    institutions: function () {
      return rest('institutions?select=id,name,short_name,address,logo_path,accent_color&order=name');
    },
    batches: function (institutionId) {
      return rest('batches?select=id,name,course,year_label&institution_id=eq.' +
                  institutionId + '&order=name.desc');
    },
    exams: function (institutionId) {
      return rest('exams?select=id,name,batch_id,exam_kind,held_label,result_label,sequence_no,created_at' +
                  '&institution_id=eq.' + institutionId +
                  '&order=sequence_no.desc,created_at.desc');
    },
    dashboard: function (institutionId) { return rpc('exam_dashboard', { p_institution: institutionId }); },
    cohort:    function (examId)        { return rpc('exam_cohort', { p_exam: examId }); },
    report:    function (studentId, examId) {
      return rpc('exam_report', { p_student: studentId, p_exam: examId });
    },
    importBatch: function (payload, mode, reason) {
      return rpc('import_exam_batch', { p_payload: payload, p_mode: mode || 'strict', p_reason: reason || null });
    },

    /* Search runs in the database, not over a downloaded list: a college with
       several batches of several hundred students should not ship all of them
       to the browser to filter three of them. */
    searchStudents: function (institutionId, query) {
      var q = String(query || '').trim();
      var path = 'students?select=id,full_name,student_code,serial_no,batch_id,category' +
                 ',batches(name,course,year_label)' +
                 '&institution_id=eq.' + institutionId + '&order=full_name&limit=40';
      if (q) {
        var safe = q.replace(/[(),*]/g, ' ').trim();
        path += '&or=(full_name.ilike.*' + encodeURIComponent(safe) + '*,' +
                'student_code.ilike.*' + encodeURIComponent(safe) + '*)';
      }
      return rest(path);
    },
    student: function (studentId) {
      return rest('students?select=id,full_name,student_code,serial_no,category,photo_path,' +
                  'institution_id,batches(id,name,course,year_label),' +
                  'guardians(id,relation,full_name,phone_raw,phone_e164,phone_status)' +
                  '&id=eq.' + studentId).then(function (rows) { return rows[0] || null; });
    },
    updateGuardian: function (guardianId, patch) {
      return rest('guardians?id=eq.' + guardianId,
        { method: 'PATCH', body: patch, prefer: 'return=representation' });
    },

    templates: function (institutionId) {
      return rest('report_templates?select=id,institution_id,key,name,spec,is_default' +
                  '&or=(institution_id.is.null,institution_id.eq.' + institutionId + ')' +
                  '&order=institution_id.nullsfirst,name');
    },
    saveTemplate: function (row) {
      return rest('report_templates', {
        method: 'POST', body: row,
        prefer: 'return=representation,resolution=merge-duplicates'
      });
    },

    reportCards: function (studentId, examId) {
      return rest('report_cards?select=id,version,image_path,generated_at,template_id' +
                  '&student_id=eq.' + studentId + '&exam_id=eq.' + examId +
                  '&order=version.desc');
    },
    saveReportCard: function (row) {
      return rest('report_cards', { method: 'POST', body: row, prefer: 'return=representation' });
    },

    messages: function (studentId) {
      return rest('parent_messages?select=id,status,to_phone,recipient_name,recipient_relation,' +
                  'body,created_at,sent_at,delivered_at,read_at,error,exam_id' +
                  '&student_id=eq.' + studentId + '&order=created_at.desc&limit=20');
    },
    queueMessage: function (row) {
      return rest('parent_messages', { method: 'POST', body: row, prefer: 'return=representation' });
    },
    sendMessage: function (messageId) { return fn('whatsapp-send', { message_id: messageId }); },
    ai: function (task, input, institutionId, opts) {
      return fn('ai-gateway', Object.assign(
        { task: task, input: input, institution_id: institutionId }, opts || {}));
    },
    aiUsage: function (institutionId) {
      var since = new Date(Date.now() - 7 * 86400000).toISOString();
      return rest('ai_usage?select=task,provider,model,prompt_tokens,completion_tokens,cache_hit,ok' +
                  '&created_at=gte.' + since +
                  (institutionId ? '&institution_id=eq.' + institutionId : '') +
                  '&order=created_at.desc&limit=200');
    }
  };

  root.ExamApi = api;
})(window);
