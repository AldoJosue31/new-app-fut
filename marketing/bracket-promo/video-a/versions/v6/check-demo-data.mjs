import fs from 'node:fs';
import { buildTorneoStandingsSnapshot } from '../../../src/utils/standingsSnapshot.js';
const equipos=['Halcones','Leones','Norte','Sur'].map((name,i)=>({id:i+1,name,status:'Activo'}));
const jornadas=[{id:1,tournament_id:1,name:'Jornada 1',status:'Confirmada'}];
const partidos=[
 {id:1,jornada_id:1,team1_id:1,team2_id:2,status:'Finalizado',date:'2026-11-09T11:30:00',goals1:2,goals2:1,puntos1:3,puntos2:0,jornadas:jornadas[0]},
 {id:2,jornada_id:1,team1_id:3,team2_id:4,status:'Finalizado',date:'2026-11-09T13:00:00',goals1:0,goals2:0,puntos1:1,puntos2:1,jornadas:jornadas[0]},
];
const torneo={id:1,season:'Copa de Barrio',config:{participatingIds:[1,2,3,4],winPoints:3,drawPoints:1,lossPoints:0,minPlayers:7,vueltas:'1',zonaLiguilla:false}};
const first=['Mateo','Diego','Alex','Luis','Marco','Raúl','Pablo'],last=['Ruiz','Luna','Ríos','Vega','Gil','Sol','Díaz'];
const players=equipos.flatMap(t=>first.map((name,i)=>({id:t.id*100+i,team_id:t.id,first_name:t.id===2&&i===0?'Iván':name,last_name:t.id===2&&i===0?'Soto':last[i],dorsal:i+1})));
const events=players.map(p=>({match_id:p.team_id<=2?1:2,player_id:p.id,event_type:'participation'})).concat([{match_id:1,player_id:100,event_type:'goal'},{match_id:1,player_id:100,event_type:'goal'},{match_id:1,player_id:200,event_type:'goal'},{match_id:1,player_id:101,event_type:'yellow_card'}]);
const snapshot=buildTorneoStandingsSnapshot({torneo,equipos,partidos,jornadasProp:jornadas});
const rows=snapshot.tablaGeneral.map(t=>({name:t.name||t.nombre,pj:t.pj,gf:t.gf,gc:t.gc,dg:t.dg,pts:t.pts}));
const points=rows.map(t=>t.pts);
if(JSON.stringify(points)!==JSON.stringify([3,1,1,0]))throw new Error('Unexpected points: '+JSON.stringify(rows));
if(events.filter(e=>e.player_id===100&&e.event_type==='goal').length!==2||events.filter(e=>e.player_id===200&&e.event_type==='goal').length!==1)throw new Error('Goal mismatch');
const verifiedPlayerStats=players.map(p=>{const ev=events.filter(e=>e.player_id===p.id);return {id:p.id,name:p.first_name+' '+p.last_name,team_id:p.team_id,matches:new Set(ev.map(e=>e.match_id)).size,goals:ev.filter(e=>e.event_type==='goal').length,yellow:ev.filter(e=>e.event_type==='yellow_card').length,red:0};});
if(verifiedPlayerStats.find(p=>p.id===101).yellow!==1||verifiedPlayerStats.find(p=>p.id===100).matches!==1)throw Error('Player data mismatch');
fs.mkdirSync(new URL('../assets/demo-data/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../assets/demo-data/competition.json',import.meta.url),JSON.stringify({illustrative:true,league:'Liga de Barrio',torneo,equipos,jornadas,partidos,players,events,verifiedStandings:rows,verifiedPlayerStats},null,2));
console.log(JSON.stringify({verifiedBy:'Actual Bracket standingsSnapshot.js',rows,players:players.length},null,2));
