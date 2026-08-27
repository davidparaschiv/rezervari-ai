import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,cp,rm,readdir} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=path.join(root,'.github-pages.json');
const question=createInterface({input:process.stdin,output:process.stdout});
const inputLines=[];
let inputClosed=false, pendingQuestion=null;
question.on('line',line=>{if(pendingQuestion){const current=pendingQuestion;pendingQuestion=null;current.resolve(line);}else inputLines.push(line);});
question.on('close',()=>{inputClosed=true;if(pendingQuestion){pendingQuestion.reject(Error('Răspunsul necesar nu a fost furnizat.'));pendingQuestion=null;}});
const ask=prompt=>{process.stdout.write(prompt);if(inputLines.length)return Promise.resolve(inputLines.shift());if(inputClosed)return Promise.reject(Error('Răspunsul necesar nu a fost furnizat.'));return new Promise((resolve,reject)=>{pendingQuestion={resolve,reject};});};
let temporary;
const git=(args,cwd=root,inherit=false)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:inherit?'inherit':['ignore','pipe','pipe']})?.trim();
const getConfig=key=>{try{return git(['config','--get',key]);}catch{return '';}};
try{
  let saved={};try{saved=JSON.parse(await readFile(config,'utf8'));}catch{}
  let remote=process.env.GITHUB_REPOSITORY_URL||saved.repository;
  if(!remote)remote=await ask('Adresa repository-ului GitHub existent (https://github.com/utilizator/proiect): ');
  const match=remote.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if(!match)throw Error('Folosește o adresă github.com fără token sau parolă.');
  const owner=match[1],repository=match[2];
  if([owner,repository].some(value=>value==='.'||value==='..'))throw Error('Repository invalid.');
  const url=remote.trim().startsWith('git@')?'git@github.com:'+owner+'/'+repository+'.git':'https://github.com/'+owner+'/'+repository+'.git';
  console.log('\nDestinație: '+owner+'/'+repository+' · ramura gh-pages');
  console.log('Site-ul și datele de contact vor deveni publice prin GitHub Pages.');
  const confirmation=(await ask('Continui publicarea? [da/N]: ')).trim().toLowerCase();
  if(!['da','d','yes','y'].includes(confirmation)){console.log('Publicare anulată.');process.exitCode=0;}
  else {
    // Explicit allowlist only: no server, source JSON, credentials or print poster.
    const files=['index.html','styles.css','script.js','images','vendor','terms-of-service.html','privacy-policy.html'];
    for(const name of files)await readdir(path.dirname(path.join(root,name)));
    const name=getConfig('user.name')||await ask('Numele tău pentru commit: ');
    const email=getConfig('user.email')||await ask('Adresa de e-mail pentru commit: ');
    if(!name.trim()||!email.trim())throw Error('Numele și adresa de e-mail sunt necesare pentru publicare.');
    const branchExists=Boolean(git(['ls-remote','--heads',url,'refs/heads/gh-pages']));
    temporary=await mkdtemp(path.join(tmpdir(),'rez-pages-'));
    git(['init','--quiet'],temporary);git(['remote','add','origin',url],temporary);
    if(branchExists){git(['fetch','--depth=1','origin','gh-pages'],temporary,true);git(['checkout','-B','gh-pages','FETCH_HEAD'],temporary,true);}
    else git(['checkout','--orphan','gh-pages'],temporary,true);
    // Only the isolated publication checkout is cleaned. Preserve custom domain.
    for(const entry of await readdir(temporary)){if(!['.git','CNAME'].includes(entry))await rm(path.join(temporary,entry),{recursive:true,force:true});}
    for(const entry of files)await cp(path.join(root,entry),path.join(temporary,entry),{recursive:true});
    await writeFile(path.join(temporary,'.nojekyll'),'');
    const marker='rez-'+Date.now()+'-'+randomBytes(4).toString('hex');
    const index=await readFile(path.join(temporary,'index.html'),'utf8');
    await writeFile(path.join(temporary,'index.html'),index.replace('</head>','<meta name="rez-publicare" content="'+marker+'">\n</head>'));
    git(['config','user.name',name],temporary);git(['config','user.email',email],temporary);
    git(['add','--all'],temporary);git(['commit','-m','Publicare Rezervari.ai'],temporary,true);
    git(['push','origin','HEAD:refs/heads/gh-pages'],temporary,true);
    await writeFile(config,JSON.stringify({repository:url},null,2)+'\n');
    let pageURL='https://'+owner+'.github.io/'+(repository.toLowerCase()===owner.toLowerCase()+'.github.io'?'':repository+'/');
    try{const custom=(await readFile(path.join(temporary,'CNAME'),'utf8')).trim();if(/^[a-z0-9.-]+$/i.test(custom))pageURL='https://'+custom+'/';}catch{}
    console.log('\nFișierele au fost trimise. La prima utilizare, în GitHub → Settings → Pages, selectează „Deploy from a branch”, „gh-pages” și „/ (root)”.');
    console.log('Verific disponibilitatea la '+pageURL);
    let verified=false;
    for(let i=0;i<24;i++){
      try{const response=await fetch(pageURL+'?verificare='+marker,{signal:AbortSignal.timeout(4000),cache:'no-store'});if(response.ok&&(await response.text()).includes(marker)){verified=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,4000));
    }
    if(verified)console.log('Publicare verificată: '+pageURL);
    else console.log('Fișiere trimise, dar publicarea nu este încă verificată. Verifică setările Pages și starea publicării în GitHub. Adresă estimată: '+pageURL);
  }
}catch(error){console.error('\nPublicarea s-a oprit: '+(error.stderr?.toString().trim()||error.message));console.error('Verifică adresa repository-ului, accesul GitHub și configurarea Pages. Nu s-a folosit force-push și proiectul local nu a fost modificat.');process.exitCode=1;}
finally{question.close();if(temporary)await rm(temporary,{recursive:true,force:true});}
