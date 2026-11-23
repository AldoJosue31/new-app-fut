import fs from 'node:fs';
const file=new URL('composition.js',import.meta.url);
let code=fs.readFileSync(file,'utf8');
function swap(a,b){if(!code.includes(a))throw new Error('Missing edit target: '+a.slice(0,70));code=code.replace(a,b);}
swap("const included=i<2||t>(i===2?.9:1.75);const y=904+i*105;", "const included=i<2||t>(i===2?.9:1.75);const shift=i===2?60*(1-ease(seg(t,.9,1.25))):i===3?60*(1-ease(seg(t,1.75,2.1))):0;const y=904+i*105+shift;");
swap("icon(included?'check':'plus',872,y+29,28,included?C.blue:C.muted);", "icon(included?'close':'plus',872,y+29,25,included?C.muted:C.blue);");
swap("button('Siguiente: Sorteo',480,1362", "if(n<4)text('No Participantes',150,904+n*105+20,23,600,C.muted);button('Siguiente: Sorteo',480,1362");
swap("[[0,883,1125],[.9,883,1125],[1.25,883,1229],[1.75,883,1229]", "[[0,883,1219],[.9,883,1219],[1.25,883,1324],[1.75,883,1324]");
swap("button(t>=5.4?'Jornada confirmada':'Confirmar Jornada',460,1506,485,{pressed:t>5.1&&t<5.3,iconName:'check'});", "if(t<5.4)button('Confirmar Jornada',460,1506,485,{pressed:t>5.1&&t<5.3,iconName:'check'});else{box(145,1495,790,80,C.pale,'#84d8ff',18);icon('check',172,1520,28);text('Jornada confirmada correctamente',224,1536,28,600,C.deep);}");
swap("button(t>3.3?'Descargado':'Descargar',531,1455,400,{pressed:t>2.8&&t<3,iconName:t>3.3?'check':'download'});", "button('Descargar',531,1455,400,{pressed:t>2.8&&t<3,iconName:'download'});");
swap("function render(t){", `function framing(s,t){
  if(s.a===7){camera(kf([[0,1],[.65,1.1],[1.8,1.1],[3.3,1]])(t),0,kf([[0,0],[.7,60],[1.8,35],[3.2,0]])(t));return;}
  if(s.a===17){camera(kf([[0,.98],[.9,1.08],[2,1.08],[3.3,1]])(t),0,kf([[0,0],[1,35],[2.2,35],[3.3,0]])(t));return;}
  if(s.a===20.5){camera(kf([[0,1],[1.1,1.1],[2.1,1.1],[3.7,1],[6.3,1]])(t),kf([[0,0],[1.2,45],[2.2,45],[3.7,0]])(t),kf([[0,0],[1.3,-95],[2.2,-95],[3.7,0]])(t));return;}
  if(s.a===41){camera(kf([[0,1],[1.3,1.09],[3,1.09],[4.8,1]])(t),-20* Math.sin(Math.PI*clamp(t/5)),-25*Math.sin(Math.PI*clamp(t/5)));return;}
  if(s.a===46){camera(kf([[0,1],[1.7,1.06],[2.5,1.06],[3.8,1]])(t));return;}
  camera(1+.025*Math.sin(Math.PI*clamp(t/(s.b-s.a))));
}
function render(t){`);
swap("const z=1+.018*Math.sin(Math.PI*clamp(local/(s.b-s.a)));camera(z,0,0);", "framing(s,local);");
fs.writeFileSync(file,code);
console.log('Applied camera framing and real-state refinements.');
