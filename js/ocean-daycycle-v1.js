/* ===== Ocean Daycycle Engine v1.0 =====
 * Extracted from sun-ocean-daycycle-v5.html, adapted for project structure.
 * 4-phase cycle: dawn -> noon -> dusk -> night, 18s per phase, 72s total.
 * 4 Canvas layers: sky (stars/sun-moon/meteors) + sea (waves/caustics)
 *   + underwater (bio-particles/bubbles/light-shafts) + fx (mouse/bursts/ripples)
 * CSS pure gradient background layer = zero line-sea artifact.
 * (c) shushu-bibi.cn
 */
(function () {
"use strict";
if (window.__oceanDaycycleStarted) return;
window.__oceanDaycycleStarted = true;

var CYCLE_DURATION = 18000;
var TRANSITION_RATIO = 0.35;
var SEA_Y = 0.42;

/* v5 core: brighter underwater colors, unified top/bottom brightness */
var PHASES = [
  { /* dawn */
    icon: '\u{1F305}', label: '\u6E05\u6668',
    skyTop:'#FFD4AA',skyMid:'#FFE0C8',skyBot:'#FFECDD',
    seaTop:'#FFE8D0',seaShallow:'#D4E8EE',seaMid:'#90CCDE',seaDeep:'#58ADD0',seaBot:'#4090B8',
    underTop:'#7AC8E0',underMid:'#5AB0D0',underBot:'#3A98B8',
    starAlpha:0.08,particleHue:[35,55],particleSat:45,
    sunColor:'#FFE4A0',sunGlowR:255,sunGlowG:210,sunGlowB:130,
    causticR:255,causticG:235,causticB:190,
    reflectAlpha:0.45,shaftAlpha:0.14
  },
  { /* noon - bright blue underwater, no black */
    icon: '\u2600\uFE0F', label: '\u6B63\u5348',
    skyTop:'#5CB8E8',skyMid:'#85D4F4',skyBot:'#B8ECFA',
    seaTop:'#B8ECFA',seaShallow:'#68C8F0',seaMid:'#38AAF0',seaDeep:'#1A90DF',seaBot:'#1078C8',
    underTop:'#48B0E0',underMid:'#3098D0',underBot:'#1080C0',
    starAlpha:0,particleHue:[195,215],particleSat:55,
    sunColor:'#FFF8DC',sunGlowR:255,sunGlowG:252,sunGlowB:210,
    causticR:230,causticG:250,causticB:255,
    reflectAlpha:0.5,shaftAlpha:0.17
  },
  { /* dusk - warm but not too dark */
    icon: '\u{1F307}', label: '\u9EC4\u660F',
    skyTop:'#E87D30',skyMid:'#FF9848',skyBot:'#FFCC88',
    seaTop:'#FFCC80',seaShallow:'#FFAB65',seaMid:'#E88838',seaDeep:'#C86420',seaBot:'#A04810',
    underTop:'#D07048',underMid:'#B05838',underBot:'#904028',
    starAlpha:0.12,particleHue:[20,40],particleSat:65,
    sunColor:'#FF9040',sunGlowR:255,sunGlowG:140,sunGlowB:60,
    causticR:255,causticG:200,causticB:120,
    reflectAlpha:0.4,shaftAlpha:0.15
  },
  { /* night - deep blue, not pure black */
    icon: '\u{1F319}', label: '\u591C\u665A',
    skyTop:'#142850',skyMid:'#20386A',skyBot:'#304A82',
    seaTop:'#304A82',seaShallow:'#204068',seaMid:'#183858',seaDeep:'#102848',seaBot:'#0C2040',
    underTop:'#2A4878',underMid:'#1E3868',underBot:'#142858',
    starAlpha:0.9,particleHue:[200,240],particleSat:35,
    sunColor:'#C0D0EE',sunGlowR:140,sunGlowG:165,sunGlowB:230,
    causticR:140,causticG:175,causticB:230,
    reflectAlpha:0.25,shaftAlpha:0.08
  }
];

function hexToRgb(h){var x=h.replace('#','');return{r:parseInt(x.substr(0,2),16),g:parseInt(x.substr(2,2),16),b:parseInt(x.substr(4,2),16)}}
function lerp(a,b,t){return a+(b-a)*t}
function easeInOut(t){return t*t*(3-2*t)}
function lerpRgb(c1,c2,t){var a=hexToRgb(c1),b=hexToRgb(c2);return{r:Math.round(lerp(a.r,b.r,t)),g:Math.round(lerp(a.g,b.g,t)),b:Math.round(lerp(a.b,b.b,t))}}
function rgbStr(r,g,b,a){return 'rgba('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+','+(a!==undefined?a:1)+')'}

function getCurrentPhase(){
  var now=Date.now();
  var totalCycle=CYCLE_DURATION*4;
  var pos=(now%totalCycle)/totalCycle;
  var idx=Math.floor(pos*4)%4;
  var localPos=(pos*4)%1;
  var transStart=1-TRANSITION_RATIO;
  if(localPos>transStart){
    var transT=easeInOut((localPos-transStart)/TRANSITION_RATIO);
    var nextIdx=(idx+1)%4;
    var p1=PHASES[idx],p2=PHASES[nextIdx];
    var result={};
    var ck=['skyTop','skyMid','skyBot','seaTop','seaShallow','seaMid','seaDeep','seaBot','underTop','underMid','underBot'];
    for(var i=0;i<ck.length;i++){result[ck[i]]=lerpRgb(p1[ck[i]],p2[ck[i]],transT)}
    result.starAlpha=lerp(p1.starAlpha,p2.starAlpha,transT);
    result.particleHue=[lerp(p1.particleHue[0],p2.particleHue[0],transT),lerp(p1.particleHue[1],p2.particleHue[1],transT)];
    result.particleSat=lerp(p1.particleSat,p2.particleSat,transT);
    result.sunColor=transT>0.5?p2.sunColor:p1.sunColor;
    result.sunGlowR=lerp(p1.sunGlowR,p2.sunGlowR,transT);result.sunGlowG=lerp(p1.sunGlowG,p2.sunGlowG,transT);result.sunGlowB=lerp(p1.sunGlowB,p2.sunGlowB,transT);
    result.causticR=lerp(p1.causticR,p2.causticR,transT);result.causticG=lerp(p1.causticG,p2.causticG,transT);result.causticB=lerp(p1.causticB,p2.causticB,transT);
    result.reflectAlpha=lerp(p1.reflectAlpha,p2.reflectAlpha,transT);
    result.shaftAlpha=lerp(p1.shaftAlpha,p2.shaftAlpha,transT);
    result.icon=transT>0.5?p2.icon:p1.icon;result.label=transT>0.5?p2.label:p1.label;
    return{phase:result,idx:idx,nextIdx:nextIdx,inTransition:true,transT:transT};
  }
  var p=PHASES[idx];var result={};
  var ck=['skyTop','skyMid','skyBot','seaTop','seaShallow','seaMid','seaDeep','seaBot','underTop','underMid','underBot'];
  for(var i=0;i<ck.length;i++){result[ck[i]]=hexToRgb(p[ck[i]])}
  result.starAlpha=p.starAlpha;result.particleHue=p.particleHue;result.particleSat=p.particleSat;
  result.sunColor=p.sunColor;result.sunGlowR=p.sunGlowR;result.sunGlowG=p.sunGlowG;result.sunGlowB=p.sunGlowB;
  result.causticR=p.causticR;result.causticG=p.causticG;result.causticB=p.causticB;
  result.reflectAlpha=p.reflectAlpha;result.shaftAlpha=p.shaftAlpha;
  result.icon=p.icon;result.label=p.label;
  return{phase:result,idx:idx,inTransition:false};
}

/* ===== Canvas setup ===== */
var cvSky=document.getElementById('cvSky'),cvSea=document.getElementById('cvSea'),cvUnder=document.getElementById('cvUnder'),cvFX=document.getElementById('cvFX');
if(!cvSky||!cvSea||!cvUnder||!cvFX){console.warn('[OceanDaycycle] Canvas elements not found, skipping init');return}

var ctxSky=cvSky.getContext('2d'),ctxSea=cvSea.getContext('2d'),ctxUnder=cvUnder.getContext('2d'),ctxFX=cvFX.getContext('2d');
var W,H,DPR;
var loginPageEl=document.getElementById('login-page');

function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=loginPageEl?loginPageEl.clientWidth:window.innerWidth;
  H=loginPageEl?loginPageEl.clientHeight:window.innerHeight;
  if(!W||!H){W=window.innerWidth;H=window.innerHeight}
  [cvSky,cvSea,cvUnder,cvFX].forEach(function(cv){cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';cv.getContext('2d').setTransform(DPR,0,0,DPR,0,0)});
}
window.addEventListener('resize',function(){resize();initSky();initUnderwater();initCaustics()});
resize();

/* ===== Background gradient + time indicator ===== */
var bgEl=document.getElementById('bgGradient');
var timeIcon=document.getElementById('timeIcon'),timeLabel=document.getElementById('timeLabel');
var lastIcon='';
function updateBackground(pd){
  var p=pd.phase;
  var css='linear-gradient(180deg,'+
    rgbStr(p.skyTop.r,p.skyTop.g,p.skyTop.b)+' 0%,'+
    rgbStr(p.skyMid.r,p.skyMid.g,p.skyMid.b)+' 15%,'+
    rgbStr(p.skyBot.r,p.skyBot.g,p.skyBot.b)+' 35%,'+
    rgbStr(p.seaTop.r,p.seaTop.g,p.seaTop.b)+' 39%,'+
    rgbStr(p.seaShallow.r,p.seaShallow.g,p.seaShallow.b)+' 43%,'+
    rgbStr(p.seaMid.r,p.seaMid.g,p.seaMid.b)+' 48%,'+
    rgbStr(p.seaDeep.r,p.seaDeep.g,p.seaDeep.b)+' 54%,'+
    rgbStr(p.underTop.r,p.underTop.g,p.underTop.b)+' 58%,'+
    rgbStr(p.underMid.r,p.underMid.g,p.underMid.b)+' 78%,'+
    rgbStr(p.underBot.r,p.underBot.g,p.underBot.b)+' 100%)';
  if(bgEl)bgEl.style.background=css;
  if(timeIcon&&timeLabel&&p.icon!==lastIcon){lastIcon=p.icon;timeIcon.innerHTML=p.icon;timeLabel.textContent=p.label}
}

/* ===== Sky layer (stars + sun/moon + meteors) ===== */
var stars=[],galaxyStars=[],meteors=[],sunMoon={x:0,y:0,r:28};
function initSky(){
  stars=[];galaxyStars=[];
  for(var i=0;i<120;i++){stars.push({x:Math.random()*W,y:Math.random()*H*SEA_Y*0.9,size:Math.random()*1.8+0.4,twSpeed:Math.random()*0.022+0.005,twPhase:Math.random()*Math.PI*2})}
  for(var i=0;i<60;i++){var t=Math.random();galaxyStars.push({x:lerp(W*0.1,W*0.9,t),y:lerp(H*0.05,H*0.35,t)+(Math.random()-0.5)*H*0.15,size:Math.random()*1.2+0.3,twPhase:Math.random()*Math.PI*2})}
}
initSky();

function drawSky(pd,t){
  var ctx=ctxSky;ctx.clearRect(0,0,W,H);
  var p=pd.phase;var sa=p.starAlpha;
  if(sa<0.01)return;
  if(sa>0.3){
    var galGrad=ctx.createRadialGradient(W*0.5,H*0.18,0,W*0.5,H*0.18,W*0.5);
    galGrad.addColorStop(0,'rgba(100,120,200,'+(sa*0.08)+')');galGrad.addColorStop(0.5,'rgba(80,100,180,'+(sa*0.04)+')');galGrad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=galGrad;ctx.fillRect(0,0,W,H*SEA_Y);
    for(var i=0;i<galaxyStars.length;i++){var gs=galaxyStars[i];var a=sa*(0.3+0.7*Math.abs(Math.sin(t*0.008+gs.twPhase)));ctx.fillStyle='rgba(200,220,255,'+a+')';ctx.beginPath();ctx.arc(gs.x,gs.y,gs.size,0,Math.PI*2);ctx.fill()}
  }
  for(var i=0;i<stars.length;i++){
    var s=stars[i];var alpha=sa*(0.3+0.7*Math.abs(Math.sin(t*s.twSpeed+s.twPhase)));
    if(s.size>1.2){var grad=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.size*4);grad.addColorStop(0,'rgba(200,220,255,'+(alpha*0.5)+')');grad.addColorStop(1,'rgba(200,220,255,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(s.x,s.y,s.size*4,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();
  }
  if(Math.random()<0.003){meteors.push({x:Math.random()*W*0.6,y:Math.random()*H*0.15,vx:Math.random()*3+4,vy:Math.random()*2+2,life:1,trail:[]})}
  for(var i=meteors.length-1;i>=0;i--){
    var m=meteors[i];m.trail.push({x:m.x,y:m.y});if(m.trail.length>12)m.trail.shift();
    m.x+=m.vx;m.y+=m.vy;m.life-=0.015;
    if(m.life<=0||m.x>W||m.y>H*SEA_Y){meteors.splice(i,1);continue}
    for(var j=0;j<m.trail.length;j++){var tp=m.trail[j];var ta=(j/m.trail.length)*m.life*sa;ctx.fillStyle='rgba(255,255,240,'+ta+')';ctx.beginPath();ctx.arc(tp.x,tp.y,1.5*(j/m.trail.length),0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,'+(m.life*sa)+')';ctx.beginPath();ctx.arc(m.x,m.y,2,0,Math.PI*2);ctx.fill();
  }
  /* sun / moon */
  var cyclePos=(Date.now()%(CYCLE_DURATION*4))/(CYCLE_DURATION*4);
  var smAngle=cyclePos*Math.PI*2-Math.PI/2;
  sunMoon.x=W*0.5+Math.cos(smAngle)*W*0.35;
  sunMoon.y=H*SEA_Y*0.5+Math.sin(smAngle)*H*SEA_Y*0.4;
  var isNight=pd.idx===3;
  var glowR=sunMoon.r*4;
  var glow=ctx.createRadialGradient(sunMoon.x,sunMoon.y,0,sunMoon.x,sunMoon.y,glowR);
  glow.addColorStop(0,rgbStr(p.sunGlowR,p.sunGlowG,p.sunGlowB,0.25));glow.addColorStop(1,rgbStr(p.sunGlowR,p.sunGlowG,p.sunGlowB,0));
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(sunMoon.x,sunMoon.y,glowR,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=isNight?'rgba(220,230,255,1)':'rgba(255,245,200,1)';
  ctx.beginPath();ctx.arc(sunMoon.x,sunMoon.y,sunMoon.r,0,Math.PI*2);ctx.fill();
}

/* ===== Sea surface layer (wave highlights + caustics, no opaque fill) ===== */
var caustics=[];
function initCaustics(){
  caustics=[];
  for(var i=0;i<30;i++){caustics.push({x:Math.random()*W,offY:(Math.random()-0.5)*H*0.06,size:Math.random()*40+20,phase:Math.random()*Math.PI*2,speed:Math.random()*0.4+0.2,flickerSpeed:Math.random()*0.003+0.001})}
}
initCaustics();

function drawSea(pd,t){
  var ctx=ctxSea;ctx.clearRect(0,0,W,H);
  var p=pd.phase;var seaY=H*SEA_Y;
  var layers=[{freq:0.006,amp:14,phase:t*0.0006,scale:1.0},{freq:0.011,amp:8,phase:t*0.0009+1.5,scale:0.6},{freq:0.018,amp:5,phase:t*0.0013+3,scale:0.3}];

  ctx.beginPath();
  for(var x=0;x<=W;x+=2){
    var yOff=0;
    for(var i=0;i<layers.length;i++){var L=layers[i];yOff+=Math.sin(x*L.freq+L.phase)*L.amp*L.scale}
    if(x===0)ctx.moveTo(x,seaY+yOff);
    else ctx.lineTo(x,seaY+yOff);
  }
  ctx.lineWidth=8;
  ctx.strokeStyle=rgbStr(255,255,255,p.reflectAlpha*0.12);
  ctx.stroke();
  ctx.lineWidth=3;
  ctx.strokeStyle=rgbStr(255,255,255,p.reflectAlpha*0.3);
  ctx.stroke();
  ctx.lineWidth=1.5;
  ctx.strokeStyle=rgbStr(255,255,255,p.reflectAlpha*0.55);
  ctx.stroke();

  for(var x=0;x<=W;x+=8){
    var yOff2=0;
    for(var i=0;i<layers.length;i++){var L2=layers[i];yOff2+=Math.sin(x*L2.freq+L2.phase)*L2.amp*L2.scale}
    var hlY=seaY+yOff2;
    var hlAlpha=p.reflectAlpha*(0.3+0.7*Math.abs(Math.sin(x*0.03+t*0.002)));
    var hlGrad=ctx.createRadialGradient(x,hlY,0,x,hlY,15);
    hlGrad.addColorStop(0,rgbStr(255,255,255,hlAlpha*0.6));hlGrad.addColorStop(1,rgbStr(255,255,255,0));
    ctx.fillStyle=hlGrad;ctx.beginPath();ctx.arc(x,hlY,15,0,Math.PI*2);ctx.fill();
  }

  ctx.globalCompositeOperation='screen';
  for(var i=0;i<caustics.length;i++){
    var c=caustics[i];c.x+=c.speed*0.4;if(c.x>W+60)c.x=-60;
    var cy=seaY+c.offY;var flicker=0.4+0.6*Math.sin(t*c.flickerSpeed+c.phase);
    var grad=ctx.createRadialGradient(c.x,cy,0,c.x,cy,c.size);
    grad.addColorStop(0,rgbStr(p.causticR,p.causticG,p.causticB,flicker*0.35));
    grad.addColorStop(0.5,rgbStr(p.causticR,p.causticG,p.causticB,flicker*0.1));
    grad.addColorStop(1,rgbStr(p.causticR,p.causticG,p.causticB,0));
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(c.x,cy,c.size,0,Math.PI*2);ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
}

/* ===== Underwater layer (bio-particles + bubbles + light shafts) ===== */
var bioParticles=[],bubbles=[],lightShafts=[];
function initUnderwater(){
  bioParticles=[];bubbles=[];lightShafts=[];
  for(var i=0;i<160;i++){bioParticles.push({x:Math.random()*W,y:H*SEA_Y+Math.random()*H*(1-SEA_Y),vx:(Math.random()-0.5)*0.3,vy:-Math.random()*0.5-0.1,size:Math.random()*2.5+0.5,hue:Math.random(),phase:Math.random()*Math.PI*2,pulseSpeed:Math.random()*0.02+0.01})}
  for(var i=0;i<35;i++){bubbles.push({x:Math.random()*W,y:H*SEA_Y+Math.random()*H*(1-SEA_Y),size:Math.random()*8+3,vy:-Math.random()*0.8-0.3,wobble:Math.random()*Math.PI*2,wobbleSpeed:Math.random()*0.03+0.01})}
  for(var i=0;i<6;i++){lightShafts.push({x:Math.random()*W,width:Math.random()*70+40,phase:Math.random()*Math.PI*2,speed:Math.random()*0.0003+0.0001})}
}
initUnderwater();

function drawUnderwater(pd,t){
  var ctx=ctxUnder;
  ctx.clearRect(0,0,W,H);
  var p=pd.phase;var seaY=H*SEA_Y;
  ctx.globalCompositeOperation='lighter';

  for(var i=0;i<lightShafts.length;i++){
    var ls=lightShafts[i];
    ls.x+=Math.sin(t*ls.speed+ls.phase)*0.4;
    var sa=p.shaftAlpha+0.04*Math.sin(t*0.001+ls.phase);
    var shaftGrad=ctx.createLinearGradient(ls.x,seaY,ls.x+ls.width*0.3,H);
    shaftGrad.addColorStop(0,rgbStr(p.causticR,p.causticG,p.causticB,sa));
    shaftGrad.addColorStop(0.5,rgbStr(p.causticR,p.causticG,p.causticB,sa*0.5));
    shaftGrad.addColorStop(1,rgbStr(p.causticR,p.causticG,p.causticB,0));
    ctx.fillStyle=shaftGrad;
    ctx.beginPath();ctx.moveTo(ls.x,seaY);ctx.lineTo(ls.x+ls.width,seaY);ctx.lineTo(ls.x+ls.width*1.5,H);ctx.lineTo(ls.x+ls.width*0.5,H);ctx.closePath();ctx.fill();
  }

  for(var i=0;i<bioParticles.length;i++){
    var bp=bioParticles[i];
    bp.x+=bp.vx+Math.sin(t*0.001+bp.phase)*0.3;bp.y+=bp.vy;
    if(bp.y<seaY){bp.y=H-10;bp.x=Math.random()*W}
    if(bp.x<0)bp.x=W;if(bp.x>W)bp.x=0;
    var depthRatio=(bp.y-seaY)/(H-seaY);
    var size=bp.size*(1-depthRatio*0.3);
    var brightness=1-depthRatio*0.25;
    var pulse=0.5+0.5*Math.sin(t*bp.pulseSpeed+bp.phase);
    var hue=lerp(p.particleHue[0],p.particleHue[1],bp.hue);
    var sat=p.particleSat;
    var alpha=pulse*brightness*0.7;
    var grad=ctx.createRadialGradient(bp.x,bp.y,0,bp.x,bp.y,size*4);
    grad.addColorStop(0,'hsla('+hue+','+sat+'%,78%,'+alpha+')');
    grad.addColorStop(0.5,'hsla('+hue+','+sat+'%,68%,'+(alpha*0.3)+')');
    grad.addColorStop(1,'hsla('+hue+','+sat+'%,55%,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(bp.x,bp.y,size*4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='hsla('+hue+','+sat+'%,88%,'+alpha+')';
    ctx.beginPath();ctx.arc(bp.x,bp.y,size,0,Math.PI*2);ctx.fill();
  }

  ctx.globalCompositeOperation='source-over';
  for(var i=0;i<bubbles.length;i++){
    var b=bubbles[i];b.y+=b.vy;b.wobble+=b.wobbleSpeed;b.x+=Math.sin(b.wobble)*0.5;
    if(b.y<seaY){b.y=H-10;b.x=Math.random()*W}
    var depthRatio=(b.y-seaY)/(H-seaY);
    var bSize=b.size*(1-depthRatio*0.2);
    var bAlpha=0.35+0.2*(1-depthRatio);
    var bGrad=ctx.createRadialGradient(b.x-bSize*0.3,b.y-bSize*0.3,0,b.x,b.y,bSize);
    bGrad.addColorStop(0,'rgba(255,255,255,'+(bAlpha*1.5)+')');
    bGrad.addColorStop(0.5,'rgba(210,240,255,'+bAlpha+')');
    bGrad.addColorStop(1,'rgba(170,210,240,'+(bAlpha*0.3)+')');
    ctx.fillStyle=bGrad;ctx.beginPath();ctx.arc(b.x,b.y,bSize,0,Math.PI*2);ctx.fill();
    if(depthRatio<0.5){ctx.fillStyle='rgba(255,255,255,'+(bAlpha*1.2)+')';ctx.beginPath();ctx.arc(b.x-bSize*0.3,b.y-bSize*0.3,bSize*0.2,0,Math.PI*2);ctx.fill()}
  }
}

/* ===== FX layer (mouse glow + click bursts + ripples) ===== */
var mouseX=-1000,mouseY=-1000;var bursts=[],ripples=[];
if(loginPageEl){
  loginPageEl.addEventListener('mousemove',function(e){
    var rect=loginPageEl.getBoundingClientRect();
    mouseX=e.clientX-rect.left;mouseY=e.clientY-rect.top;
  });
  loginPageEl.addEventListener('click',function(e){
    /* skip burst if clicking login avatar (let doLogin handle it) */
    if(e.target.closest('.login-avatar'))return;
    var rect=loginPageEl.getBoundingClientRect();
    var cx=e.clientX-rect.left,cy=e.clientY-rect.top;
    for(var i=0;i<12;i++){var angle=(Math.PI*2/12)*i;bursts.push({x:cx,y:cy,vx:Math.cos(angle)*(Math.random()*3+2),vy:Math.sin(angle)*(Math.random()*3+2),life:1,size:Math.random()*3+2,hue:Math.random()*60+180})}
    ripples.push({x:cx,y:cy,r:0,maxR:80,life:1,delay:0});
    ripples.push({x:cx,y:cy,r:0,maxR:120,life:1,delay:8});
  });
}
function drawFX(pd,t){
  var ctx=ctxFX;ctx.clearRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';
  if(mouseX>0){var p=pd.phase;var mGrad=ctx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,60);mGrad.addColorStop(0,rgbStr(p.causticR,p.causticG,p.causticB,0.15));mGrad.addColorStop(1,rgbStr(p.causticR,p.causticG,p.causticB,0));ctx.fillStyle=mGrad;ctx.beginPath();ctx.arc(mouseX,mouseY,60,0,Math.PI*2);ctx.fill()}
  for(var i=bursts.length-1;i>=0;i--){var b=bursts[i];b.x+=b.vx;b.y+=b.vy;b.vy+=0.05;b.vx*=0.98;b.vy*=0.98;b.life-=0.02;if(b.life<=0){bursts.splice(i,1);continue}var bGrad=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.size*3);bGrad.addColorStop(0,'hsla('+b.hue+',60%,70%,'+b.life+')');bGrad.addColorStop(1,'hsla('+b.hue+',60%,60%,0)');ctx.fillStyle=bGrad;ctx.beginPath();ctx.arc(b.x,b.y,b.size*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='hsla('+b.hue+',80%,80%,'+b.life+')';ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill()}
  ctx.globalCompositeOperation='source-over';
  for(var i=ripples.length-1;i>=0;i--){var r=ripples[i];if(r.delay>0){r.delay--;continue}r.r+=2.5;r.life=1-r.r/r.maxR;if(r.life<=0){ripples.splice(i,1);continue}ctx.strokeStyle='rgba(150,200,255,'+(r.life*0.4)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()}
}

/* ===== 3D parallax (adapted for flex centering, no translate -50%) ===== */
var container=document.querySelector('#login-page .login-container');
var parallaxX=0,parallaxY=0;
if(loginPageEl){
  loginPageEl.addEventListener('mousemove',function(e){
    var rect=loginPageEl.getBoundingClientRect();
    parallaxX=(e.clientX-rect.left)/W-0.5;
    parallaxY=(e.clientY-rect.top)/H-0.5;
  });
}

/* ===== Main loop ===== */
function loop(t){
  var pd=getCurrentPhase();
  updateBackground(pd);drawSky(pd,t);drawSea(pd,t);drawUnderwater(pd,t);drawFX(pd,t);
  if(container){container.style.transform='rotateY('+(parallaxX*4)+'deg) rotateX('+(-parallaxY*2.5)+'deg)'}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
