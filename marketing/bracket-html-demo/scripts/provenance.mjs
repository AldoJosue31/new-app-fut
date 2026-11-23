import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const files=[
  'package.json','PRODUCT.md','DESIGN.md',
  'src/lib/navigation/routes.js','src/lib/navigation/tournamentRoutes.js','src/lib/auth/routeAccess.js',
  'src/views/Torneos.jsx','src/views/Equipos.jsx','src/views/Liga.jsx','src/views/Home.jsx','src/views/Partidos.jsx','src/views/PublicStandings.jsx',
  'src/hooks/pages/useTorneosLogic.js','src/hooks/pages/useEquiposLogic.js','src/hooks/pages/useLigaLogic.js','src/hooks/usePlanificacionMatches.js','src/hooks/useFixturePreview.js','src/hooks/useTorneoStandingsLogic.js',
  'src/store/EquiposStore.jsx','src/store/JugadoresStore.jsx',
  'src/components/template/TorneosTemplate.jsx','src/components/template/EquiposTemplate.jsx','src/components/template/LigaTemplate.jsx','src/components/template/PartidosTemplate.jsx',
  'src/styles/themes.jsx','src/styles/variables.jsx','src/styles/GlobalStyles.jsx',
  'src/components/organismos/sidebar/Sidebar.jsx','src/components/moleculas/TabsNavigation.jsx','src/components/moleculas/Btnsave.jsx',
  'src/components/organismos/equipos/DynamicTeamLogo.jsx',
  'src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx','src/components/organismos/tabs/torneos/TorneosStandingsTab.jsx',
  ...['PlanningHeader.jsx','PlanningSidebar.jsx','ScheduledMatchRow.jsx','WeeklyGridView.jsx','ResultModal.jsx'].map(x=>'src/components/organismos/tabs/torneos/planificacion/'+x),
  ...['ScoreHeader.jsx','GeneralTab.jsx','RosterTab.jsx','ConfirmResultOverlay.jsx','CedulaScanFlow.jsx','CedulaPhotoFlow.jsx'].map(x=>'src/components/organismos/tabs/torneos/planificacion/result_modal_components/'+x),
  'src/components/organismos/tabs/torneos/subcomponents/StandingsTable.jsx',
  ...['StandingsExportModal.jsx','StandingsExportLayout.jsx','standingsExportStyles.js'].map(x=>'src/components/organismos/tabs/torneos/exports/standings/'+x),
  'src/lib/notifications/policy.js','src/services/torneos/mutations.js','src/services/estadisticas.js',
  'src/utils/standingsSnapshot.js','src/utils/fixtureAlgorithms.js','src/utils/playoffUtils.js',
  'tests/e2e/tournament-views.spec.js','tests/e2e/fixtures/password-recovery-session.mjs','tests/e2e/fixtures/password-recovery-mock.mjs',
  'public/logo_app.png','public/fonts/poppins/poppins-latin-400.woff2','public/fonts/poppins/poppins-latin-600.woff2','public/fonts/poppins/poppins-latin-700.woff2','public/fonts/poppins/OFL.txt',
];
const labels={
  'src/components/template/TorneosTemplate.jsx':['Torneo','Jornadas','Clasificacion','Goleadores'],
  'src/components/organismos/tabs/torneos/planificacion/PlanningHeader.jsx':['Semana del','Pendientes'],
  'src/components/organismos/tabs/torneos/planificacion/PlanningSidebar.jsx':['Por Asignar','Todo asignado'],
  'src/components/organismos/tabs/torneos/planificacion/ScheduledMatchRow.jsx':['Resultado','Editar','Ver Cédula','Pre-Cédula','Aplazar','Deshacer'],
  'src/components/organismos/tabs/torneos/planificacion/WeeklyGridView.jsx':['Libre'],
  'src/components/organismos/tabs/torneos/planificacion/ResultModal.jsx':['Definir Resultado','Cargar cédula','Escanear cédula','Procesando datos...','Guardando resultado...','Guardar Marcador','Resultado guardado correctamente.','Se agregaron'],
  'src/components/organismos/tabs/torneos/planificacion/result_modal_components/RosterTab.jsx':['Auto-rellenar titulares','Limpiar todos','Goles / AG / Tarjetas','Seleccionar jugador...','Suplentes','Titulares (Minimo'],
  'src/components/organismos/tabs/torneos/planificacion/result_modal_components/GeneralTab.jsx':['Victoria por Default (W.O.)','Árbitro Principal (Opcional)','Sin árbitro asignado','Observaciones Adicionales (Opcional)'],
  'src/components/organismos/tabs/torneos/planificacion/result_modal_components/ConfirmResultOverlay.jsx':['¿Confirmar Marcador?','No se asignó un árbitro.','Puedes guardar así o volver a General para asignarlo.','Revisar','Sí, guardar'],
  'src/components/moleculas/Btnsave.jsx':['Guardando...'],
  'src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx':['Exportar Tabla General','Combinaciones','Personalizar','Colores de la liga','Cargando datos...'],
  'src/components/organismos/tabs/torneos/exports/standings/standingsExportStyles.js':['Clásica','Una combinación limpia que da prioridad a los resultados.'],
  'src/lib/notifications/policy.js':['Listo'],
};
const originals=[];const missing=[];
for(const file of files){
  const data=await readFile(path.join(root,file));
  const lines=data.toString('utf8').split(/\r?\n/);
  const verifiedLabels=(labels[file]||[]).map(text=>{
    const line=lines.findIndex(x=>x.includes(text))+1;
    if(!line)missing.push({file,text});
    return {text,line};
  });
  originals.push({file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,...(verifiedLabels.length?{labels:verifiedLabels}:{})});
}
const skillRoot='C:/Users/Aldo/.agents/skills/html-demo/';
const skillFiles=[];
for(const file of ['SKILL.md','references/contract.md','references/film.md','scripts/example-steps.jsx','scripts/StepWindow.jsx','scripts/step-window.css','scripts/shoot.mjs','demo/PROMPT.md']){
  const data=await readFile(skillRoot+file);skillFiles.push({file,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(new URL('../evidence/source-manifest.json',import.meta.url),JSON.stringify({originals,skill:{location:skillRoot,files:skillFiles},missing},null,2));
console.log(`${originals.length} original files, ${Object.values(labels).flat().length} sourced labels, ${missing.length} missing.`);
if(missing.length){console.log(missing);process.exitCode=1;}
