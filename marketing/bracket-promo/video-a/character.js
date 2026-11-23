/* V7 Dani: articulated paper/pen, laptop and final phone poses.
   Original vector artwork. Official PNG and real public UI inside final phone. */
function daniArm(a,b,c,{width=51,color='#254756'}={}){
 ctx.lineCap='round';line(a[0],a[1],b[0],b[1],color,width);line(b[0],b[1],c[0],c[1],color,width-5);
 circle(c[0],c[1],22,'#d49a74');
}
function daniClipboard(t){
 // We see the reverse: the writing surface points toward Dani, not the camera.
 ctx.save();ctx.beginPath();ctx.moveTo(-151,254);ctx.lineTo(117,224);ctx.quadraticCurveTo(127,223,128,234);ctx.lineTo(147,420);ctx.quadraticCurveTo(148,431,137,433);ctx.lineTo(-126,462);ctx.quadraticCurveTo(-138,464,-139,451);ctx.lineTo(-158,268);ctx.quadraticCurveTo(-160,255,-151,254);ctx.closePath();ctx.fillStyle='#c9d5d9';ctx.fill();ctx.strokeStyle='#7e99a5';ctx.lineWidth=3;ctx.stroke();
 // The sheet/front is hidden on the far side; only a thin paper edge is visible.
 line(-147,251,119,222,'#fafaf3',5);line(-132,456,138,427,'#a7bec8',2);
 // Rear fasteners and material, never readable writing on the back.
 circle(-27,252,3.5,'#819aa6');circle(9,248,3.5,'#819aa6');
 for(let i=0;i<4;i++)line(-101+i*43,378-i*5,-73+i*43,375-i*5,'#bdcbd0',1);
 ctx.restore();
}
function daniLaptop(t,stress){
 const open=outCubic(seg(t,T.transcribe-.1,T.transcribe+.2));ctx.save();ctx.globalAlpha*=open;
 // Dani sits behind the computer: keyboard far side, rear lid toward camera.
 // Draw the keyboard plane and hands first so the opaque lid correctly occludes them.
 ctx.beginPath();ctx.moveTo(-165,500);ctx.lineTo(192,486);ctx.lineTo(229,418);ctx.lineTo(-125,433);ctx.closePath();ctx.fillStyle='#8ca5b1';ctx.fill();ctx.strokeStyle='#b0c2ca';ctx.lineWidth=2;ctx.stroke();
 for(let row=0;row<3;row++)for(let col=0;col<10;col++){const x=-112+col*31+row*5,y=441+row*12-col*.04;rect(x,y,23,7,'#496675',null,2);}
 const speed=9+stress*10,ly=439+Math.sin(t*speed)*3,ry=435+Math.sin(t*speed+2)*3;
 daniArm([-138,154],[-166,302+Math.sin(t*speed)*2],[-91,ly],{width:48});
 daniArm([138,154],[166,302+Math.sin(t*speed+2)*2],[91,ry],{width:48});
 for(let i=0;i<3;i++){line(-102+i*9,ly-2,-100+i*9,ly+10,'#e9b18b',5);line(80+i*8,ry-2,82+i*8,ry+10,'#e9b18b',5);}
 // Reference sheet and hands are on Dani's side and are occluded by the lid.
 ctx.save();ctx.transform(1,-.16,.3,.46,-232,430);rect(0,0,69,111,'#f1f5f5','#a4bdc9',3);
 ctx.translate(69,111);ctx.rotate(Math.PI);txt('2–1',34,27,14,700,'#315365','center');for(let i=0;i<4;i++)line(10,47+i*12,58,47+i*12,'#9cb4c0',1.4);ctx.restore();
 // Rear casing, slightly turned in perspective; no mirrored display or keyboard.
 ctx.beginPath();ctx.moveTo(-181,302);ctx.quadraticCurveTo(-182,292,-171,291);ctx.lineTo(161,278);ctx.quadraticCurveTo(173,278,175,291);ctx.lineTo(193,475);ctx.quadraticCurveTo(194,487,182,488);ctx.lineTo(-154,502);ctx.quadraticCurveTo(-166,503,-167,491);ctx.closePath();ctx.fillStyle='#587785';ctx.fill();ctx.strokeStyle='#9cb3bf';ctx.lineWidth=3;ctx.stroke();
 line(-166,303,160,290,'#7e9aa8',2);line(-154,486,179,473,'#365664',2);
 // Unbranded matte rear cover with a hinge, not an outward-facing spreadsheet.
 // A single matte shell reads as a rear cover, not a blank outward-facing display.
 ctx.beginPath();ctx.moveTo(-164,303);ctx.lineTo(158,290);ctx.lineTo(167,304);ctx.lineTo(-155,318);ctx.closePath();ctx.fillStyle='#7392a0';ctx.fill();
 for(let i=0;i<8;i++)line(-91+i*24,474-i*.95,-78+i*24,473.5-i*.95,'#425f6d',1.4);
 line(-147,497,177,484,'#23424f',7);
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
   // Pen and writing hand work on the far surface; the board hides the tip.
   daniArm([-137,164],[-169,289],[-142,354],{width:49});
   const p=(t*1.4)%1,wx=27+p*72,wy=259+Math.sin(p*32)*2;
   daniArm([137,163],[162,207],[wx+19,wy-34],{width:49});
   line(wx+29,wy-63,wx,wy,'#132c3a',7);line(wx+4,wy-9,wx,wy,'#b4d6e3',4);
   daniClipboard(t);
   // Thumb wraps the board edge; no marks are drawn on the camera-facing back.
   circle(-139,352,11,'#d49a74');
 }else if(mode==='typing')daniLaptop(t,u);else daniPhone(t);
 ctx.restore();
 window.DANI_FRAME={mode,stress:u,reaction:r,props:mode==='writing'?['paper','pen']:mode==='typing'?['laptop','paper']:['phone','bracket-ui'],appOnPhone:mode==='phone',objectFacing:mode==='phone'?'camera':'dani',cameraSees:mode==='writing'?'paper-back':mode==='typing'?'laptop-lid-back':'app-screen'};
}
