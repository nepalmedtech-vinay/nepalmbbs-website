/* NepalMBBS.in — auth.js
   Real authentication for the admin panel.

   What this replaces was a password comparison in the browser. Even after
   Phase 0 removed the hardcoded backdoor and moved to a hash, the shape of it
   was wrong in a way no amount of hashing fixes: the check ran on the client,
   and the client is the attacker's machine. Anyone could set adminLoggedIn in
   a console, or skip the panel entirely and talk to PostgREST with the anon
   key that ships in the page.

   The fix is not a better gate. It is that the gate stops being the thing that
   protects anything. After 0001/0002 the database refuses to return a lead to
   anyone who is not in `staff`, so the UI can be bypassed and there is nothing
   behind it. This file's job is only to obtain a real session and put its JWT
   on every request.

   Requires migrations 0001-0003. Without them this authenticates correctly and
   the database still hands data to anon, which is the situation it exists to
   end. */

(function (root) {
  'use strict';

  var KEY = 'nmb_session_v1';
  var session = null;      // { access_token, refresh_token, expires_at, user }
  var refreshTimer = 0;

  function save(s) {
    session = s;
    try {
      // sessionStorage, not localStorage: a counselor's session should not
      // outlive the tab on a shared machine, and this is often a shared
      // machine.
      if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
      else sessionStorage.removeItem(KEY);
    } catch (e) {}
    scheduleRefresh();
    root.dispatchEvent(new CustomEvent('authchange', { detail: s }));
  }

  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s && s.expires_at && s.expires_at > Date.now() / 1000) { session = s; scheduleRefresh(); }
      else if (s) { sessionStorage.removeItem(KEY); }
    } catch (e) {}
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (!session || !session.expires_at) return;
    // Refresh a minute before expiry. Letting it lapse mid-edit loses whatever
    // the counselor was typing.
    var ms = (session.expires_at - Date.now() / 1000 - 60) * 1000;
    refreshTimer = setTimeout(refresh, Math.max(ms, 5000));
  }

  async function authFetch(path, body) {
    var res = await fetch(SB + '/auth/v1' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: AK },
      body: JSON.stringify(body)
    });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var e = new Error(json.error_description || json.msg || json.message || 'Sign-in failed');
      e.status = res.status;
      throw e;
    }
    return json;
  }

  function adopt(j) {
    save({
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
      user: j.user ? { id: j.user.id, email: j.user.email } : null
    });
    return session;
  }

  async function signIn(email, password) {
    return adopt(await authFetch('/token?grant_type=password', { email: email, password: password }));
  }

  async function refresh() {
    if (!session || !session.refresh_token) return null;
    try {
      return adopt(await authFetch('/token?grant_type=refresh_token',
        { refresh_token: session.refresh_token }));
    } catch (e) {
      // A refresh that fails means the session is gone. Clearing it is the
      // honest outcome; pretending otherwise leaves the UI showing data the
      // next request cannot fetch.
      save(null);
      return null;
    }
  }

  async function signOut() {
    if (session) {
      try {
        await fetch(SB + '/auth/v1/logout', {
          method: 'POST',
          headers: { apikey: AK, Authorization: 'Bearer ' + session.access_token }
        });
      } catch (e) {}
    }
    save(null);
  }

  async function sendReset(email) {
    await authFetch('/recover', { email: email });
  }

  /* Whether this user is on the team. Not a UI convenience — it decides what
     the panel offers — but never a security boundary: every table already
     refuses non-staff regardless of what this returns. */
  async function whoAmI() {
    if (!session) return null;
    try {
      var res = await fetch(SB + '/rest/v1/staff?select=id,email,full_name,role&id=eq.' +
        encodeURIComponent(session.user.id), { headers: headers() });
      if (!res.ok) return null;
      var rows = await res.json();
      return rows && rows[0] ? rows[0] : null;
    } catch (e) { return null; }
  }

  function headers(extra) {
    var h = Object.assign({ apikey: AK }, extra || {});
    // The anon key stays as `apikey` because PostgREST wants it for routing;
    // Authorization is what actually decides the role, so a signed-in request
    // runs as `authenticated` and gets the staff policies.
    h.Authorization = 'Bearer ' + (session ? session.access_token : AK);
    return h;
  }

  load();

  root.Auth = {
    signIn: signIn, signOut: signOut, refresh: refresh, sendReset: sendReset,
    whoAmI: whoAmI, headers: headers,
    get session() { return session; },
    get isSignedIn() { return !!session; }
  };
})(window);
