import React from 'react';
import { Cursor, ease, typed, cue, held, glide } from '../vendor/html-demo/StepWindow';
import { Planning, ResultModal, Standings, ExportModal, Toast } from './ui';
import AIM from './aims.json';

// All times are local seconds. Consequences follow clicks by 100 ms.
// The coordinates are regenerated from [data-aim] DOM bounds by scripts/verify.mjs.
export const TIMES = {
  jornada: { grid: 1.1, list: 2.8, result: 4.05, loaded: 4.7 },
  goles: { local: 1, fillLocal: 2.15, goal: 3.3, typeFrom: 3.4, typeTo: 3.55, visit: 4.85, fillVisit: 6.1 },
  guardar: { save: 1, confirm: 2.7, done: 3.65 },
  tabla: { tab: 1.15, ready: 1.8 },
  exportar: { open: 1.15, ready: 1.85 },
};
const point = (from, to, name) => [from, to, ...AIM[name]];
const rest = [0, 0, 1110, 635];
function Pointer({ t, path, clicks, fadeAt }) {
  const cursor = glide(t, path, clicks);
  return <div className="br-pointerlayer" style={{ opacity: 1 - ease(t, fadeAt, fadeAt + .3) }}><Cursor {...cursor} /></div>;
}
export function Jornada({ t }) {
  const T = TIMES.jornada;
  const mode = cue(t, [[T.grid + .1, 'grid'], [T.list + .1, 'list'], [T.result + .1, 'result']], 'list');
  return <><Planning grid={mode === 'grid'} press={held(t, T.result, .18)} />
    {mode === 'result' && <ResultModal t={t} loading={t < T.loaded ? 'Procesando datos...' : ''} reveal={ease(t, T.result + .1, T.result + .3)} />}
    <Pointer t={t} path={[rest, point(.1, .7, 'grid'), point(1.8, 2.4, 'list'), point(3.05, 3.65, 'result')]} clicks={[T.grid, T.list, T.result]} fadeAt={4.75} />
  </>;
}
export function Goles({ t }) {
  const T = TIMES.goles;
  const tab = cue(t, [[T.local + .1, 'local'], [T.visit + .1, 'visit']], 'general');
  const goal = t < T.typeFrom ? '0' : typed('1', t, T.typeFrom, T.typeTo);
  const pressed = held(t, T.fillLocal, .18) || held(t, T.fillVisit, .18) ? 'autofill' : '';
  return <><Planning /><ResultModal tab={tab} filledLocal={t >= T.fillLocal + .1} filledVisit={t >= T.fillVisit + .1} goal={goal} focusGoal={t >= T.goal + .1 && t < 3.85} pressed={pressed} />
    <Toast t={t} from={T.fillLocal + .1} to={T.fillVisit + .1} message="Se agregaron 7 titulares segun asistencias." />
    <Toast t={t} from={T.fillVisit + .1} to={10.2} message="Se agregaron 7 titulares segun asistencias." />
    <Pointer t={t} path={[rest, point(0, .6, 'result-local'), point(1.15, 1.75, 'autofill'), point(2.3, 2.9, 'goal'), point(3.85, 4.45, 'result-visit'), point(5.05, 5.7, 'autofill')]} clicks={[T.local, T.fillLocal, T.goal, T.visit, T.fillVisit]} fadeAt={6.35} />
  </>;
}
export function Guardar({ t }) {
  const T = TIMES.guardar;
  const saved = t >= T.done;
  return <><Planning saved={saved} />{!saved && <ResultModal tab="visit" filledLocal filledVisit goal="1" confirm={t >= T.save + .1} saving={t >= T.confirm + .1} t={t} pressed={held(t, T.save, .18) ? 'save' : held(t, T.confirm, .18) ? 'confirm' : ''} />}
    <Toast t={t} from={-1.8} to={2.2} message="Se agregaron 7 titulares segun asistencias." />
    <Toast t={t} from={T.done} to={T.done + 4} message="Resultado guardado correctamente." />
    <Pointer t={t} path={[rest, point(.05, .6, 'save'), point(1.65, 2.3, 'confirm'), [3.1, 3.7, 1100, 630]]} clicks={[T.save, T.confirm]} fadeAt={3.8} />
  </>;
}
export function Tabla({ t }) {
  const T = TIMES.tabla;
  return <>{t < T.tab + .1 ? <Planning saved /> : <Standings skeleton={t < T.ready} />}
    <Toast t={t} from={-1.85} to={2.15} message="Resultado guardado correctamente." />
    <Pointer t={t} path={[rest, point(.1, .75, 'tab-standings'), [1.9, 2.55, 1100, 630]]} clicks={[T.tab]} fadeAt={2.6} />
  </>;
}
export function Exportar({ t }) {
  const T = TIMES.exportar;
  return <><Standings />{t >= T.open + .1 && <ExportModal t={t} loading={t < T.ready} reveal={ease(t, T.open + .1, T.open + .3)} />}
    <Pointer t={t} path={[rest, point(.1, .75, 'export'), [1.65, 2.3, 1135, 635]]} clicks={[T.open]} fadeAt={2.3} />
  </>;
}
export const STEPS = [
  { id: 'jornada', name: 'Jornada', dur: 6, View: Jornada },
  { id: 'goles', name: 'Goles', dur: 8, View: Goles },
  { id: 'guardar', name: 'Guardar', dur: 5.5, View: Guardar },
  { id: 'tabla', name: 'Clasificación', dur: 4.5, View: Tabla },
  { id: 'exportar', name: 'Exportar', dur: 4, View: Exportar },
];
