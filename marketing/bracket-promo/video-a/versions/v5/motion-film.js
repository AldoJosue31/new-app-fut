/* V5 approved story: paper + Excel → role → results → player stats → table.
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
function paperDesk(t){
 ctx.save();ctx.globalAlpha*=1-ease(seg(t,T.intro-.22,T.intro+.12));
 // A desk connects paperwork to the character, without copying Excel branding.
 rect(90,1310,900,31,'#365563',null,10);line(132,1341,116,1598,'#273e49',17);line(940,1341,958,1598,'#273e49',17);
 ctx.save();ctx.translate(140,1170);ctx.rotate(-.08);ctx.scale(2.15,2.15);tinyPaper(0,0,105,139);ctx.restore();
 txt('CÉDULAS',125,1536,22,600,C.muted);ctx.restore();
}
function spreadsheet(t){
 propCard(t,0,T.requests+.12,496,665,482,563,(x,y,w)=>{
 txt('CONTROL_LIGA.xlsx',x+26,y+40,25,600);rect(x+22,y+75,w-44,38,C.soft,null,7);txt('Jornada 1   /   Jugadores',x+35,y+94,20,600,C.blue);
 const cols=[['Jugador',x+34],['PJ',x+260],['G',x+325],['TA',x+392]];cols.forEach(([s,xx])=>txt(s,xx,y+150,21,600,C.muted));
 const entered=Math.floor(seg(t,.45,2.6)*3);
 ['Mateo Ruiz','Diego Luna','Iván Soto'].forEach((name,i)=>{const yy=y+194+i*72;line(x+22,yy+34,x+w-22,yy+34,'#365563',1);txt(name,x+34,yy,23,400);txt(i<entered?'1':'…',x+268,yy,23,600,C.blue);txt(i<entered?(i===0?'2':i===2?'1':'0'):'…',x+330,yy,23,600,C.blue);txt('…',x+404,yy,23,600,C.muted);});
 rect(x+22,y+444,w-44,75,C.bg,C.border,10);txt('Del papel a la hoja de cálculo',x+40,y+471,20,400,C.muted);txt('Dani reúne los datos a mano.',x+40,y+501,21,600,C.blue);
 });
}
function requestsStory(t){
 const split=(T.requests+T.playerRequests)*.5;
 for(const [a,b,title,question,type] of [[T.requests,split,'EL EQUIPO PREGUNTA','¿Ya está el rol de esta jornada?','role'],[split,T.playerRequests,'OTRO PENDIENTE','¿Cómo quedó la tabla?','table']]){
 propCard(t,a,b,496,665,482,564,(x,y,w)=>{
 txt(title,x+26,y+40,23,600,C.muted);rect(x+24,y+83,w-48,128,C.soft,null,15);wrap(question,x+47,y+124,w-92,31,600,C.text,41);
 if(type==='role'){[['Halcones vs Leones','11:30'],['Norte vs Sur','13:00']].forEach(([s,h],i)=>{rect(x+24,y+249+i*93,w-48,77,C.bg,null,10);txt(s,x+41,y+276+i*93,25,600);txt(h,x+41,y+307+i*93,22,600,C.blue);});txt('El rol sigue por preparar.',x+27,y+519,24,600,C.blue);}
 else{for(let i=0;i<4;i++){const yy=y+250+i*59;rect(x+24,yy,w-48,44,C.bg,null,7);rect(x+41,yy+16,171-i*14,8,'#486a7d88',null,2);rect(x+w-90,yy+16,41,8,'#486a7d88',null,2);}txt('La clasificación está pendiente.',x+27,y+526,23,600,C.blue);}
 });}
}
function playerRequests(t){
 const phases=[T.playerRequests,T.playerRequests+(T.intro-T.playerRequests)/3,T.playerRequests+2*(T.intro-T.playerRequests)/3,T.intro];
 const data=[['¿Cuántos goles llevo?','GOLES','G'],['¿Cuántos partidos jugué?','PARTIDOS JUGADOS','PJ'],['¿Cuántas amarillas tengo?','TARJETAS AMARILLAS','TA']];
 data.forEach(([q,label,col],i)=>propCard(t,phases[i],phases[i+1],496,665,482,564,(x,y,w)=>{
 txt('Y LOS JUGADORES TAMBIÉN',x+26,y+40,21,600,C.muted);rect(x+24,y+85,w-48,131,C.soft,null,15);wrap(q,x+47,y+127,w-92,31,600,C.text,42);
 txt('Mateo Ruiz / Diego Luna',x+29,y+268,25,600);txt('Datos en cédulas y registros',x+29,y+309,21,400,C.muted);
 rect(x+24,y+350,w-48,125,C.bg,C.border,12);txt(col,x+57,y+412,53,700,C.blue);txt('POR REUNIR',x+162,y+394,20,600,C.muted);wrap(label,x+162,y+433,w-204,23,600,C.text,29);
 }));
}
function story(t){
 const a=1-ease(seg(t,T.intro-.12,T.intro+.16));ctx.save();ctx.globalAlpha=a;ctx.drawImage(logo,99,77,63,63);txt('Bracket',180,111,29,600);
 const stages=[{a:0,b:T.requests,s:['SU LIGA,','ENTRE PAPEL Y EXCEL.']},{a:T.requests,b:T.playerRequests,s:['LLEGA OTRA','JORNADA.']},{a:T.playerRequests,b:T.intro,s:['TODOS','QUIEREN SABER.']}];
 for(const q of stages)if(t>=q.a&&t<q.b)headline(q.s,t,q.a,q.b,{x:99,y:293,size:87});
 const pose=outCubic(seg(t,0,.3));ctx.save();ctx.globalAlpha*=pose;character(t,285+20*(1-pose),847,.76,false);ctx.restore();paperDesk(t);spreadsheet(t);requestsStory(t);playerRequests(t);
 txt('Una historia ficticia de organización.',100,1839,23,400,C.muted);ctx.restore();
 const p=outCubic(seg(t,T.intro-.08,T.intro+.22))*(1-ease(seg(t,T.schedule-.25,T.schedule+.1)));
 if(p>0){ctx.save();ctx.globalAlpha=p;headline(['CADA JORNADA','TOMA FORMA.'],t,T.intro,T.schedule+.1,{y:340,size:98});ctx.save();ctx.beginPath();ctx.rect(355,675,370,370*outCubic(seg(t,T.intro+.04,T.introReveal)));ctx.clip();ctx.drawImage(logo,355,675,370,370);ctx.restore();txt('Bracket',540,1160,97,700,C.text,'center');ctx.restore();}
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
 const a=outCubic(seg(t,T.closing,T.closing+.22))*(1-ease(seg(t,T.brand-.2,T.brand+.08)));if(a>0){ctx.save();ctx.globalAlpha=a;headline(['ORGANIZA TU LIGA.','VIVE EL FÚTBOL.'],t,T.closing,T.brand+.1,{x:100,y:365,size:88});character(t,540,950,.67,true);ctx.restore();}
 const p=outCubic(seg(t,T.brand-.08,T.logoReveal));if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.beginPath();ctx.arc(540,815,253,-Math.PI*.8,-Math.PI*.8+Math.PI*1.6*outCubic(seg(t,T.brand-.08,T.logoReveal+.15)));ctx.strokeStyle='#84d8ff77';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(335,610,410,410*p);ctx.clip();ctx.drawImage(logo,335,610,410,410);ctx.restore();txt('Bracket',540,1152,108,700,C.text,'center');const q=outCubic(seg(t,T.tagline-.08,T.tagline+.16));ctx.globalAlpha*=q;display('MÁS ALLÁ DEL AMATEUR',540,1287+15*(1-q),62,C.blue,{align:'center',italic:true});ctx.restore();
}
function captions(t){const p=NARRATION.find(n=>t>=n.start&&t<n.end),s=p?.captions?.find(c=>t>=c.start&&t<=c.end)?.text;if(!s)return;rect(91,1748,898,115,'#080f13ed','#263740',15);wrap(s,120,1784,840,31,600,C.text,42);}
const showCaptions=new URLSearchParams(location.search).has('captions');
function render(t){t=((Number(t)%60)+60)%60;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;mobileDrawing=false;uiEntranceTime=10;textOverflows=[];background(t);if(t<T.schedule+.12)story(t);if(t>T.schedule-.12&&t<T.closing+.24)phone(t);chapter(t);if(t>=T.closing)ending(t);if(showCaptions)captions(t);window.TEXT_OVERFLOWS=textOverflows;}
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
