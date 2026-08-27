import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const DIST=path.join(path.resolve(import.meta.dirname, '..'), 'dist');
const M={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
const s=http.createServer((q,r)=>{let p=q.url.split('?')[0];let f=path.join(DIST,p);
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 else if(!fs.existsSync(f)&&fs.existsSync(f+'/index.html'))f=f+'/index.html';
 if(!fs.existsSync(f)){r.writeHead(404);return r.end('nf');}
 r.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});r.end(fs.readFileSync(f));});
await new Promise(r=>s.listen(8200,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1280,height:900}});
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));

// Stand in for Supabase Auth + PostgREST so the flow can be exercised offline.
await ctx.route('**/auth/v1/token**', async route=>{
  const body=JSON.parse(route.request().postData()||'{}');
  if(body.email==='staff@nepalmbbs.in' && body.password==='correct-password'){
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      access_token:'JWT-FOR-STAFF', refresh_token:'R', expires_in:3600,
      user:{id:'11111111-1111-1111-1111-111111111111',email:body.email}})});
  }
  if(body.email==='stranger@example.com' && body.password==='correct-password'){
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      access_token:'JWT-FOR-STRANGER', refresh_token:'R', expires_in:3600,
      user:{id:'22222222-2222-2222-2222-222222222222',email:body.email}})});
  }
  return route.fulfill({status:400,contentType:'application/json',
    body:JSON.stringify({error_description:'Invalid login credentials'})});
});
// Catch-all first: Playwright matches routes in REVERSE registration order,
// so a broad pattern registered last swallows every specific one after it.
await ctx.route('**/rest/v1/**', route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
// staff lookup: only the real staff uuid resolves, and only with its own JWT
await ctx.route('**/rest/v1/staff**', async route=>{
  const auth=route.request().headers()['authorization']||'';
  const url=route.request().url();
  if(auth.includes('JWT-FOR-STAFF') && url.includes('11111111'))
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify([{id:'11111111-1111-1111-1111-111111111111',email:'staff@nepalmbbs.in',full_name:'Counselor',role:'admin'}])});
  return route.fulfill({status:200,contentType:'application/json',body:'[]'});
});

await pg.goto('http://localhost:8200/',{waitUntil:'load'});
await pg.waitForTimeout(1200);

const R = [];
const check=(n,p,d='')=>R.push({n,p,d});

// 1. the old client-side bypass must be gone
const bypass = await pg.evaluate(() => {
  const src = [...document.scripts].map(s=>s.src).join(' ');
  return { hasAuthJs: /auth\.js/.test(src),
           adminJsText: typeof doAdminLogin === 'function' ? doAdminLogin.toString() : '' };
});
check('auth.js is loaded', bypass.hasAuthJs);
check('login no longer compares a password in the browser',
  !/sha256Hex\(pass\)|=== *stored|pass *=== */.test(bypass.adminJsText), bypass.adminJsText.slice(0,80));
check('login calls Supabase Auth', /Auth\.signIn/.test(bypass.adminJsText));

// 2. wrong credentials
await pg.evaluate(()=>{ openAdmin(); });
await pg.fill('#admin-email','staff@nepalmbbs.in');
await pg.fill('#admin-pass','wrong-password');
await pg.evaluate(()=>doAdminLogin()); await pg.waitForTimeout(500);
let st = await pg.evaluate(()=>({err:document.getElementById('admin-err').textContent,
  shown:document.getElementById('admin-main').style.display, signed: !!(window.Auth&&Auth.isSignedIn)}));
check('wrong password is refused', st.shown!=='block' && !st.signed, JSON.stringify(st));
check('error does not reveal whether the email exists',
  !/email|user|account not found|no such/i.test(st.err) || /do not match/i.test(st.err), st.err);

// 3. right credentials but NOT on the staff list
await pg.fill('#admin-email','stranger@example.com');
await pg.fill('#admin-pass','correct-password');
await pg.evaluate(()=>doAdminLogin()); await pg.waitForTimeout(700);
st = await pg.evaluate(()=>({err:document.getElementById('admin-err').textContent,
  shown:document.getElementById('admin-main').style.display, signed:!!(window.Auth&&Auth.isSignedIn)}));
check('a valid account that is not staff is rejected', st.shown!=='block', JSON.stringify(st));
check('and is signed back out', !st.signed, 'still signed in');

// 4. real staff
await pg.fill('#admin-email','staff@nepalmbbs.in');
await pg.fill('#admin-pass','correct-password');
await pg.evaluate(()=>doAdminLogin()); await pg.waitForTimeout(900);
st = await pg.evaluate(()=>({shown:document.getElementById('admin-main').style.display,
  signed:!!(window.Auth&&Auth.isSignedIn), who:(window.currentStaff||{}).role,
  err:document.getElementById('admin-err').textContent}));
check('staff sign-in opens the panel', st.shown==='block' && st.signed, JSON.stringify(st));
check('staff role is recorded', st.who==='admin', String(st.who));

// 5. the session token is actually attached to requests
const hdr = await pg.evaluate(()=> (window.Auth ? Auth.headers().Authorization : ''));
check('requests carry the session JWT, not the anon key', hdr==='Bearer JWT-FOR-STAFF', hdr.slice(0,30));

// 6. session is not persisted to localStorage
const stored = await pg.evaluate(()=>({ls:Object.keys(localStorage), ss:Object.keys(sessionStorage)}));
check('session is not written to localStorage', !stored.ls.some(k=>/session/i.test(k)), JSON.stringify(stored.ls));
check('session is in sessionStorage (dies with the tab)', stored.ss.some(k=>/session/i.test(k)), JSON.stringify(stored.ss));

console.log('\n══════ ADMIN AUTH ══════');
let f=0; R.forEach(r=>{ if(!r.p)f++; console.log(`${r.p?'✅':'❌'}  ${r.n}${r.p||!r.d?'':'\n      → '+r.d}`); });
console.log(`\n${R.length-f}/${R.length} passed · JS errors: ${errs.length}`);
await b.close(); s.close(); process.exit(f?1:0);
