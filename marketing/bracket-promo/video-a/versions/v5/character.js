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
