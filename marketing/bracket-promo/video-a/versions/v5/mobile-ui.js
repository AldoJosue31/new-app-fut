/* Bracket mobile reconstruction. Original Dark tokens, original labels.
   390 × 660 logical pixels; the complete viewport stays in a fixed frame.
   Every state is drawn from time, without screenshots or camera crops. */
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false});
const W=1080,H=1920;
const C={bg:'#131F24',surface:'#10191d',border:'#263740',text:'#ffffff',muted:'rgba(255,255,255,.62)',blue:'#1cb0f6',soft:'rgba(28,176,246,.16)',strong:'#38d4ff',green:'#7ee2b8'};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),lerp=(a,b,p)=>a+(b-a)*p;
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const ease=x=>(x=clamp(x),x<.5?4*x*x*x:1-(-2*x+2)**3/2);
const fade=(t,a,b,f=.25)=>ease(seg(t,a,a+f))*(1-ease(seg(t,b-f,b)));
let mobileDrawing=false,textOverflows=[],uiEntranceTime=10;
const revealAt=y=>mobileDrawing?ease(seg(uiEntranceTime,.015+clamp(y/660)*.055,.16+clamp(y/660)*.055)):1;
function rect(x,y,w,h,fill=C.surface,stroke=C.border,r=12){const p=revealAt(y);ctx.save();ctx.globalAlpha*=p;ctx.beginPath();ctx.roundRect(x,y+7*(1-p),w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=mobileDrawing?1:2;ctx.stroke();}ctx.restore();}
function txt(s,x,y,size=14,weight=400,color=C.text,align='left'){
 ctx.font=`${weight} ${size}px Poppins`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;
 if(mobileDrawing){const w=ctx.measureText(String(s)).width,left=x-(align==='center'?w/2:align==='right'?w:0);if(left<-.5||left+w>390.5)textOverflows.push({text:s,left,right:left+w});}
 const p=revealAt(y);ctx.save();ctx.globalAlpha*=p;ctx.fillText(String(s),x,y+7*(1-p));ctx.restore();ctx.textAlign='left';
}
function wrap(s,x,y,max,size=14,weight=400,color=C.text,leading=size*1.5){
 ctx.font=`${weight} ${size}px Poppins`;const rows=[];let line='';
 for(const w of s.split(' ')){const next=line?line+' '+w:w;if(ctx.measureText(next).width>max&&line){rows.push(line);line=w;}else line=next;}rows.push(line);rows.forEach((s,i)=>txt(s,x,y+i*leading,size,weight,color));return rows.length*leading;
}
function line(x,y,xx,yy,color=C.border,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,fill,stroke=null){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=mobileDrawing?1:2;ctx.stroke();}}
function icon(kind,x,y,s=20,color=C.blue){ctx.save();ctx.translate(x,y);ctx.scale(s/24,s/24);ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 if(kind==='check'){ctx.moveTo(4,12);ctx.lineTo(9,17);ctx.lineTo(20,5);}
 else if(kind==='plus'){ctx.moveTo(12,4);ctx.lineTo(12,20);ctx.moveTo(4,12);ctx.lineTo(20,12);}
 else if(kind==='close'){ctx.moveTo(6,6);ctx.lineTo(18,18);ctx.moveTo(18,6);ctx.lineTo(6,18);}
 else if(kind==='menu'){[6,12,18].forEach(y=>{ctx.moveTo(3,y);ctx.lineTo(21,y);});}
 else if(kind==='download'){ctx.moveTo(12,3);ctx.lineTo(12,16);ctx.moveTo(6,10);ctx.lineTo(12,16);ctx.lineTo(18,10);ctx.moveTo(4,18);ctx.lineTo(4,22);ctx.lineTo(20,22);ctx.lineTo(20,18);}
 else if(kind==='calendar'){ctx.roundRect(3,5,18,16,3);ctx.moveTo(3,10);ctx.lineTo(21,10);ctx.moveTo(8,2);ctx.lineTo(8,7);ctx.moveTo(16,2);ctx.lineTo(16,7);}
 else if(kind==='scan'){for(const [xx,yy,dx,dy]of [[3,3,1,1],[21,3,-1,1],[21,21,-1,-1],[3,21,1,-1]]){ctx.moveTo(xx+dx*5,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy+dy*5);}ctx.moveTo(6,12);ctx.lineTo(18,12);}
 else if(kind==='grid'){for(let i=0;i<2;i++)for(let j=0;j<2;j++)ctx.roundRect(3+i*11,3+j*11,7,7,1);}
 else if(kind==='link'){ctx.moveTo(9,8);ctx.bezierCurveTo(18,-2,28,8,16,16);ctx.moveTo(15,16);ctx.bezierCurveTo(6,26,-4,16,8,8);ctx.moveTo(8,16);ctx.lineTo(16,8);}
 else if(kind==='chevron'){ctx.moveTo(9,5);ctx.lineTo(16,12);ctx.lineTo(9,19);}
 ctx.stroke();ctx.restore();}
function button(label,x,y,w,{primary=true,pressed=false,small=false,kind=null}={}){
 const h=small?34:43;ctx.save();ctx.translate(0,pressed?1.2:0);rect(x,y,w,h,primary?(pressed?'#139ddf':C.blue):C.bg,primary?null:C.border,10);
 txt(label,x+w/2+(kind?9:0),y+h/2,small?11:12,600,primary?C.bg:C.text,'center');
 if(kind){ctx.font=`600 ${small?11:12}px Poppins`;const width=ctx.measureText(label).width;icon(kind,x+(w-width)/2-19,y+h/2-9,18,primary?C.bg:C.blue);}ctx.restore();
}
function tag(s,x,y,w,{active=false,green=false}={}){rect(x,y,w,25,green?'rgba(63,191,138,.16)':active?C.soft:C.bg,active?C.blue:C.border,10);txt(s,x+w/2,y+13,10,600,green?C.green:active?C.strong:C.muted,'center');}
function field(label,value,x,y,w,{focus=false,caret=false}={}){txt(label,x,y,11,600,C.muted);rect(x,y+14,w,43,C.bg,focus?C.blue:C.border,10);txt(value,x+12,y+36,13);if(caret){ctx.font='400 13px Poppins';const xx=x+12+ctx.measureText(value).width;line(xx,y+25,xx,y+47,C.blue,1);}}
function tap(t,at,x,y){const p=seg(t,at-.14,at+.46);if(p<=0||p>=1)return;ctx.save();ctx.globalAlpha=Math.sin(Math.PI*p)*.8;circle(x,y,lerp(4,20,ease(p)),C.soft,C.blue);circle(x,y,4,'#fff');ctx.restore();}
function crest(name,x,y,size=27){ctx.save();ctx.translate(x,y);ctx.scale(size/27,size/27);ctx.beginPath();ctx.moveTo(2,3);ctx.quadraticCurveTo(13.5,-2,25,3);ctx.lineTo(23,17);ctx.quadraticCurveTo(19,25,13.5,27);ctx.quadraticCurveTo(6,25,4,17);ctx.closePath();ctx.fillStyle='#263740';ctx.fill();ctx.strokeStyle='#6c8999';ctx.lineWidth=.8;ctx.stroke();txt(name.slice(0,2).toUpperCase(),13.5,11,8,700,'#fff','center');ctx.restore();}
const teams=['Halcones','Leones','Norte','Sur'];
let logo=new Image();logo.src=LOGO_SOURCE;
function appHeader(active=0){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,390,660);ctx.drawImage(logo,17,18,29,29);txt('Torneos',59,33,19,700);icon('menu',350,23,21,C.muted);
 const widths=[72,82,132,88],names=['Torneo','Jornadas','Clasificacion','Goleadores'];let x=8;
 names.forEach((s,i)=>{if(i===active)rect(x,66,widths[i]-4,34,C.soft,C.blue,10);txt(s,x+(widths[i]-4)/2,83,10,600,i===active?C.blue:C.muted,'center');x+=widths[i];});line(16,112,374,112);
}
function pane(title,{y=130,h=492,subtitle=null}={}){rect(16,y,358,h,C.surface,C.border,15);txt(title,32,y+29,18,700);if(subtitle)txt(subtitle,32,y+57,10,400,C.muted);}
function config(t){
 appHeader(0);pane('Configurar Reglas',{h:482});icon('close',340,149,17,C.muted);
 ['General','Puntuación','Formato','Reglas'].forEach((s,i)=>{const x=30+i*83;if(!i)rect(x,186,79,29,C.soft,C.blue,9);txt(s,x+39.5,201,9,600,i?C.muted:C.blue,'center');});
 const value='Copa de Barrio'.slice(0,Math.floor(seg(t,.4,1.1)*14));field('Temporada',value,32,246,326,{focus:t<1.4,caret:t>.4&&t<1.3});
 field('Fecha Inicio',t<1.55?'':'09/11/2026',32,328,326,{focus:t>=1.4&&t<1.9});icon('calendar',328,355,18);
 txt('LÍMITES DE PARTICIPACIÓN',32,418,10,600,C.blue);field('Min. Jugadores','7',32,452,154);field('Max. Equipos','4',204,452,154);
 button('Guardar Configuración',32,545,326,{pressed:t>=2.9&&t<3.1,kind:'check'});tap(t,1.55,300,363);tap(t,3,206,566);
}
function participants(t){
 appHeader(0);pane('Copa de Barrio',{h:483,subtitle:'Primera · 09 nov 2026'});txt('Equipos del Torneo',32,228,13,600);
 const n=t<.8?2:t<1.55?3:4;tag(n+'/4',302,215,54,{active:true});
 teams.forEach((name,i)=>{const included=i<2||t>=(i===2?.8:1.55),p=i<2?1:ease(seg(t,i===2?.8:1.55,i===2?1.14:1.89)),y=259+i*59;
 rect(32,y,326,50,included?C.bg:C.surface);crest(name,44,y+11,27);txt(name,84,y+26,14,600);icon(included?'close':'plus',327,y+17,17,included?C.muted:C.blue);
 if(i>=2&&p>0&&p<1){ctx.save();ctx.globalAlpha=Math.sin(p*Math.PI)*.4;rect(32,y,326,50,C.soft,C.blue);ctx.restore();}});
 button('Siguiente: Sorteo',32,535,326,{kind:'chevron',pressed:t>=2.9&&t<3.1});tap(t,.8,336,403);tap(t,1.55,336,462);tap(t,3,210,556);
}
function match(a,b,x,y,w,{score=null,time=null}={}){
 rect(x,y,w,112,C.bg);if(time)txt(time,x+w-13,y+18,11,600,C.blue,'right');
 [a,b].forEach((name,i)=>{crest(name,x+14,y+23+i*43,26);txt(name,x+52,y+37+i*43,13,600);txt(score?score[i]:'—',x+w-23,y+38+i*43,15,600,score?C.blue:C.muted,'center');});
}
function fixture(t){appHeader(0);pane('Editor de Fixture',{h:491,subtitle:'Organiza las jornadas antes de guardar'});tag('4 Equipos',32,216,95);tag('Fixture Válido',222,216,136,{green:true});txt('Jornada 1',32,272,14,600);
 for(let i=0;i<2;i++){const p=ease(seg(t,.12+i*.16,.55+i*.16));ctx.save();ctx.globalAlpha*=p;ctx.translate(0,12*(1-p));match(teams[i*2],teams[i*2+1],32,298+i*125,326);ctx.restore();}
 button('Confirmar Fixture',32,561,326,{pressed:t>2.1&&t<2.3,kind:'check'});tap(t,2.2,215,582);
}
function planning(t){appHeader(1);pane('Jornada 1',{h:486,subtitle:'Semana del 09 al 15 nov'});tag(t>3.1?'CONFIRMADA':'PENDIENTE',244,147,113,{active:true});
 txt('Lunes 09 de noviembre',32,231,12,600,C.blue);match('Halcones','Leones',32,259,326);
 field('Hora del partido',t<1.1?'10:00':'11:30',46,398,198,{focus:t>.5&&t<1.7});icon('calendar',324,418,20,C.muted);
 if(t>=1.1)tag('11:30',275,292,65,{active:true});
 if(t<3.1){button('Confirmar Jornada',32,545,326,{kind:'check',pressed:t>2.9});}else{rect(32,535,326,55,C.soft,C.blue);icon('check',44,551,21);txt('Jornada confirmada correctamente',73,563,10,600,C.strong);}
 tap(t,1.1,179,433);tap(t,3,210,566);
}
function tinyPaper(x,y,w,h){ctx.save();rect(x,y,w,h,'#f7fafc','#d7e2e9',3);txt('CÉDULA DE PARTIDO',x+w/2,y+16,6,700,'#20323c','center');txt('HALCONES  2–1  LEONES',x+w/2,y+35,6,700,'#20323c','center');
 for(let i=0;i<5;i++){const yy=y+57+i*18;line(x+8,yy+7,x+w-8,yy+7,'#c8d8e2',.6);txt(['Mateo Ruiz','Diego Luna','Iván Soto','Luis Vega','Alex Ríos'][i],x+10,yy,5.7,400,'#516a79');txt(i===0?'2':i===2?'1':'—',x+w-14,yy,6,600,'#516a79','center');}ctx.restore();}
function resultIntro(t){appHeader(1);pane('Definir Resultado',{h:490,subtitle:'Halcones vs Leones · Jornada 1'});button('Escanear cédula',32,219,326,{primary:false,kind:'scan'});scoreBlock(0,0,305);field('Árbitro Principal','Alex Moreno',32,418,326);button('Guardar Marcador',32,551,326,{kind:'check'});tap(t,.65,215,240);}
function scoreBlock(a,b,y){crest('Halcones',75,y,36);crest('Leones',279,y,36);txt('Halcones',94,y+54,12,600,C.text,'center');txt('Leones',297,y+54,12,600,C.text,'center');txt(a,157,y+20,34,700,C.blue,'center');txt('–',195,y+19,20,400,C.muted,'center');txt(b,233,y+20,34,700,C.blue,'center');}
function scanner(t){appHeader(1);pane('Escanear cédula',{h:490,subtitle:'Halcones vs Leones · Jornada 1'});txt(t<1.3?'Vista previa':'Leyendo cédula',32,229,13,600);tinyPaper(117,257,156,191);
 if(t>=1.3){const p=seg(t,1.3,2.9);rect(32,487,326,5,C.bg,null,2);rect(32,487,326*p,5,C.blue,null,2);ctx.save();ctx.translate(195,454);ctx.rotate(t*3);ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*1.4);ctx.strokeStyle=C.blue;ctx.lineWidth=1.8;ctx.stroke();ctx.restore();}
 button(t<1.3?'Escanear cédula':'Leyendo cédula',32,551,326,{primary:t<1.3,kind:'scan',pressed:t>1.2&&t<1.4});tap(t,1.3,210,572);
}
function review(t){appHeader(1);pane('Resultado escaneado',{h:490,subtitle:'Halcones vs Leones · Jornada 1'});tinyPaper(32,222,100,151);txt('Datos del partido',153,238,12,600);txt('Halcones',153,283,13,600);txt('2',337,283,29,700,C.blue,'center');txt('Leones',153,337,13,600);txt('1',337,337,29,700,C.blue,'center');
 txt('Jugadores interpretados',32,409,13,600);[['Mateo Ruiz','2 goles'],['Iván Soto','1 gol']].forEach(([name,value],i)=>{rect(32,430+i*45,326,36,C.bg,null,8);txt(name,44,448+i*45,12,600);txt(value,344,448+i*45,11,600,C.blue,'right');});
 button('Aplicar escaneo',32,551,326,{kind:'check',pressed:t>2.2&&t<2.4});tap(t,2.3,205,572);
}
function confirmation(t){appHeader(1);pane('Definir Resultado',{h:490,subtitle:'Halcones vs Leones · Jornada 1'});scoreBlock(2,1,243);field('Árbitro Principal','Alex Moreno',32,362,326);field('Observaciones Adicionales','Datos de cédula revisados',32,451,326);button('Guardar Marcador',32,551,326,{kind:'check',pressed:t>.8&&t<1.05});tap(t,.9,214,572);
 if(t>=1.4&&t<2.8){rect(0,0,390,660,'rgba(0,0,0,.60)',null,0);rect(28,208,334,258,C.surface,C.border,16);txt('¿Confirmar Marcador?',195,244,17,700,C.text,'center');scoreBlock(2,1,275);button('Revisar',47,400,115,{primary:false});button('Sí, guardar',176,400,166,{kind:'check',pressed:t>2.4});tap(t,2.45,259,421);}
 if(t>=2.8){rect(0,0,390,660,'rgba(19,31,36,.94)',null,0);rect(35,248,320,161,C.surface,C.border,15);icon('check',179,275,31);txt('Resultado guardado',195,343,17,600,C.text,'center');txt('Halcones 2 – 1 Leones',195,378,12,400,C.muted,'center');}
}
const values={Halcones:[1,'+1',3],Norte:[1,'0',1],Sur:[1,'0',1],Leones:[1,'−1',0]};
function table(x,y,w,p=1,mini=false){ctx.save();ctx.translate(x,y);ctx.scale(w/326,w/326);rect(0,0,326,34,C.bg);txt('EQUIPO',12,18,10,600,C.muted);[['PJ',213],['DIF',258],['PTS',303]].forEach(([s,xx])=>txt(s,xx,18,9,600,s==='PTS'?C.blue:C.muted,'center'));
 const before=['Norte','Sur','Halcones','Leones'],after=['Halcones','Norte','Sur','Leones'];teams.forEach(name=>{const pos=lerp(before.indexOf(name),after.indexOf(name),ease(p)),yy=43+pos*65;
 rect(0,yy,326,57,name==='Halcones'&&p>.3?C.soft:C.bg);txt(Math.round(pos)+1,13,yy+29,10,400,C.muted,'center');crest(name,26,yy+17,23);txt(name,58,yy+29,12,600);const v=values[name];txt(v[0],213,yy+29,12,400,C.text,'center');txt(v[1],258,yy+29,12,400,C.text,'center');txt(name==='Halcones'&&p<.5?0:v[2],303,yy+29,19,700,name==='Halcones'?C.blue:C.text,'center');});ctx.restore();}
function standings(t,publicControls=false){appHeader(2);pane('Copa de Barrio',{h:491,subtitle:'Primera · Jornada 1'});
 if(publicControls){const on=t>=.65;rect(32,215,139,34,on?'rgba(63,191,138,.16)':C.bg);rect(43,224,35,17,on?C.blue:'#37464f',null,10);circle(on?69:52,232.5,6,'#fff');txt(on?'Publico':'Privado',88,233,11,600,on?C.green:C.muted);button(t>1.5?'Copiado':'Link',180,215,88,{primary:false,small:true,kind:t>1.5?'check':'link'});button('Exportar',277,215,81,{primary:false,small:true});tap(t,.65,61,232);tap(t,1.5,223,232);}
 else button('Exportar',239,215,119,{primary:false,small:true,kind:'download'});
 table(32,273,326,publicControls?1:seg(t,.65,1.75));if(!publicControls)tap(t,4.15,298,232);
}
function exportPanel(t){appHeader(2);pane('Exportar Tabla General',{h:492});icon('close',341,151,17,C.muted);const history=t>.7;
 rect(32,205,326,37,C.bg);rect(history?196:36,209,158,29,C.soft,null,8);txt('Post (4:5)',114,224,11,600,history?C.muted:C.blue,'center');txt('Historia (9:16)',275,224,11,600,history?C.blue:C.muted,'center');
 const p=ease(seg(t,.7,1.15)),pw=lerp(230,163,p),ph=lerp(270,290,p),xx=195-pw/2;
 rect(xx,261,pw,ph,'#fff','#d9e6f2',5);txt('TABLA GENERAL',195,283,9,700,'#24333c','center');txt('Primera · Copa de Barrio',195,302,6,400,'#6a7e8e','center');
 ctx.save();ctx.translate(xx+9,320);ctx.scale((pw-18)/326,(pw-18)/326);const old={...C};Object.assign(C,{bg:'#edf3fb',text:'#24333c',muted:'#6a7e8e',border:'#d9e6f2',soft:'#e0f6ff'});table(0,0,326,1);Object.assign(C,old);ctx.restore();
 txt('Jornada 1 · Datos de demostración',195,261+ph-13,5.5,400,'#6a7e8e','center');
 button('Descargar',32,566,326,{kind:'download',pressed:t>=3&&t<3.2});tap(t,.7,278,224);tap(t,3.1,210,587);
}
function publicView(){ctx.fillStyle=C.bg;ctx.fillRect(0,0,390,660);ctx.drawImage(logo,176,24,38,38);wrap('Temporada Copa de Barrio',32,104,326,22,700);txt('Primera | Jornada 1',32,159,12,400,C.muted);tag('Tabla General',32,202,157,{active:true});txt('Goleadores',274,215,12,600,C.muted,'center');rect(16,254,358,355);table(32,278,326,1);}
const LEGACY_SCENES=[
 {a:17.8,b:21.2,name:'config',draw:config},{a:21.2,b:24.5,name:'participants',draw:participants},
 {a:24.5,b:27.2,name:'fixture',draw:fixture},{a:27.2,b:32,name:'planning',draw:planning},
 {a:32,b:33,name:'result',draw:resultIntro},{a:33,b:36,name:'scan',draw:scanner},
 {a:36,b:38.8,name:'review',draw:review},{a:38.8,b:42.3,name:'confirmation',draw:confirmation},
 {a:42.3,b:47.3,name:'standings',draw:standings},{a:47.3,b:51.6,name:'export',draw:exportPanel},
 {a:51.6,b:53.8,name:'public-controls',draw:t=>standings(t,true)},{a:53.8,b:55.5,name:'public',draw:publicView}
];
