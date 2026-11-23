/* V5 verified UI additions: schedule PNG export, roster, performance, scorers.
   Original controls from ScheduleExportModal, RosterTab, TeamPerformanceTab. */
function cardCheck(label,x,y,on,color){rect(x,y,38,28,on?color+'30':C.bg,on?color:C.border,6);txt(label,x+19,y+14,10,600,on?color:C.muted,'center');}
function livePlanning(t){
 appHeader(1);pane('Jornada 1',{h:491,subtitle:'Semana del 09 al 15 nov'});
 const done=t>=T.scheduleConfirm;tag(done?'CONFIRMADA':'PENDIENTE',244,147,113,{active:true});
 txt('Lunes 09 de noviembre',32,230,12,600,C.blue);
 match('Halcones','Leones',32,256,326,{time:t>=T.adjust?'11:30':'10:00'});
 field('Hora del partido',t>=T.adjust?'11:30':'10:00',46,391,198,{focus:Math.abs(t-T.adjust)<.45});
 txt('Norte vs Sur · 13:00',47,477,12,600,C.muted);
 button(done?'Exportar rol':'Confirmar Jornada',32,549,326,{kind:done?'download':'check',pressed:Math.abs(t-(done?T.roleOpen:T.scheduleConfirm))<.08});
 tap(t,T.adjust,156,427);tap(t,T.scheduleConfirm,206,570);tap(t,T.roleOpen,206,570);
}
function roleExport(t){
 appHeader(1);pane('Exportar Rol',{h:493});icon('close',341,151,17,C.muted);
 txt('Configura la imagen del rol',32,191,10,400,C.muted);tag('Post (4:5)',32,211,151);tag('Historia (9:16)',194,211,164,{active:true});
 txt('Vista del rol',32,260,10,600,C.muted);tag('Grid',211,246,66);tag('Row',284,246,74,{active:true});
 const x=102,y=291,w=186,h=260;rect(x,y,w,h,'#121212','#41535e',4);
 txt('LIGA DE BARRIO',195,y+24,10,700,C.text,'center');txt('JORNADA 1',195,y+45,13,700,C.blue,'center');txt('Copa de Barrio · Primera',195,y+63,6.5,400,C.muted,'center');
 txt('LUNES 09 NOV',x+14,y+92,8,600,C.muted);
 [['Halcones','Leones','11:30'],['Norte','Sur','13:00']].forEach(([a,b,time],i)=>{const yy=y+109+i*61;rect(x+10,yy,w-20,51,'#1e1e1e','#35434d',5);txt(time,x+19,yy+15,8,600,C.blue);txt(a+' vs '+b,x+19,yy+34,8,600,C.text);});
 button('Descargar',32,567,326,{kind:'download',pressed:Math.abs(t-T.roleDownload)<.1});tap(t,T.roleDownload,209,588);
}
function rosterV5(t){
 appHeader(1);pane('Definir Resultado',{h:491,subtitle:'Halcones vs Leones · Jornada 1'});
 tag('Resumen',32,213,151);tag('Planteles',194,213,164,{active:true});txt('HALCONES · TITULARES',32,264,11,600,C.blue);
 const active=t>=T.playerSelected,goals=t>=T.goalRegistered?2:0,yellow=t>=T.cardRegistered;
 [['Mateo Ruiz',goals,false],['Diego Luna',0,yellow]].forEach(([name,g,y],i)=>{const yy=286+i*112;rect(32,yy,326,100,C.bg);rect(43,yy+11,304,32,C.surface,active?C.border:C.blue,7);txt(active?name:'Selecciona un jugador',54,yy+27,12,600,active?C.text:C.muted);icon('chevron',327,yy+18,15,C.muted);
 txt('G',48,yy+71,10,600,C.blue);rect(64,yy+53,50,33,C.surface,C.border,7);txt(g,89,yy+70,15,600,C.blue,'center');tag('AG',125,yy+56,45);cardCheck('TA',235,yy+55,y,'#f1c40f');cardCheck('TR',285,yy+55,false,'#e74c3c');});
 txt('Participación registrada desde el plantel',32,531,10,400,C.muted);button('Escanear cédula',32,565,326,{kind:'scan',primary:false,pressed:Math.abs(t-T.photo)<.1});
 tap(t,T.playerSelected,165,313);tap(t,T.goalRegistered,91,358);tap(t,T.cardRegistered,254,469);tap(t,T.photo,209,587);
}
function individualStats(t){
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,390,660);ctx.drawImage(logo,17,18,29,29);txt('Equipos',59,33,19,700);icon('menu',350,23,21,C.muted);
 rect(16,74,358,555);crest('Halcones',32,91,38);txt('Halcones',84,111,21,700);txt('Copa de Barrio · Primera',32,159,11,400,C.muted);
 tag('Resultados',32,188,151);tag('Rendimiento',194,188,164,{active:true});
 txt('Rendimiento Individual',32,253,16,700);const hi=t<T.statsGoal?1:t<T.statsCards?2:3;
 const cols=[['JUGADOR',44],['PJ',229],['G',270],['TA',310],['TR',347]];
 rect(32,282,326,34,C.bg);cols.forEach(([s,x],i)=>txt(s,x,299,i?10:9,600,i===hi?C.blue:C.muted,i?'center':'left'));
 const data=[['Mateo Ruiz',1,2,0,0],['Diego Luna',1,0,1,0],['Alex Ríos',1,0,0,0]];
 data.forEach((row,i)=>{const y=325+i*69;rect(32,y,326,58,i===0?C.soft:C.bg);circle(54,y+29,11,'#2d4754');txt(row[0][0],54,y+29,10,600,C.text,'center');txt(row[0],73,y+29,11,600);
 row.slice(1).forEach((v,j)=>{const x=cols[j+1][1];if(j+1===hi)rect(x-16,y+9,32,39,C.soft,null,6);txt(v,x,y+29,15,600,j+1===hi?C.blue:C.text,'center');});});
 txt('PJ · Partidos jugados',32,559,10,600,C.blue);txt('G · Goles     TA / TR · Tarjetas',32,584,10,400,C.muted);
}
function scorersV5(t){
 appHeader(3);pane('Copa de Barrio',{h:491,subtitle:'Primera · Jornada 1'});
 tag('Hasta Jornada 1',32,215,170,{active:true});button('Exportar',253,212,105,{primary:false,small:true,kind:'download'});
 rect(32,273,326,36,C.bg);txt('#',46,292,10,600,C.muted);txt('Jugador',72,292,10,600,C.muted);txt('Equipo',230,292,10,600,C.muted);txt('Goles',333,292,10,600,C.blue,'center');
 [['Mateo Ruiz','Halcones',2],['Iván Soto','Leones',1]].forEach(([name,team,g],i)=>{const yy=322+i*83;rect(32,yy,326,71,i===0?C.soft:C.bg);txt(i+1,46,yy+35,12,600,C.muted);txt(name,72,yy+27,12,600);txt('#1',72,yy+49,9,400,C.muted);crest(team,213,yy+20,22);txt(team,241,yy+34,9,600);txt(g,333,yy+35,23,700,C.blue,'center');});
 txt('Goles registrados en el torneo',32,542,11,400,C.muted);
 tap(t,T.scorersExport-.07,305,229);
}
function scorersExportV5(t){
 appHeader(3);pane('Exportar Goleadores',{h:492});icon('close',341,151,17,C.muted);
 tag('Post',32,209,151);tag('Historia',194,209,164,{active:true});
 const x=105,y=262,w=180,h=287;rect(x,y,w,h,'#121212','#41535e',4);txt('LIGA DE BARRIO',195,y+24,9,700,C.text,'center');txt('GOLEADORES',195,y+52,14,700,C.blue,'center');txt('Copa de Barrio · Jornada 1',195,y+76,6.5,400,C.muted,'center');
 [['Mateo Ruiz','Halcones',2],['Iván Soto','Leones',1]].forEach(([name,team,g],i)=>{const yy=y+105+i*62;rect(x+9,yy,w-18,54,'#1e1e1e','#35434d',5);txt(i+1,x+19,yy+26,9,700,C.blue);txt(name,x+35,yy+18,8.5,600);txt(team,x+35,yy+35,7,400,C.muted);txt(g,x+w-22,yy+26,17,700,C.blue,'center');});
 button('Descargar',32,567,326,{kind:'download',pressed:Math.abs(t-(T.standings-.5))<.1});tap(t,T.standings-.5,209,588);
}
const mapUI=(t,a,b,length)=>seg(t,a,b)*length;
function makeProductScenes(t){
 return [
 {a:t.schedule,b:t.roleOpen,name:'planning',draw:livePlanning},
 {a:t.roleOpen,b:t.result,name:'role-export',draw:roleExport},
 {a:t.result,b:t.scanStart,name:'roster',draw:rosterV5},
 {a:t.scanStart,b:t.review,name:'scan',draw:u=>scanner(mapUI(u,t.scanStart,t.review,3))},
 {a:t.review,b:t.confirm,name:'review',draw:u=>review(mapUI(u,t.review,t.confirm,3))},
 {a:t.confirm,b:t.stats,name:'confirmation',draw:u=>confirmation(mapUI(u,t.confirm,t.stats,3.5))},
 {a:t.stats,b:t.scorers,name:'performance',draw:individualStats},
 {a:t.scorers,b:t.scorersExport,name:'scorers',draw:scorersV5},
 {a:t.scorersExport,b:t.standings,name:'scorers-export',draw:scorersExportV5},
 {a:t.standings,b:t.tableExport,name:'standings',draw:u=>{standings(4);tap(u,t.tableExport-.07,298,232);}},
 {a:t.tableExport,b:t.public,name:'table-export',draw:u=>exportPanel(mapUI(u,t.tableExport,t.public,4.3))},
 {a:t.public,b:t.publicView,name:'public-controls',draw:u=>standings(mapUI(u,t.public,t.publicView,2.2),true)},
 {a:t.publicView,b:t.closing,name:'public',draw:publicView}
 ];
}
