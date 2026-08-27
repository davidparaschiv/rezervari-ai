import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
const root=process.cwd();
async function launch(port){
 const dir=await mkdtemp(path.join(tmpdir(),'rez-test-'));const ready=path.join(dir,'ready.json');
 const child=spawn(process.execPath,['dev-server.js'],{cwd:root,env:{...process.env,PORT:String(port),REZ_READY_FILE:ready,REZ_LAUNCH_TOKEN:'test-token'},stdio:'ignore'});
 let data;
 for(let i=0;i<100;i++){try{data=JSON.parse(await readFile(ready,'utf8'));break}catch{}await new Promise(r=>setTimeout(r,30));}
 if(!data){child.kill();throw Error('Server did not start');}
 return {data,close:async()=>{const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done;await rm(dir,{recursive:true,force:true});}};
}
test('source content and plan features preserved',async()=>{
 const data=JSON.parse(await readFile('content.json','utf8'));const html=await readFile('index.html','utf8');
 assert(html.includes(data.find(x=>x.topic==='descrierea aplicației').text.trim()));
 const features=data.find(x=>x.topic==='servicii oferite').text.split('\n').filter(x=>x.startsWith('-')).map(x=>x.slice(1));
 for(const feature of features)assert(html.includes(feature),feature);
 assert.equal((html.match(/class="price-card/g)||[]).length,2);
 assert(!/<nav\b/.test(html));
 for(const f of ['script.js','dev-server.js','scripts/start-local.js'])assert(!(await readFile(f,'utf8')).includes('DA_'));
});
test('Google Play icon links to the store while its caption remains outside the link',async()=>{
 const html=await readFile('index.html','utf8');
 const link=html.match(/<a\b[^>]*id="google-play"[^>]*>([\s\S]*?)<\/a>/);
 assert(link,'Native link works even without JavaScript');
 assert(link[0].includes('href="https://play.google.com/store/"'));
 assert(link[1].includes('<svg'));
 assert(!link[1].includes('available on Google Play'));
 assert(html.includes('</a><span>available on Google Play</span>'));
 assert(!html.includes('Linkul aplicației va fi disponibil aici.'));
});
test('static server responds, protects private files, handles HEAD and collisions',async()=>{
 const blocker=http.createServer((req,res)=>res.end('occupied'));
 await new Promise(r=>blocker.listen(0,'127.0.0.1',r));
 const occupied=blocker.address().port;
 const running=await launch(occupied);
 try{
  assert.notEqual(running.data.port,occupied);
  const base='http://127.0.0.1:'+running.data.port;
  const page=await fetch(base);assert.equal(page.status,200);assert((await page.text()).includes('<title>Rezervari.ai</title>'));
  for(const url of ['/images/calendar.png','/images/clock.png','/images/bell.png','/vendor/phaser.min.js'])assert.equal((await fetch(base+url)).status,200);
  for(const url of ['/.openai/hosting.json','/scripts/start-local.js','/README.md','/images/%2e%2e/package.json','/tests/responsive.html'])assert.equal((await fetch(base+url)).status,404);
  const head=await fetch(base,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(base,{method:'POST'})).status,405);
  assert.equal((await (await fetch(base+'/_ready/test-token')).json()).token,'test-token');
 }finally{await running.close();await new Promise(r=>blocker.close(r));}
});
test('start.sh stops before dev/browser when npm install fails',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'rez-install-fail-'));
 await writeFile(path.join(dir,'npm'),'#!/usr/bin/env bash\nprintf "called:%s\\n" "$*"\nexit 19\n',{mode:0o755});
 const child=spawn('bash',['start.sh'],{cwd:root,env:{...process.env,PATH:dir+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
 const code=await new Promise(r=>child.on('exit',r));await rm(dir,{recursive:true,force:true});
 assert.notEqual(code,0);assert(out.includes('called:install'));assert(!out.includes('called:run dev'));assert(out.includes('Serverul și browserul nu au fost pornite'));
});
