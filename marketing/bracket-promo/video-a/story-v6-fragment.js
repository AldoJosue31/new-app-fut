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
