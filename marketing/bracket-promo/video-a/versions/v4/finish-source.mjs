import fs from 'node:fs';
const file=new URL('composition.js',import.meta.url);let code=fs.readFileSync(file,'utf8');
for(const[a,b]of[
 ["text('Configuración',155,593,39,700)","text('Configurar Reglas',155,593,39,700)"],
 ["button('Guardar Cambios',510,1332,410", "button('Guardar Configuración',465,1332,455"],
 ["const p=ease(seg(t,0,.55));", "const p=ease(seg(t,0,.35));"],
 ["ctx.drawImage(logo,158,542,74,74);text('Copa de Barrio',261,581,43,700);text('Primera',261,641,28,400,C.muted);box(149,730,190,64,C.pale,'#84d8ff',16);text('Tabla',244,762,29,600,C.deep,'center');text('Goleadores',492,762,29,600,C.muted,'center');", "text('Temporada Copa de Barrio',540,581,43,700,C.ink,'center');text('Primera | Jornada 1',540,651,28,400,C.muted,'center');box(149,730,317,64,C.pale,'#84d8ff',16);text('Tabla General',308,762,29,600,C.deep,'center');text('Goleadores',651,762,29,600,C.muted,'center');"],
 ["text('Liga de Barrio',540,1518,26,400,C.muted,'center');", ""],
]){if(!code.includes(a))throw new Error('Missing edit: '+a.slice(0,50));code=code.replace(a,b);}
fs.writeFileSync(file,code);
const cueFile=new URL('cues.json',import.meta.url);const cues=JSON.parse(fs.readFileSync(cueFile,'utf8'));cues.find(c=>c.type==='hover_or_small_ui').t=43.15;fs.writeFileSync(cueFile,JSON.stringify(cues,null,2));
console.log('Final label fidelity and timing refinements applied.');
