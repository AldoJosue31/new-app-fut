/* V6: writing → transcription → insistent external chat → Bracket → relief.
   All entrances follow measured spoken words. Original PNG only. No zoom. */
const NARRATION=__NARRATION_DATA__,T=__STORY_DATA__;
const SCENES=makeProductScenes(T);
const PHONE={x:120,y:315,scale:2.15,w:390,h:660};
const outCubic=x=>1-(1-clamp(x))**3;
const backplate=document.createElement('canvas');backplate.width=W;backplate.height=H;
{const b=backplate.getContext('2d');b.fillStyle=C.bg;b.fillRect(0,0,W,H);const g=b.createRadialGradient(610,900,20,550,900,1250);g.addColorStop(0,'#1c3d4d');g.addColorStop(.6,'#142a35');g.addColorStop(1,'#0c161d');b.fillStyle=g;b.fillRect(0,0,W,H);}
function bezier(p,a,b,c,d){const q=1-p;return q*q*q*a+3*q*q*p*b+3*q*p*p*c+p*p*p*d;}
function background(t){
 ctx.drawImage(backplate,0,0);ctx.save();ctx.globalAlpha=t>=T.schedule&&t<T.closing?.26:.7;
 const drift=(t*30)%140;for(let y=-140;y<2060;y+=140)line(0,y+drift,1080,y+drift,'#4f839314',1);
 for(let i=0;i<5;i++){const x=85+i*225;ctx.beginPath();ctx.moveTo(x-120,-100);ctx.bezierCurveTo(x+260,520,x-250,1400,x+120,2020);ctx.strokeStyle=i%2?'#3e788b30':'#1cb0f62b';ctx.lineWidth=i===2?2:1.5;ctx.stroke();
 const p=((t*.07+i*.21)%1);circle(bezier(p,x-120,x+260,x-250,x+120),bezier(p,-100,520,1400,2020),3.5,C.blue);}
 ctx.setLineDash([80,630]);ctx.lineDashOffset=-t*155;ctx.strokeStyle='#53c8ff65';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(64,1880);ctx.bezierCurveTo(115,1200,40,550,700,90);ctx.stroke();ctx.setLineDash([]);
 const cy=1470+Math.sin(t*.55)*25;ctx.beginPath();ctx.ellipse(540,cy,375,142,0,0,Math.PI*2);ctx.strokeStyle='#5d9baf36';ctx.lineWidth=2;ctx.stroke();line(540,140,540,1920,'#4a84942b',1);ctx.restore();
}
function display(s,x,y,size=88,color=C.text,{align='left',italic=false}={}){ctx.save();ctx.font=(italic?'italic ':'')+'800 '+size+'px BarlowDisplay';ctx.textBaseline='middle';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.restore();}
function wordLine(s,t,start,x,y,size,color,italic=false){
 let xx=x;ctx.font=(italic?'italic ':'')+'800 '+size+'px BarlowDisplay';
 s.split(' ').forEach((w,i)=>{const p=outCubic(seg(t,start+i*.025,start+i*.025+.18));ctx.save();ctx.beginPath();ctx.rect(xx-4,y-size*.6,ctx.measureText(w+' ').width+8,size*1.15);ctx.clip();ctx.globalAlpha*=p;display(w,xx,y+size*.5*(1-p),size,color,{italic});ctx.restore();ctx.font=(italic?'italic ':'')+'800 '+size+'px BarlowDisplay';xx+=ctx.measureText(w+' ').width;});
}
function headline(lines,t,a,b,{x=100,y=135,size=80}={}){ctx.save();ctx.globalAlpha*=1-ease(seg(t,b-.13,b));lines.forEach((s,i)=>wordLine(s,t,a+i*.035,x,y+i*size*.96,size,i===lines.length-1?C.blue:C.text,i===lines.length-1));rect(x,y+(lines.length-1)*size*.96+size*.61,260*outCubic(seg(t,a+.05,a+.3)),5,C.blue,null,2);ctx.restore();}
function propCard(t,a,b,x,y,w,h,fn){const p=outCubic(seg(t,a,a+.26)),end=ease(seg(t,b-.16,b));if(p<=0||end>=1)return;ctx.save();ctx.globalAlpha*=p*(1-end);ctx.translate(28*(1-p)-18*end,15*(1-p));rect(x,y,w,h,C.surface,'#41616f',24);fn(x,y,w,h);ctx.restore();}
function storyQuestions(){
 return [
 {at:T.qRole,sender:'Capitán · Halcones',initials:'HA',text:'¿Ya está el rol de juegos?'},
 {at:T.qTable,sender:'Delegado · Norte',initials:'NO',text:'¿Cómo quedó la tabla?'},
 {at:T.qGoals,sender:'Mateo · Jugador',initials:'MR',text:'¿Cuántos goles llevo?'},
 {at:T.qMatches,sender:'Diego · Jugador',initials:'DL',text:'¿Cuántos partidos jugué?'},
 {at:T.qCards,sender:'Capitán · Leones',initials:'LE',text:'¿Y mis amarillas?'}
 ];
}
function daniPressure(t){
 const q=storyQuestions(),count=q.filter(m=>t>=m.at).length;
 let reaction=0;for(const m of q){const u=t-m.at;if(u>=0&&u<.75)reaction=Math.max(reaction,Math.exp(-u*5));}
 return {count,stress:clamp(count*.17),reaction};
}
function paperDesk(t){
 // Laptop belongs to the transcription phase; never a phone in the opening.
 const a=outCubic(seg(t,T.transcribe-.1,T.transcribe+.2));
 if(a>0){ctx.save();ctx.globalAlpha*=a;rect(33,1336,474,23,'#486c7c',null,8);line(68,1359,62,1566,'#2e4c5a',14);line(473,1359,484,1566,'#2e4c5a',14);ctx.restore();}
}
function taskSlip(label,x,y,angle,alpha){
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);rect(0,0,164,86,'#e9f0f1','#9cb6c3',6);txt(label,16,25,17,700,'#365868');for(let i=0;i<2;i++)line(16,48+i*13,142,48+i*13,'#a9c0ca',2);ctx.restore();
}
function paperContext(t){
 const a=1-ease(seg(t,T.chatOpen-.15,T.chatOpen+.12));
 if(a<=0)return;
 propCard(t,0,T.chatOpen+.1,518,677,454,495,(x,y,w)=>{
 txt(t<T.transcribe?'PAPEL Y CÉDULAS':'AHORA, A EXCEL',x+24,y+36,24,600,C.muted);
 if(t<T.transcribe){ctx.save();ctx.translate(x+109,y+83);ctx.rotate(.035);ctx.scale(2.25,2.25);tinyPaper(0,0,105,142);ctx.restore();}
 else{rect(x+22,y+81,w-44,43,C.soft,null,7);txt('CONTROL_LIGA.xlsx',x+37,y+103,22,600,C.blue);const entered=Math.floor(Math.max(0,t-T.transcribe)*2);
 ['Mateo Ruiz','Diego Luna','Iván Soto'].forEach((s,i)=>{const yy=y+186+i*77;line(x+23,yy+30,x+w-23,yy+30,'#345361',1);txt(s,x+37,yy,26,400);txt(entered>i?(i===0?'2':i===2?'1':'0'):'…',x+w-54,yy,29,600,C.blue,'center');});txt('Transcribir, revisar, actualizar…',x+27,y+453,21,600,C.muted);}
 });
}
function chatScene(t){
 const a=outCubic(seg(t,T.chatOpen-.1,T.chatOpen+.15));if(a<=0)return;
 const p=daniPressure(t),q=storyQuestions(),x=510,y=585,w=470,h=1015;
 let shake=0;for(const m of q){const u=t-m.at;if(u>=0&&u<.45)shake+=Math.sin(u*65)*Math.exp(-u*12)*(1.6+p.count*.35);}
 ctx.save();ctx.globalAlpha*=a;ctx.translate(shake,0);
 rect(x,y,w,h,C.surface,p.reaction>.25?C.strong:'#456775',25);
 circle(x+43,y+51,24,'#244857');icon('menu',x+31,y+39,24,C.blue);
 txt('Grupo de la liga',x+82,y+39,27,600);txt('Capitanes y jugadores · recreación',x+82,y+72,16,400,C.muted);
 line(x+18,y+102,x+w-18,y+102,C.border,2);
 if(p.count){rect(x+w-65,y+124,43,31,C.soft,C.blue,12);txt(p.count,x+w-43,y+140,18,700,C.blue,'center');}
 // Messages accumulate; each new one raises Dani's pressure and briefly pulses.
 q.forEach((m,i)=>{
   if(t<m.at)return;const age=t-m.at,entry=outCubic(seg(age,0,.2)),pulse=Math.sin(Math.PI*seg(age,0,.32))*.025;
   const yy=y+169+i*142,xx=x+60,ww=w-82,hh=125;
   ctx.save();ctx.globalAlpha*=entry;ctx.translate((1-entry)*31,9*(1-entry));
   ctx.translate(xx+ww/2,yy+hh/2);ctx.scale(1+pulse,1+pulse);ctx.translate(-xx-ww/2,-yy-hh/2);
   circle(x+29,yy+27,16,'#284754');txt(m.initials,x+29,yy+27,12,600,C.text,'center');
   rect(xx,yy,ww,hh,age<.45?'#1c3e50':'#172d38',age<.45?C.strong:'#355868',14);
   // Tail and sender make the incoming chat source unambiguous.
   ctx.beginPath();ctx.moveTo(xx+1,yy+15);ctx.lineTo(xx-10,yy+9);ctx.lineTo(xx+1,yy+34);ctx.fillStyle=age<.45?'#1c3e50':'#172d38';ctx.fill();
   txt(m.sender,xx+18,yy+24,16,600,C.blue);wrap(m.text,xx+18,yy+61,ww-36,27,600,C.text,33);
   txt('Ahora',xx+ww-18,yy+108,12,400,C.muted,'right');ctx.restore();
 });
 const inputY=y+h-68;rect(x+18,inputY,w-36,47,C.bg,C.border,21);txt(p.count<5?'Escribiendo…':'Mensaje',x+37,inputY+24,19,400,C.muted);
 if(p.count<5)for(let i=0;i<3;i++)circle(x+w-91+i*15,inputY+24,3.5+Math.sin(t*8+i)*1.5,C.blue);
 const slips=Math.max(0,p.count-1);taskSlip('ROL',70,1476,-.045,outCubic(seg(slips,0,1))*.9);taskSlip('TABLA',196,1528,.055,outCubic(seg(slips,1,2))*.9);taskSlip('ESTADÍSTICAS',314,1459,-.025,outCubic(seg(slips,2,3))*.9);
 ctx.restore();window.CHAT_FRAME={external:true,count:p.count,questions:q.filter(m=>t>=m.at).map(m=>m.text)};
}
function story(t){
 const alpha=1-ease(seg(t,T.intro-.1,T.intro+.16));ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(logo,99,77,63,63);txt('Bracket',180,111,29,600);
 const phases=[{a:0,b:T.transcribe,s:['PRIMERO,','EN PAPEL.']},{a:T.transcribe,b:T.chatOpen,s:['DESPUÉS,','A EXCEL.']},{a:T.chatOpen,b:T.qGoals,s:['LLEGA LA JORNADA.','EL CHAT NO PARA.']},{a:T.qGoals,b:T.intro,s:['TODOS PREGUNTAN.','TODO PASA POR DANI.']}];
 for(const q of phases)if(t>=q.a&&t<q.b)headline(q.s,t,q.a,q.b,{x:99,y:293,size:82});
 const mode=t<T.transcribe?'writing':'typing',pressure=daniPressure(t);
 paperDesk(t);character(t,278,778,1.08,{mode,stress:pressure.stress,reaction:pressure.reaction});paperContext(t);chatScene(t);
 txt('Historia ilustrada · datos ficticios',99,1838,23,400,C.muted);ctx.restore();
 const introAlpha=outCubic(seg(t,T.intro-.08,T.intro+.22))*(1-ease(seg(t,T.schedule-.25,T.schedule+.1)));
 if(introAlpha>0){ctx.save();ctx.globalAlpha=introAlpha;headline(['CADA JORNADA','TOMA FORMA.'],t,T.intro,T.schedule+.1,{y:340,size:98});ctx.save();ctx.beginPath();ctx.rect(355,675,370,370*outCubic(seg(t,T.intro+.04,T.introReveal)));ctx.clip();ctx.drawImage(logo,355,675,370,370);ctx.restore();txt('Bracket',540,1160,97,700,C.text,'center');ctx.restore();}
}
const chapters=[
 {a:T.schedule,b:T.result,s:['LA JORNADA,','ORGANIZADA.'],label:'Programa y prepara el rol para compartir.'},
 {a:T.result,b:T.stats,s:['CADA PARTIDO,','SU HISTORIA.'],label:'Demostración ilustrativa · lectura resumida'},
 {a:T.stats,b:T.standings,s:['LO QUE HIZO','CADA JUGADOR.'],label:'Partidos jugados, goles y tarjetas.'},
 {a:T.standings,b:T.public,s:['QUE TU LIGA','SE VEA.'],label:'Clasificación e imagen para compartir.'},
 {a:T.public,b:T.closing,s:['LA CLASIFICACIÓN,','A UN ENLACE.'],label:'Habilita su consulta pública.'}
];
function chapter(t){for(const q of chapters)if(t>=q.a&&t<q.b){headline(q.s,t,q.a,q.b,{y:111,size:q.a===T.public?71:77});txt(q.label,102,279,q.a===T.result?25:26,400,C.muted);}}
function drawPhoneState(s,t,alpha,dx=0){
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(PHONE.x,PHONE.y);ctx.scale(PHONE.scale,PHONE.scale);ctx.beginPath();ctx.roundRect(0,0,PHONE.w,PHONE.h,18);ctx.clip();ctx.translate(dx,0);mobileDrawing=true;uiEntranceTime=Math.max(0,t-s.a);s.draw(t);mobileDrawing=false;ctx.restore();
}
function phone(t){
 const a=outCubic(seg(t,T.schedule-.1,T.schedule+.2))*(1-ease(seg(t,T.closing,T.closing+.22)));if(a<=0)return;
 const u=1-outCubic(seg(t,T.schedule-.1,T.schedule+.2));ctx.save();ctx.globalAlpha=a;ctx.translate(36*u,20*u);rect(PHONE.x-11,PHONE.y-12,PHONE.w*PHONE.scale+22,PHONE.h*PHONE.scale+24,'#080f13','#426170',49);
 const i=SCENES.findIndex(s=>t>=s.a&&t<s.b),s=SCENES[i]||SCENES[t<T.schedule?0:SCENES.length-1],p=outCubic(seg(t,s.a,s.a+.24));
 if(i>0&&p<1)drawPhoneState(SCENES[i-1],SCENES[i-1].b-.001,1,-8*p);drawPhoneState(s,t,i===0?1:p,i>0?12*(1-p):0);ctx.restore();
 if(showCaptions)return;const steps=[['ROL',T.roleDownload],['RESULTADOS',T.resultSaved],['ESTADÍSTICAS',T.scorers+.35],['TABLA',T.publicView+.2]];line(140,1812,930,1812,'#325366',3);
 steps.forEach(([s,at],i)=>{const x=153+i*258,p=outCubic(seg(t,at,at+.2));circle(x,1812,13,p?C.blue:C.bg,p?C.blue:'#41616f');if(p)icon('check',x-9,1803,18,C.bg);txt(s,x,1850,20,600,p?C.blue:C.muted,'center');});
}
function ending(t){
 const a=outCubic(seg(t,T.closing,T.closing+.22))*(1-ease(seg(t,T.brand-.2,T.brand+.08)));if(a>0){ctx.save();ctx.globalAlpha=a;headline(['ORGANIZA TU LIGA.','VIVE EL FÚTBOL.'],t,T.closing,T.brand+.1,{x:100,y:365,size:88});character(t,427,880,1.02,{mode:"phone",stress:0,reaction:0});ctx.restore();}
 const p=outCubic(seg(t,T.brand-.08,T.logoReveal));if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.beginPath();ctx.arc(540,815,253,-Math.PI*.8,-Math.PI*.8+Math.PI*1.6*outCubic(seg(t,T.brand-.08,T.logoReveal+.15)));ctx.strokeStyle='#84d8ff77';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(335,610,410,410*p);ctx.clip();ctx.drawImage(logo,335,610,410,410);ctx.restore();txt('Bracket',540,1152,108,700,C.text,'center');const q=outCubic(seg(t,T.tagline-.08,T.tagline+.16));ctx.globalAlpha*=q;display('MÁS ALLÁ DEL AMATEUR',540,1287+15*(1-q),62,C.blue,{align:'center',italic:true});ctx.restore();
}
function captions(t){const p=NARRATION.find(n=>t>=n.start&&t<n.end),s=p?.captions?.find(c=>t>=c.start&&t<=c.end)?.text;if(!s)return;rect(91,1748,898,115,'#080f13ed','#263740',15);wrap(s,120,1784,840,31,600,C.text,42);}
const showCaptions=new URLSearchParams(location.search).has('captions');
function render(t){t=((Number(t)%60)+60)%60;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;mobileDrawing=false;uiEntranceTime=10;textOverflows=[];window.DANI_FRAME=null;window.CHAT_FRAME=null;background(t);if(t<T.schedule+.12)story(t);if(t>T.schedule-.12&&t<T.closing+.24)phone(t);chapter(t);if(t>=T.closing)ending(t);if(showCaptions)captions(t);window.TEXT_OVERFLOWS=textOverflows;}
const isRender=new URLSearchParams(location.search).has('render');if(isRender)document.body.classList.add('render');
function fit(){if(isRender)return;const s=Math.min((innerWidth-32)/1080,(innerHeight-126)/1920);document.getElementById('stage').style.transform='scale('+s+')';const w=document.getElementById('wrap');w.style.width=1080*s+'px';w.style.height=1920*s+'px';}
let offset=0,playing=false,last=-1;
const audio=new Audio('../final/bracket-a-60s.mp4');audio.preload='metadata';audio.loop=true;
function now(){return playing?audio.currentTime:offset;}
function pause(){offset=now();playing=false;audio.pause();document.getElementById('play').textContent='Reproducir';}
document.getElementById('play').onclick=()=>{if(playing){pause();return;}audio.currentTime=offset;audio.play().then(()=>{playing=true;document.getElementById('play').textContent='Pausar';}).catch(()=>{playing=false;});};
document.getElementById('scrub').oninput=e=>{const was=playing;pause();offset=Number(e.target.value);render(offset);if(was)document.getElementById('play').click();};
async function init(){await Promise.all([document.fonts.load('400 36px Poppins'),document.fonts.load('600 36px Poppins'),document.fonts.load('700 36px Poppins'),document.fonts.load('800 80px BarlowDisplay'),document.fonts.load('italic 800 80px BarlowDisplay'),logo.decode()]);await document.fonts.ready;window.VIDEO={w:1080,h:1920,duration:60};window.seek=render;window.BRACKET_READY=true;window.SCENES=SCENES.map(({a,b,name})=>({a,b,name}));window.PHONE_LAYOUT={...PHONE,zoom:false,perspective:false,entranceTranslationMax:[36,20]};window.TIMELINE=T;fit();render(0);if(!isRender){addEventListener('resize',fit);(function loop(){const t=now();if(playing||t!==last){render(t);last=t;document.getElementById('scrub').value=t;document.getElementById('clock').textContent='0:'+Math.floor(t).toString().padStart(2,'0')+' / 1:00';}requestAnimationFrame(loop);})();}}
init();
