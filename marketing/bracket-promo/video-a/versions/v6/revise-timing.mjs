import fs from 'node:fs';
const file=new URL('composition.js',import.meta.url);let source=fs.readFileSync(file,'utf8');
for(const[a,b]of[
 ["sub(t,1.2,7.2,q=>scanner(q));sub(t,6.9,8.8,q=>resultPanel(q,true));","sub(t,1.2,6.45,q=>scanner(q));sub(t,6.2,8.8,q=>resultPanel(q,true));"],
 ["pressed:t>5.8&&t<6","pressed:t>4.75&&t<4.95"],
 ["[[3.2,850,801],[4.1,850,912],[4.6,850,1260],[5.2,718,1440],[6.2,718,1440]],[5.8]","[[3.2,850,801],[3.7,850,912],[4.1,850,1260],[4.55,718,1440],[5.3,718,1440]],[4.75]"],
 ["31.6 reading / 32.5 review / 35.2 applied","31.6 reading / 33.4 review / 35.2 applied"],
]){if(!source.includes(a))throw new Error('Missing edit target');source=source.replace(a,b);}
fs.writeFileSync(file,source);
const cues=[
 {t:.4,type:'movement',desc:'Apertura de línea azul'},
 {t:2.35,type:'reveal',desc:'Presentación del emblema oficial'},
 {t:7.55,type:'typing',dur:.85,desc:'Temporada Copa de Barrio'},
 {t:8.9,type:'click',desc:'Fecha de inicio'},
 {t:11.4,type:'click',desc:'Incluir Norte entre participantes'},
 {t:12.25,type:'click',desc:'Incluir Sur entre participantes'},
 {t:14,type:'click',desc:'Siguiente: Sorteo'},
 {t:17.45,type:'appear',desc:'Cruces de Jornada 1'},
 {t:19.75,type:'click',desc:'Confirmar Fixture'},
 {t:22.1,type:'click',desc:'Hora del partido 11:30'},
 {t:24.3,type:'click',desc:'Vista de grilla semanal'},
 {t:25.65,type:'click',desc:'Confirmar Jornada'},
 {t:29.8,type:'click',desc:'Abrir escáner de cédula'},
 {t:31.4,type:'click',desc:'Iniciar lectura ilustrativa'},
 {t:33.4,type:'success',desc:'Mostrar datos interpretados para revisar'},
 {t:34.95,type:'click',desc:'Aplicar escaneo revisado'},
 {t:36.4,type:'click',desc:'Guardar Marcador'},
 {t:37.65,type:'click',desc:'Sí, guardar marcador 2–1'},
 {t:38.1,type:'success',desc:'Resultado guardado correctamente'},
 {t:42.95,type:'hover_or_small_ui',desc:'Clasificación: Halcones 3 puntos'},
 {t:47,type:'click',desc:'Seleccionar Historia 9:16'},
 {t:48.85,type:'click',desc:'Descargar imagen de clasificación'},
 {t:50.75,type:'click',desc:'Activar acceso público'},
 {t:51.65,type:'click',desc:'Copiar enlace de consulta'},
 {t:52.3,type:'movement',desc:'Viaje hacia la consulta pública'},
 {t:55.8,type:'build_up',dur:1.55,desc:'Preparar cierre de marca'},
 {t:57.35,type:'reveal',desc:'Logo oficial y Más allá del amateur'},
];
fs.writeFileSync(new URL('cues.json',import.meta.url),JSON.stringify(cues,null,2));
const beats=[
 [0,2,'Antes del primer gol.','Gancho y firma original'],[2,5,'Bracket','Emblema original'],
 [5,7,'Tu liga. Tus reglas.','Título'],[7,10.5,'Temporada / Fecha de Inicio','Configuración de ejemplo'],
 [10.5,15,'Equipos del Torneo / Siguiente: Sorteo','Inclusión de equipos elegibles'],
 [15,17,'Dale forma a la jornada.','Título'],[17,20.5,'Editor de Fixture / Confirmar Fixture','Cruces válidos'],
 [20.5,27,'Jornada 1 / Hora del partido / Confirmar Jornada','Programación y grilla'],
 [27,29,'Del papel al marcador.','Título'],[29,39,'Escanear cédula / Aplicar escaneo / Guardar Marcador / Sí, guardar','Lectura ilustrativa resumida y revisión'],
 [39,41,'Que tu jornada se vea.','Título'],[41,46,'Clasificacion / PTS','Actualización editorial de tabla coherente'],
 [46,50,'Exportar Tabla General / Historia (9:16) / Descargar','Imagen de tabla'],
 [50,52.3,'Publico / Link / Copiado','Controles reales'],[52.3,54,'Tabla','Destino público ilustrativo'],
 [54,57,'Más allá del amateur','Eslogan del usuario'],[57,60,'Bracket · Más allá del amateur','Cierre del emblema original'],
].map(([start,end,text,visual])=>({start,end,text,visual}));
fs.writeFileSync(new URL('beat-sheet.json',import.meta.url),JSON.stringify(beats,null,2));
console.log('Corrected review/apply/save order and exported sound cues/beat sheet.');
