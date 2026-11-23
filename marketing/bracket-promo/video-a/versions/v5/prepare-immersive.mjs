import fs from 'node:fs';
const here=new URL('./',import.meta.url);
let original=fs.readFileSync(new URL('versions/a-v1-relajado.js',here),'utf8');
const cameraFunctions=original.slice(original.indexOf('function framing('),original.indexOf('function render('));
original=original.slice(0,original.indexOf('const scenes=['));
original=original.replace("const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false});", "const canvas=document.getElementById('film');let ctx=canvas.getContext('2d',{alpha:false});");
original=original.replace("function camera(scale=1,dx=0,dy=0){", "function camera(scale=1,dx=0,dy=0){scale=Math.min(scale,1.18);");
// Maintain the same real UI controls and deterministic interaction functions.
original=original.replace("text('Demostración ilustrativa · lectura resumida',540,1600,29,400,C.muted,'center');", "");
fs.writeFileSync(new URL('ui-scenes.js',here),original+'\n'+cameraFunctions+"\nlet logo=new Image();logo.src=LOGO_SOURCE;\n");
console.log('Prepared original UI functions for the immersive compositor.');
