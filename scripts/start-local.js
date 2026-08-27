import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const windows=process.platform==='win32';
const temporary=await mkdtemp(path.join(tmpdir(),'rez-start-'));
const readyFile=path.join(temporary,'ready.json');
const token=randomBytes(20).toString('hex');
let exited=false,closing=false;
const child=spawn(windows?'cmd.exe':'npm',windows?['/d','/s','/c','npm run dev']:['run','dev'],{stdio:'inherit',detached:!windows,env:{...process.env,REZ_READY_FILE:readyFile,REZ_LAUNCH_TOKEN:token}});
async function cleanup(code=0){
  if(closing)return;closing=true;
  if(child.pid&&!exited){
    if(windows){await new Promise(resolve=>{const killer=spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});killer.on('error',resolve);killer.on('exit',resolve);});}
    else {try{process.kill(-child.pid,'SIGTERM');}catch{}}
  }
  await rm(temporary,{recursive:true,force:true});
  process.exitCode=code;
}
process.on('SIGINT',()=>cleanup(0));process.on('SIGTERM',()=>cleanup(0));
child.on('error',async err=>{exited=true;console.error('Pornirea a eșuat:',err.message);await cleanup(1);});
child.on('exit',async code=>{exited=true;if(!closing)await cleanup(code??1);});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ready;
for(let attempt=0;attempt<150&&!exited&&!closing;attempt++){
  try{
    const info=JSON.parse(await readFile(readyFile,'utf8'));
    if(info.token===token&&Number.isInteger(info.port)&&info.port>0&&info.port<=65535){
      const r=await fetch('http://127.0.0.1:'+info.port+'/_ready/'+token,{signal:AbortSignal.timeout(1500)});
      if(r.ok&&(await r.json()).token===token){ready=info;break;}
    }
  }catch{}
  await delay(100);
}
if(!ready&&!closing){console.error('Serverul nu a devenit disponibil. Browserul nu a fost deschis.');await cleanup(1);}
if(ready&&!closing){
  console.log('Site disponibil: '+ready.url);
  if(process.env.REZ_NO_BROWSER!=='1'){
    const executable=windows?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=windows?['/d','/s','/c','start','""',ready.url]:[ready.url];
    const opener=spawn(executable,args,{stdio:'ignore',detached:!windows});
    const failed=()=>console.log('Nu am putut deschide browserul automat. Deschide '+ready.url);
    opener.on('error',failed);opener.on('exit',code=>{if(code)failed();});opener.unref();
  }
}
