import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, realpath, stat, writeFile, rm} from 'node:fs/promises';

const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
const cli=process.argv.slice(2);
const option=name=>{const i=cli.indexOf(name);return i>=0?cli[i+1]:undefined;};
const bindHost=option('--host')||'127.0.0.1';
const strictPort=cli.includes('--strictPort');
const qaEnabled=strictPort&&option('--port')==='4173';
const ready=process.env.REZ_READY_FILE;
const token=process.env.REZ_LAUNCH_TOKEN;
const allowed=new Set(['index.html','styles.css','script.js','content.json']);
const legalRoutes=new Map([['/terms-of-service','terms-of-service.html'],['/privacy-policy','privacy-policy.html']]);
const server=http.createServer(async(req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
    const requested=new URL(req.url,'http://localhost').pathname;
    if(token && requested==='/_ready/'+token){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({token}));return;}
    const decoded=decodeURIComponent(requested);
    const legalPage=legalRoutes.get(decoded);
    const relative=legalPage||(decoded==='/'?'index.html':decoded.slice(1));
    if(relative.includes('\\') || relative.split('/').some(p=>p==='..'||p.startsWith('.')) || (!legalPage&&!allowed.has(relative)&&!relative.startsWith('images/')&&!relative.startsWith('vendor/')&&!(qaEnabled&&relative.startsWith('tests/')))){res.writeHead(404);res.end('Pagina nu a fost găsită.');return;}
    const filename=await realpath(path.join(root,relative));
    if(!filename.startsWith(root+path.sep) || !(await stat(filename)).isFile()){res.writeHead(404);res.end();return;}
    const bytes=await readFile(filename);
    res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream','content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch(err){res.writeHead(err instanceof URIError?400:404);res.end('Resursa nu este disponibilă.');}
});
let preferred=Number(option('--port')??process.env.PORT??3000);
if(!Number.isInteger(preferred)||preferred<0||preferred>65535){console.error('Port invalid. Folosește un număr între 0 și 65535.');process.exit(1);}
server.on('error',err=>{
  if(err.code==='EADDRINUSE'&&preferred!==0&&!strictPort){console.log('Portul preferat este ocupat. Aleg un port liber.');preferred=0;server.listen(0,bindHost);}
  else {console.error('Serverul nu a pornit:',err.message);process.exit(1);}
});
server.on('listening',async()=>{
  const port=server.address().port;
  const url='http://localhost:'+port;
  console.log('\nRezervari.ai: '+url+'\nOprește cu Ctrl+C.\n');
  if(ready){try{await writeFile(ready,JSON.stringify({url,port,token,pid:process.pid}),{flag:'wx'});}catch(err){console.error('Semnalul de pornire nu a putut fi creat.');server.close();process.exitCode=1;}}
});
async function stop(){server.close();server.closeAllConnections();if(ready)await rm(ready,{force:true});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
server.listen(preferred,bindHost);
