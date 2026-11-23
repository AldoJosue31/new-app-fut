// Read-only provenance capture; writes only this campaign's research snapshot.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspace = fileURLToPath(new URL('../../../', import.meta.url));
const here = fileURLToPath(new URL('./', import.meta.url));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const describe = relative => ({
  path: relative,
  sha256: hash(path.join(workspace, relative)),
  bytes: readFileSync(path.join(workspace, relative)).length,
});
const logo = readFileSync(path.join(workspace, 'public/logo_app.png'));
const assets = [
  'public/logo_app.png',
  'public/logo_gen.png',
  'public/fonts/poppins/poppins-latin-400.woff2',
  'public/fonts/poppins/poppins-latin-600.woff2',
  'public/fonts/poppins/poppins-latin-700.woff2',
  'public/fonts/poppins/OFL.txt',
].map(describe);
assets[0].png = { width: logo.readUInt32BE(16), height: logo.readUInt32BE(20), colorType: logo[25] };

const files = [
  'package.json',
  'app/layout.jsx',
  'src/lib/auth/routeAccess.js',
  'src/lib/navigation/routes.js',
  'src/styles/themes.jsx',
  'src/styles/GlobalStyles.jsx',
  'src/styles/variables.jsx',
  'src/hooks/pages/useLigaLogic.js',
  'src/hooks/pages/useTorneosLogic.js',
  'src/components/template/PartidosTemplate.jsx',
  'src/components/template/TorneosTemplate.jsx',
  'src/components/organismos/tabs/torneos/JornadaPlanificacion.jsx',
  'src/components/organismos/tabs/torneos/planificacion/ResultModal.jsx',
  'src/components/organismos/tabs/torneos/planificacion/result_modal_components/CedulaScanFlow.jsx',
  'src/components/organismos/tabs/torneos/TorneosStandingsTab.jsx',
  'src/components/organismos/tabs/torneos/exports/standings/StandingsExportModal.jsx',
  'src/components/organismos/equipos/DelegateTeamOverview.jsx',
  'src/server/api/handlers/delegates/teamTournament.js',
  'src/services/torneos/mutations.js',
  'src/utils/standingsSnapshot.js',
  'src/server/public/publicPageData.js',
  'src/views/PublicStandings.jsx',
  'supabase/functions/procesar-cedula/index.ts',
  'supabase/migrations/20260711211528_add_safe_public_tournament_bundle.sql',
  'supabase/migrations/20260919205300_atomic_match_result_save.sql',
].map(describe);
const decisions = {
  'explainer-default': 'Video A after approval',
  'explainer-high-energy': 'Video B after approval',
  'explainer-engaging': 'Optional Video C after explicit inclusion',
  'sound-effects': 'One postproduction pass after approval',
  'motion-broll': 'Evaluated, no base video with transcript',
  'object-separation': 'Evaluated, no filmed subject to isolate',
};
const skills = Object.entries(decisions).map(([name, decision]) => {
  const file = path.join('C:/Users/Aldo/.agents/skills', name, 'SKILL.md');
  return { name, path: file, sha256: hash(file), decision };
});
const ui = JSON.parse(readFileSync(path.join(here, 'ui-results.json'), 'utf8'));
const unitLog = readFileSync(path.join(here, 'unit-tests.log'), 'utf8');
const stats = ['tests', 'pass', 'fail', 'skipped'].reduce((acc, key) => {
  acc[key] = Number(unitLog.match(new RegExp(`(?:ℹ|#) ${key} (\\d+)`))?.[1] ?? NaN);
  return acc;
}, {});
const snapshot = {
  research_session_date: '2026-11-06',
  user_timezone: 'America/Mexico_City',
  status: 'Research and planning only; no animation or audiovisual render produced',
  git_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim(),
  browser_build_id: readFileSync(path.join(workspace, '.next/BUILD_ID'), 'utf8').trim(),
  assets,
  inspected_core_sources: files,
  skills,
  verification: {
    selected_node_tests: stats,
    existing_browser_suite: {
      passed: 14,
      scope: 'tests/e2e/tournament-views.spec.js on desktop and mobile Chromium',
      evidence: 'First execution output; its JSON was replaced by the subsequent editorial checks',
    },
    editorial_browser_checks: {
      passed: ui.stats.expected,
      failed: ui.stats.unexpected,
      skipped: ui.stats.skipped,
      scope: 'Classification/export and result/scanner entry; desktop and mobile Chromium',
      report: 'ui-results.json',
    },
    environment: 'Local existing production build, synthetic auth and data transports',
    remote_write_operations: false,
    remote_ocr_invoked: false,
    valid_public_tournament_opened_remotely: false,
  },
};
writeFileSync(path.join(here, 'research-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');

// Check only relative links in the campaign's Markdown; URLs and fragments are excluded.
const docs = [
  'README.md', '01-investigacion.md', '02-direccion-creativa.md',
  '03-video-a-storyboard.md', '04-video-b-storyboard.md',
  '05-video-c-opcional.md', '06-produccion-y-calidad.md',
];
const missing = [];
for (const name of docs) {
  const file = path.join(here, '..', name);
  const text = readFileSync(file, 'utf8');
  for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue;
    const clean = target.split('#')[0];
    if (clean && !existsSync(path.resolve(path.dirname(file), clean))) missing.push({ name, target });
  }
}
if (missing.length) throw new Error(`Broken campaign links: ${JSON.stringify(missing)}`);
if (stats.tests !== 159 || stats.fail !== 0 || ui.stats.expected !== 4 || ui.stats.unexpected !== 0) {
  throw new Error('Verification totals differ from the written proposal.');
}
console.log(JSON.stringify({ logo: assets[0], node: stats, editorial: snapshot.verification.editorial_browser_checks, markdown_links: 'valid' }, null, 2));
