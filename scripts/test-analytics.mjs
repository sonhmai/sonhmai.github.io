import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
const token='0123456789abcdef0123456789abcdef';
const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1',PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN:token};
const build=spawnSync('node_modules/.bin/astro',['build','--outDir','.audit/analytics-build'],{env,encoding:'utf8'});
fs.writeFileSync('.audit/analytics-build.log',build.stdout+build.stderr);
assert.equal(build.status,0,build.stderr);
const production=fs.readFileSync('.audit/analytics-build/index.html','utf8');
assert(production.includes('static.cloudflareinsights.com/beacon.min.js'));
assert(production.includes(token));
assert(!fs.readFileSync('dist/index.html','utf8').includes('static.cloudflareinsights.com/beacon.min.js'));
const dev=spawn('node_modules/.bin/astro',['dev','--host','127.0.0.1','--port','4422','--ignore-lock'],{env,stdio:['ignore',fs.openSync('.audit/analytics-dev.log','w'),fs.openSync('.audit/analytics-dev-errors.log','w')]});
try {
  let html;
  for(let attempt=0;attempt<60;attempt++) {
    try { const response=await fetch('http://127.0.0.1:4422/');if(response.ok){html=await response.text();break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert(html,'Development server did not start');
  assert(!html.includes('static.cloudflareinsights.com/beacon.min.js'),'Analytics included in development');
  console.log('PASS production token includes beacon, blank token omits beacon, development with token omits beacon.');
} finally {dev.kill('SIGTERM');}
