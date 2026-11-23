/* Revision 4. Cinematic entrances, living field, full dark mobile viewport.
   0–13.68 four concrete problems / 13.68–17.8 brand / 17.8–55.5 solutions.
   The official logo is never redrawn. Product screens never zoom or crop. */
const NARRATION=__NARRATION_DATA__;
const S=__STORY_DATA__;
const PHONE={x:120,y:315,scale:2.15,w:390,h:660};
const outCubic=x=>1-(1-clamp(x))**3;
const backplate=document.createElement('canvas');backplate.width=W;backplate.height=H;
{const b=backplate.getContext('2d');b.fillStyle=C.bg;b.fillRect(0,0,W,H);const g=b.createRadialGradient(610,900,20,550,900,1250);g.addColorStop(0,'#1c3d4d');g.addColorStop(.6,'#142a35');g.addColorStop(1,'#0c161d');b.fillStyle=g;b.fillRect(0,0,W,H);}
function bezier(p,a,b,c,d){const q=1-p;return q*q*q*a+3*q*q*p*b+3*q*p*p*c+p*p*p*d;}
function background(t){
 ctx.drawImage(backplate,0,0);ctx.save();const product=t>=17.8&&t<55.5;ctx.globalAlpha=product?.3:.7;
 const drift=(t*17)%140;
 for(let y=-140;y<2060;y+=140)line(0,y+drift,1080,y+drift,'#4f839314',1);
 for(let i=0;i<5;i++){const x=85+i*225;ctx.beginPath();ctx.moveTo(x-120,-100);ctx.bezierCurveTo(x+260,520,x-250,1400,x+120,2020);ctx.strokeStyle=i%2?'#3e788b30':'#1cb0f62b';ctx.lineWidth=i===2?2:1.5;ctx.stroke();
 const p=((t*.052+i*.21)%1),xx=bezier(p,x-120,x+260,x-250,x+120),yy=bezier(p,-100,520,1400,2020);circle(xx,yy,3.5,C.blue);}
 ctx.setLineDash([80,630]);ctx.lineDashOffset=-t*100;ctx.strokeStyle='#53c8ff65';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(64,1880);ctx.bezierCurveTo(115,1200,40,550,700,90);ctx.stroke();ctx.setLineDash([]);
 const cy=1470+Math.sin(t*.34)*35;ctx.beginPath();ctx.ellipse(540,cy,375,142,0,0,Math.PI*2);ctx.strokeStyle='#5d9baf36';ctx.lineWidth=2;ctx.stroke();line(540,140,540,1920,'#4a84942b',1);
 const pulse=(t*.13)%1;ctx.globalAlpha*=Math.sin(pulse*Math.PI)*.35;ctx.beginPath();ctx.ellipse(540,cy,375+160*pulse,142+62*pulse,0,0,Math.PI*2);ctx.strokeStyle=C.blue;ctx.stroke();ctx.restore();
}
function display(s,x,y,size=88,color=C.text,{align='left',italic=false}={}){ctx.save();ctx.font=`${italic?'italic ':''}800 ${size}px BarlowDisplay`;ctx.textBaseline='middle';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.restore();}
function wordLine(s,t,start,x,y,size,color,italic=false){
 const words=s.split(' ');let xx=x;ctx.font=`${italic?'italic ':''}800 ${size}px BarlowDisplay`;
 words.forEach((w,i)=>{const p=outCubic(seg(t,start+i*.065,start+i*.065+.43));ctx.save();ctx.beginPath();ctx.rect(xx-4,y-size*.6,ctx.measureText(w+' ').width+8,size*1.15);ctx.clip();ctx.globalAlpha*=p;display(w,xx,y+size*.72*(1-p),size,color,{italic});ctx.restore();ctx.font=`${italic?'italic ':''}800 ${size}px BarlowDisplay`;xx+=ctx.measureText(w+' ').width;});
}
function headline(lines,t,a,b,{x=100,y=135,size=80}={}){const alpha=1-ease(seg(t,b-.28,b+.05));if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;
 lines.forEach((s,i)=>wordLine(s,t,a+.07+i*.1,x,y+i*(size*.96),size,i===lines.length-1?C.blue:C.text,i===lines.length-1));
 const p=outCubic(seg(t,a+.2,a+.8));rect(x,y+(lines.length-1)*size*.96+size*.61,260*p,5,C.blue,null,2);ctx.restore();
}
function propCard(t,a,b,x,y,w,h,fn){const p=outCubic(seg(t,a,a+.55)),end=ease(seg(t,b-.27,b));if(p<=0||end>=1)return;ctx.save();ctx.globalAlpha*=p*(1-end);ctx.translate(48*(1-p)-42*end,32*(1-p));rect(x,y,w,h,C.surface,'#41616f',24);fn(x,y,w,h);ctx.restore();}
function storyTeamList(t){propCard(t,S.team-.12,S.calendar+.12,506,650,471,540,(x,y,w)=>{
 txt('SU LISTA DE EQUIPOS',x+28,y+39,23,600,C.muted);teams.forEach((name,i)=>{const yy=y+91+i*96,missing=i===3;ctx.save();if(missing){ctx.setLineDash([7,7]);rect(x+23,yy,w-46,76,'#1cb0f60c',C.blue,12);ctx.setLineDash([]);}else rect(x+23,yy,w-46,76,C.bg,null,12);crest(name,x+38,yy+18,40);txt(name,x+98,yy+40,31,600,missing?C.muted:C.text);if(missing)txt('POR INCORPORAR',x+98,yy+65,14,600,C.blue);else icon('check',x+w-66,yy+26,27,C.blue);ctx.restore();});});}
function storyCalendar(t){propCard(t,S.calendar-.12,S.photo+.12,506,650,471,535,(x,y,w)=>{txt('EL BORRADOR DE LA JORNADA',x+27,y+40,21,600,C.muted);[['Halcones','Leones'],['Norte','Sur']].forEach(([a,b],i)=>{const yy=y+92+i*201;rect(x+23,yy,w-46,177,C.bg,null,14);txt(a+' vs '+b,x+43,yy+42,29,600);icon('calendar',x+43,yy+91,33);txt(i?'Por definir':'Sin confirmar',x+96,yy+107,27,600,C.blue);});});}
function storyPhoto(t){propCard(t,S.photo-.12,S.table+.12,506,650,471,550,(x,y,w)=>{txt('EL RESULTADO LLEGÓ EN FOTO',x+26,y+40,21,600,C.muted);ctx.save();ctx.translate(x+103,y+99);ctx.rotate(-.045);ctx.scale(2.55,2.55);tinyPaper(0,0,105,142);ctx.restore();txt('Cédula pendiente de revisar',x+29,y+490,25,600,C.blue);});}
function storyTable(t){propCard(t,S.table-.12,S.solution+.1,506,650,471,540,(x,y,w)=>{txt('Y EL GRUPO PREGUNTA…',x+26,y+40,22,600,C.muted);rect(x+24,y+83,w-48,122,C.soft,null,16);wrap('¿Ya está la tabla de la jornada?',x+47,y+120,w-94,31,600,C.text,41);for(let i=0;i<4;i++){const yy=y+245+i*58;rect(x+25,yy,w-50,43,C.bg,null,8);rect(x+42,yy+15,155-i*13,9,'#4d6d7b55',null,3);rect(x+w-92,yy+15,45,9,'#4d6d7b55',null,3);}txt('La clasificación sigue pendiente',x+27,y+505,23,600,C.blue);});}
function story(t){
 const a=1-ease(seg(t,S.solution-.25,S.solution+.45));ctx.save();ctx.globalAlpha=a;ctx.drawImage(logo,99,77,63,63);txt('Bracket',180,111,29,600);
 const stages=[{a:0,b:S.team+.15,s:['MAÑANA','HAY JORNADA.']},{a:S.team-.1,b:S.calendar+.15,s:['UN EQUIPO','POR INCORPORAR.']},{a:S.calendar-.1,b:S.photo+.15,s:['HORARIOS','POR CONFIRMAR.']},{a:S.photo-.1,b:S.table+.15,s:['UN MARCADOR','EN UNA FOTO.']},{a:S.table-.1,b:S.solution+.1,s:['¿Y LA','CLASIFICACIÓN?']}];
 for(const q of stages)if(t>=q.a&&t<q.b+.05)headline(q.s,t,q.a,q.b,{x:99,y:293,size:94});
 const pose=outCubic(seg(t,.2,.85));ctx.save();ctx.globalAlpha*=pose;character(t,310+35*(1-pose),879,.82,false);ctx.restore();
 storyTeamList(t);storyCalendar(t);storyPhoto(t);storyTable(t);
 if(t<S.team+.05){propCard(t,.65,S.team+.15,550,790,421,322,(x,y,w)=>{txt('DANI ORGANIZA SU LIGA',x+25,y+38,21,600,C.muted);wrap('Tiene la jornada en la cabeza…',x+26,y+102,w-52,34,600,C.text,46);txt('y pendientes por todas partes.',x+26,y+250,22,400,C.blue);});}
 const labels=['EQUIPOS','HORARIOS','RESULTADO','TABLA'],times=[S.team,S.calendar,S.photo,S.table];const active=t<S.calendar?0:t<S.photo?1:t<S.table?2:3;labels.forEach((s,i)=>{const xx=100+i*234,p=ease(seg(t,times[i]-.35,times[i]+.05));ctx.save();ctx.globalAlpha*=p;rect(xx,1710,210,58,i===active?C.soft:C.surface,i===active?C.blue:C.border,12);txt(s,xx+105,1740,20,600,i===active?C.blue:C.muted,'center');ctx.restore();});
 txt('Una historia ficticia de organización.',100,1840,24,400,C.muted);ctx.restore();
 const p=ease(seg(t,S.solution-.05,S.solution+.5))*(1-ease(seg(t,17.35,17.9)));if(p>0){ctx.save();ctx.globalAlpha=p;headline(['UN LUGAR','PARA TU LIGA.'],t,S.solution,17.9,{x:100,y:350,size:103});
 for(let i=0;i<4;i++){const q=ease(seg(t,S.solution+i*.04,S.solution+.75+i*.04)),sx=150+i*240,sy=1470;circle(lerp(sx,540+(i-1.5)*15,q),lerp(sy,820,q),5+5*Math.sin(q*Math.PI),C.blue);}
 ctx.save();ctx.beginPath();ctx.rect(355,675,370,370*ease(seg(t,S.solution+.15,S.solution+.8)));ctx.clip();ctx.drawImage(logo,355,675,370,370);ctx.restore();txt('Bracket',540,1160,97,700,C.text,'center');ctx.restore();}
}
const chapters=[
 {a:17.8,b:24.5,s:['TODOS','EN LA LISTA.'],label:'Equipos y reglas de tu competición.'},
 {a:24.5,b:32,s:['LA JORNADA','TOMA FORMA.'],label:'Cruces preparados. Horarios confirmados.'},
 {a:32,b:42.3,s:['DEL PAPEL','AL MARCADOR.'],label:'Demostración ilustrativa · lectura resumida'},
 {a:42.3,b:51.6,s:['QUE TU LIGA','SE VEA.'],label:'Clasificación e imagen para compartir.'},
 {a:51.6,b:55.5,s:['LA TABLA,','AL ALCANCE.'],label:'Habilita su consulta pública.'}
];
function chapter(t){for(const q of chapters){if(t<q.a||t>=q.b+.05)continue;headline(q.s,t,q.a,q.b,{y:111,size:77});ctx.save();ctx.globalAlpha=ease(seg(t,q.a+.2,q.a+.65))*(1-ease(seg(t,q.b-.2,q.b)));txt(q.label,102,279,q.a===32?25:26,400,C.muted);ctx.restore();}}
function drawPhoneState(s,t,alpha){ctx.save();ctx.globalAlpha*=alpha;ctx.translate(PHONE.x,PHONE.y);ctx.scale(PHONE.scale,PHONE.scale);ctx.beginPath();ctx.roundRect(0,0,PHONE.w,PHONE.h,18);ctx.clip();mobileDrawing=true;uiEntranceTime=Math.max(0,t-s.a);s.draw(uiEntranceTime);mobileDrawing=false;ctx.restore();}
function phone(t){
 const alpha=ease(seg(t,17.55,18.15))*(1-ease(seg(t,55.5,55.95)));if(alpha<=0)return;
 const chapter=chapters.find(q=>t>=q.a&&t<q.b)||chapters[t<17.8?0:chapters.length-1],u=1-outCubic(seg(t,chapter.a,chapter.a+.65)),dir=chapters.indexOf(chapter)%2?-1:1;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(dir*67*u,44*u);rect(PHONE.x-11,PHONE.y-12,PHONE.w*PHONE.scale+22,PHONE.h*PHONE.scale+24,'#080f13','#426170',49);
 const i=SCENES.findIndex(s=>t>=s.a&&t<s.b),s=SCENES[i]||SCENES[t<17.8?0:SCENES.length-1],p=ease(seg(t,s.a,s.a+.28));
 if(i>0&&p<1)drawPhoneState(SCENES[i-1],SCENES[i-1].b-.001,1-p);drawPhoneState(s,t,i===0?1:p);ctx.restore();
 if(showCaptions)return;
 // Four story problems become completed stages; no numbered chapter counter.
 const steps=[['EQUIPOS',24.2],['JORNADA',31.5],['RESULTADO',42],['TABLA',55.1]];line(130,1812,950,1812,'#325366',3);
 steps.forEach(([name,at],j)=>{const x=153+j*258,p=ease(seg(t,at,at+.4));circle(x,1812,13,p?C.blue:C.bg,p?C.blue:'#41616f');if(p)icon('check',x-9,1803,18,C.bg);txt(name,x,1850,21,600,p?C.blue:C.muted,'center');});
}
function ending(t){const a=ease(seg(t,55.5,55.9))*(1-ease(seg(t,57.1,57.45)));if(a>0){ctx.save();ctx.globalAlpha=a;headline(['QUE ORGANIZAR','TAMBIÉN SE DISFRUTE.'],t,55.5,57.5,{x:100,y:390,size:83});character(t,540,940,.68,true);ctx.restore();}
 const p=ease(seg(t,57.15,57.75));if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.beginPath();ctx.arc(540,815,253,-Math.PI*.8,-Math.PI*.8+Math.PI*1.6*ease(seg(t,57.15,57.95)));ctx.strokeStyle='#84d8ff77';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(335,610,410,410*p);ctx.clip();ctx.drawImage(logo,335,610,410,410);ctx.restore();txt('Bracket',540,1152,108,700,C.text,'center');display('MÁS ALLÁ DEL AMATEUR',540,1287,62,C.blue,{align:'center',italic:true});ctx.restore();}
function captions(t){const p=NARRATION.find(n=>t>=n.start&&t<n.end);if(!p)return;let str;if(p.captions?.length){str=p.captions.find(q=>t>=q.start&&t<=q.end)?.text;if(!str)return;}else{const words=p.text.split(/\s+/),groups=[];for(let i=0;i<words.length;i+=7)groups.push(words.slice(i,i+7).join(' '));str=groups[Math.min(groups.length-1,Math.floor(seg(t,p.start,p.end)*groups.length))];}rect(91,1748,898,115,'#080f13ed','#263740',15);wrap(str,120,1784,840,31,600,C.text,42);}
const showCaptions=new URLSearchParams(location.search).has('captions');
function render(t){t=((Number(t)%60)+60)%60;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;mobileDrawing=false;uiEntranceTime=10;textOverflows=[];background(t);if(t<17.9)story(t);if(t>17.5&&t<56)phone(t);chapter(t);if(t>=55.5)ending(t);if(showCaptions)captions(t);window.TEXT_OVERFLOWS=textOverflows;}
const isRender=new URLSearchParams(location.search).has('render');if(isRender)document.body.classList.add('render');
function fit(){if(isRender)return;const s=Math.min((innerWidth-32)/1080,(innerHeight-126)/1920);document.getElementById('stage').style.transform=`scale(${s})`;const w=document.getElementById('wrap');w.style.width=1080*s+'px';w.style.height=1920*s+'px';}
let offset=0,playing=false,last=-1;
const audio=new Audio('../final/bracket-a-60s.mp4');audio.preload='metadata';audio.loop=true;
function now(){return playing?audio.currentTime:offset;}
function pause(){offset=now();playing=false;audio.pause();document.getElementById('play').textContent='Reproducir';}
document.getElementById('play').onclick=()=>{if(playing){pause();return;}playing=true;audio.currentTime=offset;audio.play().catch(()=>{playing=false;});document.getElementById('play').textContent='Pausar';};
document.getElementById('scrub').oninput=e=>{const was=playing;pause();offset=Number(e.target.value);render(offset);if(was)document.getElementById('play').click();};
async function init(){await Promise.all([document.fonts.load('400 36px Poppins'),document.fonts.load('600 36px Poppins'),document.fonts.load('700 36px Poppins'),document.fonts.load('800 80px BarlowDisplay'),document.fonts.load('italic 800 80px BarlowDisplay'),logo.decode()]);await document.fonts.ready;window.VIDEO={w:1080,h:1920,duration:60};window.seek=render;window.BRACKET_READY=true;window.SCENES=SCENES.map(({a,b,name})=>({a,b,name}));window.PHONE_LAYOUT={...PHONE,zoom:false,perspective:false,entranceTranslationMax:[67,44]};fit();render(0);if(!isRender){addEventListener('resize',fit);(function loop(){const t=now();if(playing||t!==last){render(t);last=t;document.getElementById('scrub').value=t;document.getElementById('clock').textContent=`0:${Math.floor(t).toString().padStart(2,'0')} / 1:00`;}requestAnimationFrame(loop);})();}}
init();
