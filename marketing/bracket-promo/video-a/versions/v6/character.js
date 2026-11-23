/* V6 Dani: articulated paper/pen, laptop and final phone poses.
   Original vector artwork. Official PNG and real public UI inside final phone. */
function daniArm(a,b,c,{width=51,color='#254756'}={}){
 ctx.lineCap='round';line(a[0],a[1],b[0],b[1],color,width);line(b[0],b[1],c[0],c[1],color,width-5);
 circle(c[0],c[1],22,'#d49a74');
}
function daniClipboard(t){
 ctx.save();ctx.translate(-121,177);ctx.rotate(-.055);
 rect(0,0,240,295,'#617c89','#8da7b3',12);rect(12,17,216,264,'#f7fafb',null,4);
 rect(79,-7,83,24,'#b4c8d0','#6c8898',5);
 txt('CÉDULA DE PARTIDO',120,51,13,700,'#243e4c','center');txt('HALCONES  2–1  LEONES',120,77,11,600,'#243e4c','center');
 const names=['Mateo Ruiz','Diego Luna','Iván Soto'];names.forEach((s,i)=>{const y=118+i*37;txt(s,28,y,12,400,'#4b6471');txt(i===0?'2':i===2?'1':'—',205,y,13,600,'#243e4c','center');line(25,y+13,215,y+13,'#c4d4dc',1);});
 txt('Observaciones',27,239,10,400,'#68828f');
 // Deterministic ink appears under the moving pen.
 const p=(t*1.4)%1;ctx.beginPath();for(let i=0;i<Math.floor(p*38);i++){const x=32+i*3,y=258+Math.sin(i*.9)*3;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#466a8b';ctx.lineWidth=1.8;ctx.stroke();ctx.restore();
}
function daniLaptop(t,stress){
 ctx.save();const open=outCubic(seg(t,T.transcribe-.1,T.transcribe+.2));ctx.globalAlpha*=open;
 // Screen and spreadsheet face the audience; no app is present here.
 rect(-180,264,360,192,'#0c1c26','#7093a4',12);rect(-167,278,334,163,'#142a35',null,5);
 rect(-167,278,334,26,'#244654',null,3);txt('CONTROL_LIGA.xlsx',-151,291,11,600,C.text);
 const xs=[-151,-14,44,103];['Jugador','PJ','G','TA'].forEach((s,i)=>txt(s,xs[i],321,10,600,C.muted));
 const step=Math.floor(Math.max(0,t-T.transcribe)*2.2);
 ['Mateo Ruiz','Diego Luna','Iván Soto'].forEach((s,i)=>{const y=345+i*31;line(-154,y+14,151,y+14,'#3e5a67',1);txt(s,-151,y,10,400);txt(step>i?'1':'…',-8,y,11,600,C.blue);txt(step>i?(i===0?'2':i===2?'1':'0'):'…',48,y,11,600,C.blue);txt('…',108,y,11,400,C.muted);});
 const row=step%3;rect(29,332+row*31,54,25,'#1cb0f618',C.blue,3);
 ctx.beginPath();ctx.moveTo(-180,456);ctx.lineTo(180,456);ctx.lineTo(204,504);ctx.quadraticCurveTo(0,518,-204,504);ctx.closePath();ctx.fillStyle='#608394';ctx.fill();
 for(let row=0;row<3;row++)for(let col=0;col<12;col++)rect(-151+col*25,462+row*10,20,7,'#345767',null,2);
 rect(-38,494,76,11,'#90aebb',null,3);
 const typingSpeed=9+stress*10;
 const leftY=476+Math.sin(t*typingSpeed)*3,rightY=476+Math.sin(t*typingSpeed+2)*3;
 daniArm([-138,154],[-175,283],[-89,leftY],{width:48});daniArm([138,154],[175,283],[90,rightY],{width:48});
 for(const [x,y]of [[-89,leftY],[90,rightY]]){for(let i=0;i<3;i++)line(x-11+i*9,y-2,x-9+i*9,y+12,'#e9b18b',5);}
 // A visible paper rests beside the keyboard to show transcription.
 ctx.save();ctx.translate(-214,327);ctx.rotate(-.11);rect(-25,0,64,109,'#f3f7f8','#9ab4c0',3);txt('2–1',7,28,14,700,'#315365','center');for(let i=0;i<4;i++)line(-14,49+i*12,28,49+i*12,'#9cb4c0',1.3);ctx.restore();
 ctx.restore();
}
function daniPhone(t){
 const px=108,py=97,pw=170,ph=291;
 // Present the entire handset to the viewer.
 daniArm([137,161],[191,302],[204,360],{width:50});rect(px,py,pw,ph,'#070f14','#85a5b5',22);
 rect(px+8,py+10,pw-16,ph-20,C.bg,null,16);
 ctx.save();ctx.beginPath();ctx.roundRect(px+9,py+10,pw-18,ph-20,15);ctx.clip();ctx.translate(px+9,py+10);ctx.scale((pw-18)/390,(ph-20)/660);publicView();ctx.restore();
 rect(px+60,py+13,50,7,'#070f14',null,4);
 circle(px+pw-5,py+ph-42,19,'#d49a74');
 // Free hand gestures toward the finished work, palm open.
 daniArm([-138,164],[-185,277],[-210,203],{width:50});
 for(let i=0;i<4;i++)line(-225+i*8,200,-227+i*8,177-Math.sin(i)*4,'#d49a74',7);
}
function character(t,x,y,s=1,options={}){
 if(typeof options==='boolean')options={mode:options?'phone':'writing',stress:options?0:.25};
 const {mode='writing',stress=0,reaction=0}=options;
 const happy=mode==='phone',u=clamp(stress),r=clamp(reaction),breathe=Math.sin(t*2.8)*1.4;
 ctx.save();ctx.translate(x,y+breathe);ctx.scale(s,s);
 // Legs/jacket retain the brand palette, with shoulders rising under pressure.
 ctx.lineCap='round';line(-62,367,-75,588,'#09151b',65);line(62,367,79,588,'#09151b',65);
 rect(-122,578,93,33,'#6f8e9d',null,16);rect(31,578,98,33,'#6f8e9d',null,16);
 const shoulder=-u*10;
 ctx.beginPath();ctx.moveTo(-67,95);ctx.bezierCurveTo(-121,98,-161,125+shoulder,-173,199);ctx.lineTo(-124,405);ctx.quadraticCurveTo(0,442,126,405);ctx.lineTo(174,199);ctx.bezierCurveTo(160,126+shoulder,120,98,67,95);ctx.closePath();ctx.fillStyle='#254756';ctx.fill();ctx.strokeStyle='#567c8e';ctx.lineWidth=2.8;ctx.stroke();
 line(0,113,0,403,'#85c7df',3);line(-130,169,-108,310,C.blue,5);line(130,169,109,310,C.blue,5);
 rect(-64,160,64,70,'#d9edf1',null,7);txt('DANI',-32,184,14,700,'#254756','center');txt('LIGA',-32,206,10,600,'#567e8d','center');
 // Expressive face, larger whites/irises, brows, mouth and forehead creases.
 rect(-29,52,58,67,'#bb7b56',null,16);
 ctx.save();ctx.translate(r*3,shoulder*.3);ctx.rotate((happy?-.025:u*.025)+Math.sin(t*27)*r*.026);
 circle(-94,-5,18,'#d49a74');circle(94,-5,18,'#d49a74');
 ctx.beginPath();ctx.moveTo(-92,-64);ctx.bezierCurveTo(-83,-143,86,-143,95,-62);ctx.lineTo(88,19);ctx.bezierCurveTo(73,110,-73,110,-88,19);ctx.closePath();ctx.fillStyle='#d49a74';ctx.fill();
 ctx.beginPath();ctx.moveTo(-95,-12);ctx.bezierCurveTo(-126,-100,-48,-157,28,-136);ctx.bezierCurveTo(92,-143,125,-83,95,-16);ctx.lineTo(76,-52);ctx.quadraticCurveTo(43,-43,12,-81);ctx.quadraticCurveTo(-29,-28,-79,-48);ctx.closePath();ctx.fillStyle='#071820';ctx.fill();
 const wide=happy?0:u*.35+r*.45,eyeH=11+wide*9,blink=(t%4.1)>3.96&&r<.1;
 const gazeX=happy?0:mode==='typing'?(u>.1?8:0):1,gazeY=happy?0:mode==='writing'?5:u>.1?0:6;
 for(const ex of [-38,38]){
   if(blink){ctx.beginPath();ctx.moveTo(ex-17,1);ctx.quadraticCurveTo(ex,happy?8:3,ex+17,1);ctx.strokeStyle='#253c46';ctx.lineWidth=5;ctx.stroke();}
   else{ctx.beginPath();ctx.ellipse(ex,1,19,eyeH,0,0,Math.PI*2);ctx.fillStyle='#f4f5ec';ctx.fill();circle(ex+gazeX,1+gazeY,8+wide*1.5,'#29464f');circle(ex+gazeX+1,2+gazeY,4,'#071820');circle(ex+gazeX-2,-1+gazeY,2,'#fff');}
 }
 // Worried inner brows and raised surprise are clearly readable.
 const inner=-26-u*15-r*10,outer=-28+r*-9;
 ctx.beginPath();ctx.moveTo(-59,outer);ctx.quadraticCurveTo(-41,-34-r*9,-20,inner);ctx.moveTo(20,inner);ctx.quadraticCurveTo(42,-34-r*9,59,outer);ctx.strokeStyle='#132f3a';ctx.lineWidth=7;ctx.lineCap='round';ctx.stroke();
 if(u>.3){ctx.save();ctx.globalAlpha=u*.55;ctx.beginPath();ctx.moveTo(-21,-55);ctx.quadraticCurveTo(0,-61,22,-55);ctx.moveTo(-16,-67);ctx.quadraticCurveTo(0,-71,16,-67);ctx.strokeStyle='#9f634b';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-7,30);ctx.quadraticCurveTo(0,34,9,29);ctx.strokeStyle='#aa6c4e';ctx.lineWidth=3;ctx.stroke();
 if(happy){ctx.beginPath();ctx.moveTo(-32,49);ctx.quadraticCurveTo(0,65,33,48);ctx.quadraticCurveTo(0,94,-32,49);ctx.closePath();ctx.fillStyle='#683f34';ctx.fill();ctx.beginPath();ctx.moveTo(-27,52);ctx.quadraticCurveTo(0,64,28,51);ctx.lineTo(21,62);ctx.quadraticCurveTo(0,70,-21,62);ctx.closePath();ctx.fillStyle='#fff5e8';ctx.fill();}
 else if(r>.35){ctx.beginPath();ctx.ellipse(0,58,12+u*4,9+r*7,0,0,Math.PI*2);ctx.fillStyle='#794635';ctx.fill();}
 else{ctx.beginPath();ctx.moveTo(-28,57+u*6);ctx.quadraticCurveTo(-3,62-u*40,28,57+u*7);ctx.strokeStyle='#754634';ctx.lineWidth=4.5;ctx.stroke();}
 if(u>.55){const p=(t*.8)%1;ctx.save();ctx.globalAlpha=u*.8*(1-p);ctx.beginPath();ctx.moveTo(80,-40+24*p);ctx.quadraticCurveTo(95,-14+24*p,82,-12+24*p);ctx.quadraticCurveTo(69,-17+24*p,80,-40+24*p);ctx.fillStyle='#9fe2f5';ctx.fill();ctx.restore();}
 ctx.restore();
 if(mode==='writing'){
   daniArm([-137,164],[-173,281],[-124,333],{width:49});daniClipboard(t);
   const p=(t*1.4)%1,wx=-87+p*115,wy=433+Math.sin(p*32)*3;
   daniArm([137,163],[169,260],[wx+26,wy-24],{width:49});
   line(wx+34,wy-56,wx,wy,'#132c3a',7);line(wx+4,wy-7,wx,wy,'#b4d6e3',4);
 }else if(mode==='typing')daniLaptop(t,u);else daniPhone(t);
 ctx.restore();
 window.DANI_FRAME={mode,stress:u,reaction:r,props:mode==='writing'?['paper','pen']:mode==='typing'?['laptop','paper']:['phone','bracket-ui'],appOnPhone:mode==='phone'};
}
