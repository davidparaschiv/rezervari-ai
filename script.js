'use strict';
// Temporar: pagina principală Google Play. Se poate înlocui cu linkul aplicației.
const GOOGLE_PLAY_URL = 'https://play.google.com/store/';
(() => {
  const storeLink = document.getElementById('google-play');
  const isAppLink = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[A-Za-z0-9_.]+(?:&.*)?$/.test(GOOGLE_PLAY_URL);
  storeLink.href = isAppLink ? GOOGLE_PLAY_URL : 'https://play.google.com/store/';
  storeLink.setAttribute('aria-label', isAppLink ? 'Deschide Rezervari.ai în Google Play' : 'Deschide pagina principală Google Play');
  const toggle = document.getElementById('motion-toggle');
  const toggleLabel = document.getElementById('motion-label');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const stage = document.getElementById('phaser-stage');
  const fallback = stage.querySelector('.scene-fallback');
  const steps = [...document.querySelectorAll('.step')];
  const stepNumber = document.getElementById('scene-number');
  const stepLabel = document.getElementById('scene-label');
  const dots = [...document.querySelectorAll('.scene-progress i')];
  const note = document.getElementById('complete-note');
  const titles = ['Configurezi serviciile', 'Primești rezervări', 'Urmărești calendarul'];
  let motionOff = reduced.matches, game, scene, target = 0, value = 0, visible = true, scheduled = false, resizeTimer, lastLabel = -1;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { const t = clamp(x); return t*t*(3-2*t); };
  const mix = (a,b,t) => a+(b-a)*t;
  const density = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  function labels() {
    const selected = Math.round(target);
    if (lastLabel !== selected) {
      stepNumber.textContent = '0'+(selected+1); stepLabel.textContent = titles[selected];
      dots.forEach((dot,i) => dot.classList.toggle('active', i === selected)); lastLabel = selected;
    }
    note.classList.toggle('visible', target > 1.1);
  }
  function readProgress() {
    scheduled = false; if (motionOff) return;
    const pivot = mobile.matches ? Math.min(innerHeight-80, stage.parentElement.offsetHeight+(innerHeight-stage.parentElement.offsetHeight)*.45) : innerHeight*.5;
    const positions = steps.map(step => { const r = step.getBoundingClientRect(); return r.top+r.height*.5; });
    if (pivot <= positions[0]) target = 0;
    else if (pivot >= positions[2]) target = 2;
    else { const i = pivot < positions[1] ? 0 : 1; target = i+clamp((pivot-positions[i])/(positions[i+1]-positions[i])); }
    labels();
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(readProgress); } }
  function updateMotion() {
    document.body.classList.toggle('motion-off', motionOff);
    document.documentElement.style.scrollBehavior = motionOff ? 'auto' : '';
    toggle.setAttribute('aria-pressed', String(motionOff)); toggleLabel.textContent = motionOff ? 'Pornește animațiile' : 'Oprește animațiile';
    if (game) { if (motionOff || !visible || document.hidden) game.loop.sleep(); else { game.loop.wake(); schedule(); } }
  }
  toggle.addEventListener('click', () => { motionOff = !motionOff; updateMotion(); if (!game && !motionOff) startScene(); });
  reduced.addEventListener('change', () => { motionOff = reduced.matches; updateMotion(); if (!motionOff && !game) startScene(); });
  window.addEventListener('scroll', schedule, {passive:true}); window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('visibilitychange', updateMotion);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateMotion(); }, {rootMargin:'100px'}).observe(stage);
  new IntersectionObserver(entries => { document.querySelectorAll('.hero-art img').forEach(img => { img.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused'; }); }).observe(document.querySelector('.hero-art'));
  function startScene() {
    if (!window.Phaser || game || motionOff) return;
    class ObjectsScene extends Phaser.Scene {
      preload() { for (const key of ['calendar','clock','bell']) this.load.image(key,'images/'+key+'.png'); }
      create() {
        if (!['calendar','clock','bell'].every(key => this.textures.exists(key))) return;
        scene = this; this.objects = ['calendar','clock','bell'].map(key => this.add.image(0,0,key));
        fallback.hidden = true; this.paint(); updateMotion();
      }
      update(time,delta) {
        if (!this.objects) return;
        value += (target-value)*(1-Math.exp(-Math.min(delta,50)/115));
        if (Math.abs(value-target)<.0001) value=target;
        this.paint();
      }
      paint() {
        if (!this.objects) return;
        const w=this.scale.width,h=this.scale.height,base=Math.min(w,h*.96);
        const poses=[
          [[.50,.48,.88,-.08],[.79,.74,.37,.12],[.79,.3,.24,0]],
          [[.22,.59,.37,-.11],[.50,.46,.86,.035],[.80,.63,.25,.06]],
          [[.50,.48,.88,.015],[.21,.73,.34,-.07],[.79,.68,.38,-.08]]
        ];
        const from=Math.min(1,Math.floor(value)),blend=smooth((value-from-.06)/.88);
        this.objects.forEach((object,i) => {
          const a=poses[from][i],b=poses[from+1][i];
          const [x,y,size,angle]=a.map((n,k)=>mix(n,b[k],blend));
          object.setPosition(w*x,h*y).setDisplaySize(base*size,base*size).setRotation(angle).setDepth(size);
          object.setAlpha(i===2?smooth((value-1.1)/.55):1);
        });
      }
    }
    try {
      game=new Phaser.Game({type:Phaser.AUTO,parent:stage,width:Math.round(stage.clientWidth*density()),height:Math.round(stage.clientHeight*density()),transparent:true,banner:false,audio:{noAudio:true},render:{antialias:true,pixelArt:false,roundPixels:false},scale:{mode:Phaser.Scale.NONE},fps:{target:60,forceSetTimeOut:false},scene:[ObjectsScene]});
      game.canvas.setAttribute('aria-hidden','true');
    } catch(error) { fallback.hidden=false; if(game)game.destroy(true); game=undefined; }
  }
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(() => { if(game&&scene){game.scale.resize(Math.round(stage.clientWidth*density()),Math.round(stage.clientHeight*density()));scene.paint();}schedule(); },80);
  }).observe(stage);
  updateMotion(); labels(); readProgress(); startScene();
})();
