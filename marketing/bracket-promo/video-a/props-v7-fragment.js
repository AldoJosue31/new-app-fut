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
 daniArm([-138,154],[-175,306],[-91,ly],{width:48});
 daniArm([138,154],[206,292],[208,ry],{width:48});
 for(let i=0;i<3;i++){line(-102+i*9,ly-2,-100+i*9,ly+10,'#e9b18b',5);line(197+i*8,ry-2,199+i*8,ry+10,'#e9b18b',5);}
 // Rear casing, slightly turned in perspective; no mirrored display or keyboard.
 ctx.beginPath();ctx.moveTo(-181,302);ctx.quadraticCurveTo(-182,292,-171,291);ctx.lineTo(161,278);ctx.quadraticCurveTo(173,278,175,291);ctx.lineTo(193,475);ctx.quadraticCurveTo(194,487,182,488);ctx.lineTo(-154,502);ctx.quadraticCurveTo(-166,503,-167,491);ctx.closePath();ctx.fillStyle='#587785';ctx.fill();ctx.strokeStyle='#9cb3bf';ctx.lineWidth=3;ctx.stroke();
 line(-166,303,160,290,'#7e9aa8',2);line(-154,486,179,473,'#365664',2);
 // Unbranded matte rear cover with a hinge, not an outward-facing spreadsheet.
 ctx.beginPath();ctx.moveTo(-151,314);ctx.lineTo(147,302);ctx.lineTo(160,455);ctx.lineTo(-136,467);ctx.closePath();ctx.fillStyle='#648492';ctx.fill();
 line(-147,497,177,484,'#23424f',7);
 // The reference sheet lies flat beside the far-side keyboard, oriented to Dani.
 ctx.save();ctx.transform(1,-.16,.3,.46,-232,430);rect(0,0,69,111,'#f1f5f5','#a4bdc9',3);
 ctx.translate(69,111);ctx.rotate(Math.PI);txt('2–1',34,27,14,700,'#315365','center');for(let i=0;i<4;i++)line(10,47+i*12,58,47+i*12,'#9cb4c0',1.4);ctx.restore();
 ctx.restore();
}
