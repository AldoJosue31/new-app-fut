/* VIDEO A, revision 2: narrated sports/technology film.
   Existing Bracket UI is painted by ui-scenes.js. A deterministic 3D compositor
   projects it into a field of competition lines. All frames depend only on t.
   Voice and recorded music/SFX are mixed once in postproduction.
*/
const NARRATION=__NARRATION_DATA__;
const master=ctx;
const textures=Array.from({length:2},()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;});
const ink='#F1F7FB',night='#09171e';
const atmosphere=document.createElement('canvas');atmosphere.width=W;atmosphere.height=H;
{
 const c=atmosphere.getContext('2d');c.fillStyle=night;c.fillRect(0,0,W,H);
 const g=c.createRadialGradient(680,760,40,600,920,1100);g.addColorStop(0,'#12405a');g.addColorStop(.45,'#102b3a');g.addColorStop(1,'#081319');c.fillStyle=g;c.fillRect(0,0,W,H);
 const h=c.createLinearGradient(0,0,1080,1920);h.addColorStop(0,'#1cb0f60b');h.addColorStop(.46,'#ffffff00');h.addColorStop(1,'#1cb0f615');c.fillStyle=h;c.fillRect(0,0,W,H);
}
const uiRanges=[
 {a:7,b:10.5,key:7,f:t=>config(t-7)},
 {a:10.5,b:15.3,key:10.5,f:t=>participants(t-10.5)},
 {a:15.3,b:20.5,key:17,f:t=>fixture((t-15.3)*(3.5/5.2))},
 {a:20.5,b:27.3,key:20.5,f:t=>planning(t-20.5)},
 {a:27.3,b:29,key:29,f:t=>resultPanel(0)},
 {a:29,b:39.3,key:29,f:t=>scan(t-29)},
 {a:39.3,b:46,key:41,f:t=>standings(Math.max(0,t-41))},
 {a:46,b:50,key:46,f:t=>exportPanel(t-46)},
 {a:50,b:52.3,key:50,f:t=>standings(t-50,true)},
 {a:52.3,b:54.3,key:52.3,f:t=>publicView(t-52.3)},
];
function resetContext(c){c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.filter='none';c.shadowBlur=0;c.shadowOffsetX=0;c.shadowOffsetY=0;}
function world(t){
 ctx.drawImage(atmosphere,0,0);ctx.save();
 ctx.translate(0,32*Math.sin(t*.12));
 const horizon=590,near=1990;
 ctx.beginPath();ctx.moveTo(240,horizon);ctx.lineTo(840,horizon);ctx.lineTo(1440,near);ctx.lineTo(-360,near);ctx.closePath();ctx.fillStyle='#07131880';ctx.fill();
 const proj=(x,d)=>({x:540+x*(.3+.92*d),y:horizon+(near-horizon)*d*d});
 for(const x of [-560,0,560]){const a=proj(x,0),b=proj(x,1);line(a.x,a.y,b.x,b.y,x===0?'#1cb0f626':'#70cfff24',2);}
 for(let i=0;i<8;i++){const d=((i/8+t*.018)%1);const a=proj(-560,d),b=proj(560,d);line(a.x,a.y,b.x,b.y,'#84d8ff10',1);}
 ctx.beginPath();ctx.ellipse(540,1250,293,105,0,0,Math.PI*2);ctx.strokeStyle='#84d8ff20';ctx.lineWidth=2;ctx.stroke();
 ctx.restore();
 const active=(t%15)/15;const yy=800+active*780;
 ctx.save();ctx.globalAlpha=.12;ctx.beginPath();ctx.moveTo(130,400);ctx.bezierCurveTo(940,570,-90,1110,922,1580);ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.stroke();ctx.restore();
 // Four travelling nodes represent the four teams of the fictitious competition.
 for(let i=0;i<4;i++){const p=(t*.035+i*.25)%1;const x=540+Math.sin(p*Math.PI*2+i*.65)*(265+90*p),y=560+p*1040;ctx.beginPath();ctx.arc(x,y,2.5+2*p,0,Math.PI*2);ctx.fillStyle=`rgba(132,216,255,${.12+.13*p})`;ctx.fill();}
}
function project(x,y,p){
 let xx=x-540,yy=y-960,zz=0;
 const cy=Math.cos(p.ry),sy=Math.sin(p.ry),cx=Math.cos(p.rx),sx=Math.sin(p.rx);
 const x1=xx*cy+zz*sy,z1=-xx*sy+zz*cy;
 const y2=yy*cx-z1*sx,z2=yy*sx+z1*cx;
 const cz=Math.cos(p.rz),sz=Math.sin(p.rz),x3=x1*cz-y2*sz,y3=x1*sz+y2*cz;
 const k=p.scale*1750/(1750+z2);
 return{x:p.x+x3*k,y:p.y+y3*k};
}
function tri(image,s,d){
 const den=s[0].x*(s[1].y-s[2].y)+s[1].x*(s[2].y-s[0].y)+s[2].x*(s[0].y-s[1].y);
 const coeff=key=>[
  (d[0][key]*(s[1].y-s[2].y)+d[1][key]*(s[2].y-s[0].y)+d[2][key]*(s[0].y-s[1].y))/den,
  (d[0][key]*(s[2].x-s[1].x)+d[1][key]*(s[0].x-s[2].x)+d[2][key]*(s[1].x-s[0].x))/den,
  (d[0][key]*(s[1].x*s[2].y-s[2].x*s[1].y)+d[1][key]*(s[2].x*s[0].y-s[0].x*s[2].y)+d[2][key]*(s[0].x*s[1].y-s[1].x*s[0].y))/den,
 ];
 const a=coeff('x'),b=coeff('y'),center={x:(d[0].x+d[1].x+d[2].x)/3,y:(d[0].y+d[1].y+d[2].y)/3};
 ctx.save();ctx.beginPath();d.forEach((p,i)=>{const dist=Math.hypot(p.x-center.x,p.y-center.y)||1,ex=p.x+(p.x-center.x)/dist*2,ey=p.y+(p.y-center.y)/dist*2;i?ctx.lineTo(ex,ey):ctx.moveTo(ex,ey);});ctx.closePath();ctx.clip();
 ctx.transform(a[0],b[0],a[1],b[1],a[2],b[2]);
 const minx=Math.max(0,Math.min(...s.map(p=>p.x))-1),miny=Math.max(0,Math.min(...s.map(p=>p.y))-1),maxx=Math.min(W,Math.max(...s.map(p=>p.x))+1),maxy=Math.min(H,Math.max(...s.map(p=>p.y))+1);
 ctx.drawImage(image,minx,miny,maxx-minx,maxy-miny,minx,miny,maxx-minx,maxy-miny);ctx.restore();
}
function plane(image,p){
 if(Math.abs(p.ry)+Math.abs(p.rx)+Math.abs(p.rz)<.00001){ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);ctx.drawImage(image,-540,-960);ctx.restore();return;}
 const cols=3,rows=5;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const points=[{x:x*W/cols,y:y*H/rows},{x:(x+1)*W/cols,y:y*H/rows},{x:(x+1)*W/cols,y:(y+1)*H/rows},{x:x*W/cols,y:(y+1)*H/rows}];
  const dest=points.map(q=>project(q.x,q.y,p));tri(image,[points[0],points[1],points[2]],[dest[0],dest[1],dest[2]]);tri(image,[points[0],points[2],points[3]],[dest[0],dest[2],dest[3]]);
 }
}
function uiTexture(t,r,slot){
 const texture=textures[slot],c=texture.getContext('2d');resetContext(c);c.clearRect(0,0,W,H);ctx=c;
 ctx.save();ctx.shadowColor='#00000030';ctx.shadowBlur=25;ctx.shadowOffsetY=12;box(80,230,920,1435,C.bg,C.line,36);ctx.restore();
 ctx.save();rr(80,230,920,1435,36);ctx.clip();
 const local=r.key===17?(t-r.a)*(3.5/5.2):Math.max(0,t-r.key);framing({a:r.key,b:r.b},local);
 const cameraStarts={7:2.35,10.5:2.5,17:2.2,20.5:4.25,29:6.05,46:1.75};
 const cameraDepths={7:205,10.5:205,17:220,20.5:290,29:165,46:205};
 if(cameraStarts[r.key]!==undefined)ctx.translate(0,-cameraDepths[r.key]*ease(seg(local,cameraStarts[r.key],cameraStarts[r.key]+.65)));
 if(r.key===41)ctx.translate(22,0);
 r.f(t);ctx.restore();
 // Source-data connections illustrate the review; they are editorial overlays.
 if(t>33.35&&t<35.1){const p=ease(seg(t,33.35,33.8));ctx.save();ctx.globalAlpha=.45*p;ctx.setLineDash([5,8]);ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(447,847);ctx.bezierCurveTo(490,847,460,1266,495,1266);ctx.stroke();ctx.restore();}
 ctx=master;return texture;
}
function intro(t){
 const a=1-ease(seg(t,4.0,4.65));ctx.save();ctx.globalAlpha=a;
 ctx.drawImage(logo,99,208,82,82);text('Bracket',202,252,35,600,ink);
 kinetic(['ANTES DEL','PRIMER GOL.'],t,.2,100,715,104,['','PRIMER GOL.']);
 const p=ease(seg(t,1.0,3.5));line(104,1005,104+760*p,1005,'#1cb0f6',4);
 const nodeNames=['Equipos','Reglas','Jornadas'];nodeNames.forEach((name,i)=>{const appear=ease(seg(t,1.5+i*.25,2.1+i*.25));ctx.save();ctx.globalAlpha*=appear;const x=105+i*288,y=1165+24*(1-appear);box(x,y,267,82,'#132e3b','#2e566a',17);text(name,x+133,y+42,28,600,'#cde8f7','center');ctx.restore();});ctx.restore();
 const b=ease(seg(t,4.15,4.65))*(1-ease(seg(t,6.7,7.2)));
 if(b>.001){ctx.save();ctx.globalAlpha=b;const s=.94+.06*ease(seg(t,4.2,5.3));ctx.translate(540,810);ctx.scale(s,s);ctx.drawImage(logo,-165,-165,330,330);ctx.restore();ctx.save();ctx.globalAlpha=b;text('Bracket',540,1124,98,700,ink,'center');text('Tu liga empieza aquí.',540,1230,34,400,'#abd5ec','center');ctx.restore();}
}
function kinetic(lines,t,start,x,y,size,high=[]){
 lines.forEach((s,i)=>{const p=ease(seg(t,start+i*.12,start+i*.12+.48));ctx.save();ctx.globalAlpha*=p;ctx.translate(0,35*(1-p));text(s,x,y+i*(size+15),size,700,high.includes(s)?C.blue:ink);ctx.restore();});
}
const chapters=[
 {a:7,b:15.3,n:'01 / 04',lines:['TU LIGA.','TUS REGLAS.']},
 {a:15.3,b:27.3,n:'02 / 04',lines:['CADA CRUCE.','EN SU LUGAR.']},
 {a:27.3,b:39.3,n:'03 / 04',lines:['DEL PAPEL','AL MARCADOR.']},
 {a:39.3,b:52.3,n:'04 / 04',lines:['EL RESULTADO','SE VE.']},
];
function chapterTitles(t){for(const c of chapters){const alpha=ease(seg(t,c.a,c.a+.35))*(1-ease(seg(t,c.b-.3,c.b+.05)));if(alpha<.001)continue;ctx.save();ctx.globalAlpha=alpha;text(c.n,105,192,22,600,'#81a8bc');kinetic(c.lines,t,c.a+.04,103,263,60,[c.lines[1]]);ctx.restore();}}
function outgoingPose(t,boundary){const p=ease(seg(t,boundary,boundary+.52));return{x:540-280*p,y:1110-40*p,scale:.89*(1-.08*p),ry:-.05-.25*p,rx:.013,rz:-.008-.025*p};}
function incomingPose(t,r){const p=ease(seg(t,r.a,r.a+.7)),hold=ease(seg(t,r.a+.7,r.a+1.5));return{x:540+250*(1-p)+6*Math.sin(t*.35),y:1110+70*(1-p),scale:.89+(.04*hold),ry:.24*(1-p),rx:.008*(1-p),rz:.018*(1-p)};}
function interfaces(t){
 const i=uiRanges.findIndex(r=>t>=r.a&&t<r.b+.52);if(i<0)return;
 let r=uiRanges[i];if(t>=r.b&&i<uiRanges.length-1)r=uiRanges[i+1];
 const idx=uiRanges.indexOf(r),enter=ease(seg(t,r.a,r.a+.52));
 if(idx>0&&t<r.a+.52){const old=uiRanges[idx-1];ctx.save();ctx.globalAlpha=1-enter;plane(uiTexture(Math.min(t,old.b-.001),old,0),outgoingPose(t,r.a));ctx.restore();}
 const alpha=idx===0?ease(seg(t,7,7.7)):enter;
 const ending=1-ease(seg(t,53.7,54.35));ctx.save();ctx.globalAlpha=alpha*ending;plane(uiTexture(t,r,1),incomingPose(t,r));ctx.restore();
 // Four names travel between the participant list and the fixture view.
 if(t>=15.25&&t<16.25){const p=ease(seg(t,15.25,16.25));ctx.save();ctx.globalAlpha=Math.sin(Math.PI*p)*.72;teams.forEach((name,j)=>{const x=lerp(185,190+(j%2)*430,p),y=lerp(850+j*95,760+Math.floor(j/2)*230,p);box(x,y,230,60,'#e0f6ff','#84d8ff',16);text(name,x+115,y+31,26,600,C.deep,'center');});ctx.restore();}
}
function captions(t){
 const clip=NARRATION.find(p=>t>=p.start&&t<p.end);if(!clip)return;
 const words=clip.text.split(/\s+/),groups=[];for(let i=0;i<words.length;i+=7)groups.push(words.slice(i,i+7).join(' '));
 const p=clamp((t-clip.start)/(clip.end-clip.start),0,.999),index=Math.min(groups.length-1,Math.floor(p*groups.length));
 const str=groups[index],max=850;let lines=[str];
 if(measure(str,38,600)>max){const ws=str.split(' '),a=[];while(ws.length&&measure([...a,ws[0]].join(' '),38,600)<max)a.push(ws.shift());lines=[a.join(' '),ws.join(' ')];}
 ctx.save();const h=lines.length===1?78:126,y=1700-h/2;box(82,y,916,h,'#061219d9','#1b3c4e',18);lines.forEach((s,i)=>text(s,540,y+39+i*48,38,600,'#f1f7fb','center'));ctx.restore();
}
function closeFilm(t){
 const mood=ease(seg(t,54.05,54.5))*(1-ease(seg(t,56.35,56.7)));
 if(mood>.001){ctx.save();ctx.globalAlpha=mood;kinetic(['A LA ALTURA','DE TU PASIÓN.'],t,54.1,105,780,91,['DE TU PASIÓN.']);ctx.restore();}
 const p=ease(seg(t,56.65,57.25));if(p<=0)return;
 ctx.save();ctx.globalAlpha=p;const z=lerp(.88,1,ease(seg(t,56.65,57.8)));ctx.translate(540,810);ctx.scale(z,z);
 ctx.beginPath();ctx.arc(0,0,255,-Math.PI*.82,-Math.PI*.82+Math.PI*1.67*ease(seg(t,56.7,57.65)));ctx.strokeStyle='#84d8ff66';ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.rect(-205,-205,410,410*ease(seg(t,56.65,57.25)));ctx.clip();ctx.drawImage(logo,-205,-205,410,410);ctx.restore();ctx.restore();
 ctx.save();ctx.globalAlpha=p;text('Bracket',540,1140,110,700,ink,'center');text('Más allá del amateur',540,1262,48,400,'#d5edfa','center');ctx.restore();
}
const showCaptions=new URLSearchParams(location.search).has('captions');
function render(t){t=((Number(t)%60)+60)%60;ctx=master;resetContext(ctx);world(t);if(t<7.3)intro(t);if(t>6.7&&t<54.4)interfaces(t);chapterTitles(t);if(t>=29&&t<39.3)text('Demostración ilustrativa · lectura resumida',540,392,27,400,'#b4d6e9','center');closeFilm(t);if(showCaptions)captions(t);}
const isRender=new URLSearchParams(location.search).has('render');if(isRender)document.body.classList.add('render');
function fit(){if(isRender)return;const s=Math.min((innerWidth-32)/1080,(innerHeight-126)/1920);document.getElementById('stage').style.transform=`scale(${s})`;const w=document.getElementById('wrap');w.style.width=1080*s+'px';w.style.height=1920*s+'px';}
let offset=0,started=0,playing=false,last=-1;
const audio=new Audio('../final/bracket-a-60s.mp4');audio.preload='metadata';audio.loop=true;
function now(){return playing?(audio.readyState>=2&&!audio.paused?audio.currentTime:(offset+(performance.now()-started)/1000)%60):offset;}
function pause(){offset=now();playing=false;audio.pause();document.getElementById('play').textContent='Reproducir';}
document.getElementById('play').onclick=()=>{if(playing){pause();return;}started=performance.now();playing=true;audio.currentTime=offset;audio.play().catch(()=>{});document.getElementById('play').textContent='Pausar';};
document.getElementById('scrub').oninput=e=>{const was=playing;pause();offset=Number(e.target.value);render(offset);if(was)document.getElementById('play').click();};
async function init(){await Promise.all([document.fonts.load('400 36px Poppins'),document.fonts.load('600 36px Poppins'),document.fonts.load('700 36px Poppins'),logo.decode()]);await document.fonts.ready;window.VIDEO={w:1080,h:1920,duration:60};window.seek=render;window.BRACKET_READY=true;window.SCENES=uiRanges.map(r=>({a:r.a,b:r.b}));fit();render(0);if(!isRender){addEventListener('resize',fit);(function loop(){const t=now();if(playing||t!==last){render(t);last=t;document.getElementById('scrub').value=t;document.getElementById('clock').textContent=`0:${Math.floor(t).toString().padStart(2,'0')} / 1:00`;}requestAnimationFrame(loop);})();}}
init();
