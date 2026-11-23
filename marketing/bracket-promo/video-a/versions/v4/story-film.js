/* A / revision 3. Fixed camera, narrated fictional problem, full mobile viewport.
   0–13 Dani's matchday / 13–16 brand / 16–54 workflow / 54–60 resolution.
   No camera scale or perspective transforms are applied to product screens. */
const NARRATION=__NARRATION_DATA__;
const PHONE={x:120,y:300,scale:2.15,w:390,h:660};
function background(t){ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(540,900,70,540,950,1250);g.addColorStop(0,'#19333f');g.addColorStop(1,C.bg);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.globalAlpha=t<16||t>54?.35:.11;line(94,1795,986,1795,'#527181',2);line(94,1785,94,550,'#527181',2);line(986,1785,986,550,'#527181',2);ctx.beginPath();ctx.ellipse(540,1550,225,91,0,0,Math.PI*2);ctx.strokeStyle='#527181';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function character(t,x,y,s=1,relieved=false){
 ctx.save();ctx.translate(x,y+Math.sin(t*2.1)*2);ctx.scale(s,s);
 const stress=relieved?0:ease(seg(t,3.3,6.3)),gesture=Math.sin(t*2.3)*.05;
 // Legs and shoes: a simplified sports organiser, an original vector character.
 ctx.lineCap='round';line(-67,355,-83,600,'#080f14',73);line(65,355,80,600,'#080f14',73);
 rect(-136,586,102,34,'#536c79',null,17);rect(38,586,105,34,'#536c79',null,17);
 // Track jacket, collar, zipper and organiser badge.
 ctx.beginPath();ctx.moveTo(-66,89);ctx.quadraticCurveTo(-155,103,-179,190);ctx.lineTo(-124,390);ctx.quadraticCurveTo(0,425,127,390);ctx.lineTo(176,190);ctx.quadraticCurveTo(145,104,66,89);ctx.closePath();ctx.fillStyle='#213c49';ctx.fill();ctx.strokeStyle='#365765';ctx.lineWidth=3;ctx.stroke();
 line(0,113,0,384,'#74bad9',3);line(-130,172,-107,310,C.blue,5);line(130,172,107,310,C.blue,5);
 line(-30,108,-55,224,'#09171e',5);line(30,108,-55,224,'#09171e',5);rect(-81,217,72,87,'#d8e8ec',null,8);txt('ORG.',-45,247,19,700,'#24404d','center');line(-66,265,-24,265,'#a9c3cf',4);
 // Neck and head use articulated, restrained movement.
 rect(-31,48,62,73,'#b87854',null,17);ctx.save();ctx.rotate(gesture*(.25+stress));
 circle(-91,-10,17,'#c88f67');circle(91,-10,17,'#c88f67');
 ctx.beginPath();ctx.moveTo(-91,-61);ctx.bezierCurveTo(-81,-135,87,-137,95,-56);ctx.lineTo(85,15);ctx.bezierCurveTo(75,103,-73,109,-87,17);ctx.closePath();ctx.fillStyle='#c88f67';ctx.fill();
 ctx.beginPath();ctx.moveTo(-95,-12);ctx.bezierCurveTo(-132,-104,-53,-164,25,-141);ctx.bezierCurveTo(90,-146,125,-84,94,-22);ctx.lineTo(77,-57);ctx.quadraticCurveTo(42,-47,12,-85);ctx.quadraticCurveTo(-26,-29,-79,-48);ctx.closePath();ctx.fillStyle='#081217';ctx.fill();
 const blink=(t%4.4)>4.24;line(-53,-17,-26,-22-stress*7,'#16252d',6);line(27,-22-stress*7,54,-17,'#16252d',6);
 if(blink){line(-47,0,-29,0,'#24333c',4);line(29,0,47,0,'#24333c',4);}else{circle(-38,0,5,'#16252d');circle(38,0,5,'#16252d');}
 ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-7,30);ctx.lineTo(5,31);ctx.strokeStyle='#9e5c41';ctx.lineWidth=3;ctx.stroke();
 ctx.beginPath();ctx.moveTo(-27,52);ctx.quadraticCurveTo(0,relieved?78:58-stress*18,27,52);ctx.strokeStyle='#653d32';ctx.lineWidth=4;ctx.stroke();ctx.restore();
 // One hand holds a phone; the other responds to the incoming messages.
 line(140,166,186,283,'#213c49',65);line(185,283,123,272,'#213c49',58);circle(112,267,24,'#c88f67');
 ctx.save();ctx.translate(114,228);ctx.rotate(-.07);rect(-38,-49,75,132,'#071116','#547586',12);rect(-29,-35,57,98,'#162b35',null,5);rect(-20,-20,40,7,C.blue,null,2);rect(-20,-4,32,5,'#486b7d',null,2);if(relieved)icon('check',-17,12,37,C.blue);ctx.restore();
 const arm=stress?Math.sin(t*1.7)*12:0;line(-141,171,-194,285,'#213c49',62);line(-194,285,-232+arm,223,'#213c49',54);circle(-233+arm,214,24,'#c88f67');
 ctx.restore();
}
function message(t,a,x,y,w,h,eyebrow,content,{score=false}={}){
 const p=ease(seg(t,a,a+.55));if(p<=0)return;ctx.save();ctx.globalAlpha*=p;ctx.translate((x<540?-42:42)*(1-p),28*(1-p));
 rect(x,y,w,h,C.surface,'#426170',22);circle(x+34,y+35,9,C.blue);txt(eyebrow,x+57,y+36,20,600,C.muted);
 if(score){txt('Halcones',x+24,y+85,25,600);txt('Leones',x+24,y+123,25,600);txt('2',x+w-31,y+85,32,700,C.blue,'center');txt('1',x+w-31,y+123,32,700,C.blue,'center');}
 else wrap(content,x+25,y+88,w-50,28,500,C.text,39);ctx.restore();
}
function story(t){
 const alpha=1-ease(seg(t,12.4,13.2));ctx.save();ctx.globalAlpha=alpha;
 ctx.drawImage(logo,99,114,66,66);txt('Bracket',183,148,31,600);
 const enter=ease(seg(t,.1,.65));ctx.save();ctx.globalAlpha*=enter;ctx.translate(0,20*(1-enter));txt('DOMINGO.',99,289,78,700);txt('HAY JORNADA.',99,382,78,700,C.blue);ctx.restore();
 character(t,552,829,.88,false);
 message(t,4.15,96,510,409,179,'EL HORARIO','¿Podemos jugar a las 11:30?');
 message(t,6.35,652,919,332,158,'EL MARCADOR','',{score:true});
 message(t,9.2,95,1430,541,159,'LA PREGUNTA','¿Cómo va la tabla?');
 // Connecting lines represent Dani's task, not a Bracket messaging feature.
 if(t>9){ctx.save();ctx.globalAlpha*=.28*ease(seg(t,9,10));ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(302,689);ctx.bezierCurveTo(110,850,1000,1250,652,996);ctx.strokeStyle=C.blue;ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 txt('Un domingo cualquiera.',99,1747,29,400,C.muted);ctx.restore();
 const a=ease(seg(t,12.8,13.35))*(1-ease(seg(t,15.35,16)));if(a>0){ctx.save();ctx.globalAlpha=a;txt('Para eso está',540,574,51,400,C.muted,'center');
 const p=ease(seg(t,12.8,13.62));ctx.save();ctx.beginPath();ctx.rect(380,706,320,320*p);ctx.clip();ctx.drawImage(logo,380,706,320,320);ctx.restore();txt('Bracket',540,1153,99,700,C.text,'center');ctx.restore();}
}
const chapters=[
 {a:16,b:23.2,line:'Tu liga. Tus reglas.',sub:'Equipos y competición, en un mismo lugar.'},
 {a:23.2,b:30.2,line:'Cada cruce, en su lugar.',sub:'Prepara la jornada que van a jugar.'},
 {a:30.2,b:40.6,line:'Tú confirmas el resultado.',sub:'Demostración ilustrativa · lectura resumida'},
 {a:40.6,b:49.7,line:'Que el resultado se vea.',sub:'Clasificación e imagen para compartir.'},
 {a:49.7,b:54.1,line:'La tabla, al alcance.',sub:'Activa su consulta pública.'}
];
function chapter(t){for(const c of chapters){const p=ease(seg(t,c.a,c.a+.3))*(1-ease(seg(t,c.b-.18,c.b+.05)));if(p<=0)continue;ctx.save();ctx.globalAlpha=p;txt(c.line,101,151,48,700);txt(c.sub,103,223,c.a===30.2?27:28,400,C.muted);ctx.restore();}}
function drawPhoneState(scene,t,alpha){ctx.save();ctx.globalAlpha*=alpha;ctx.translate(PHONE.x,PHONE.y);ctx.scale(PHONE.scale,PHONE.scale);ctx.beginPath();ctx.roundRect(0,0,PHONE.w,PHONE.h,18);ctx.clip();mobileDrawing=true;scene.draw(Math.max(0,t-scene.a));mobileDrawing=false;ctx.restore();}
function phone(t){
 const alpha=ease(seg(t,15.6,16.15))*(1-ease(seg(t,54.1,54.55)));if(alpha<=0)return;
 ctx.save();ctx.globalAlpha=alpha;rect(PHONE.x-11,PHONE.y-12,PHONE.w*PHONE.scale+22,PHONE.h*PHONE.scale+24,'#080f13','#426170',49);
 const i=SCENES.findIndex(s=>t>=s.a&&t<s.b),scene=SCENES[i]||SCENES[t<16?0:SCENES.length-1];
 const enter=scene.a===16?1:ease(seg(t,scene.a,scene.a+.22));if(i>0&&enter<1)drawPhoneState(SCENES[i-1],SCENES[i-1].b-.001,1-enter);drawPhoneState(scene,t,enter);ctx.restore();
}
function ending(t){
 const a=ease(seg(t,54.2,54.65))*(1-ease(seg(t,56.2,56.7)));if(a>0){ctx.save();ctx.globalAlpha=a;txt('TU LIGA.',540,445,76,700,C.text,'center');txt('A LA ALTURA.',540,540,76,700,C.blue,'center');character(t,540,924,.72,true);ctx.restore();}
 const p=ease(seg(t,56.65,57.25));if(!p)return;ctx.save();ctx.globalAlpha=p;
 ctx.beginPath();ctx.arc(540,822,252,-Math.PI*.8,-Math.PI*.8+Math.PI*1.6*ease(seg(t,56.65,57.4)));ctx.strokeStyle='#84d8ff66';ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.rect(335,617,410,410*p);ctx.clip();ctx.drawImage(logo,335,617,410,410);ctx.restore();txt('Bracket',540,1153,108,700,C.text,'center');txt('Más allá del amateur',540,1276,48,400,'#d9f2ff','center');ctx.restore();
}
function captions(t){const p=NARRATION.find(n=>t>=n.start&&t<n.end);if(!p)return;const words=p.text.split(/\s+/),groups=[];for(let i=0;i<words.length;i+=7)groups.push(words.slice(i,i+7).join(' '));const index=Math.min(groups.length-1,Math.floor(seg(t,p.start,p.end)*groups.length));rect(91,1761,898,111,'#080f13e8','#263740',15);wrap(groups[index],120,1794,840,31,600,C.text,42);}
const showCaptions=new URLSearchParams(location.search).has('captions');
function render(t){t=((Number(t)%60)+60)%60;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;mobileDrawing=false;textOverflows=[];background(t);if(t<16)story(t);if(t>15.5&&t<54.6)phone(t);chapter(t);if(t>=54.1)ending(t);if(showCaptions)captions(t);window.TEXT_OVERFLOWS=textOverflows;}
const isRender=new URLSearchParams(location.search).has('render');if(isRender)document.body.classList.add('render');
function fit(){if(isRender)return;const s=Math.min((innerWidth-32)/1080,(innerHeight-126)/1920);document.getElementById('stage').style.transform=`scale(${s})`;const w=document.getElementById('wrap');w.style.width=1080*s+'px';w.style.height=1920*s+'px';}
let offset=0,playing=false,last=-1;
const audio=new Audio('../final/bracket-a-60s.mp4');audio.preload='metadata';audio.loop=true;
function now(){return playing?audio.currentTime:offset;}
function pause(){offset=now();playing=false;audio.pause();document.getElementById('play').textContent='Reproducir';}
document.getElementById('play').onclick=()=>{if(playing){pause();return;}playing=true;audio.currentTime=offset;audio.play().catch(()=>{playing=false;});document.getElementById('play').textContent='Pausar';};
document.getElementById('scrub').oninput=e=>{const was=playing;pause();offset=Number(e.target.value);render(offset);if(was)document.getElementById('play').click();};
async function init(){await Promise.all([document.fonts.load('400 36px Poppins'),document.fonts.load('600 36px Poppins'),document.fonts.load('700 36px Poppins'),logo.decode()]);await document.fonts.ready;window.VIDEO={w:1080,h:1920,duration:60};window.seek=render;window.BRACKET_READY=true;window.SCENES=SCENES.map(({a,b,name})=>({a,b,name}));window.PHONE_LAYOUT={...PHONE,zoom:false,perspective:false};fit();render(0);if(!isRender){addEventListener('resize',fit);(function loop(){const t=now();if(playing||t!==last){render(t);last=t;document.getElementById('scrub').value=t;document.getElementById('clock').textContent=`0:${Math.floor(t).toString().padStart(2,'0')} / 1:00`;}requestAnimationFrame(loop);})();}}
init();
