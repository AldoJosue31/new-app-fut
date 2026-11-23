'use client';
import React, { useEffect, useState } from 'react';
import { RiPauseFill, RiPlayFill, RiReplay10Line, RiForward10Line, RiArrowGoBackLine } from 'react-icons/ri';
import StepWindow, { useStepClock } from '../vendor/html-demo/StepWindow';
import { STEPS } from './scenes';
import { STORY } from './data.mjs';

const time = n => `0:${String(Math.floor(n)).padStart(2, '0')}`;
export default function BracketDemo() {
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState(false);
  const clock = useStepClock(STEPS, { off: !ready });
  useEffect(() => {
    let alive = true;
    Promise.all([document.fonts.ready, new Promise(resolve => {
      const logo = new Image();
      logo.onload = resolve;
      logo.onerror = resolve;
      logo.src = '/logo_app.png';
    })]).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    // Official HTML Demo screenshot/scrubbing API.
    window.__hd = clock;
    window.__bracket = { steps: STEPS.map(({ id, name, dur }) => ({ id, name, dur })), ready };
  });
  function seek(value) {
    const seconds = Number(value); // Read before pause triggers a render.
    clock.pause();
    clock.seek(seconds);
  }
  const story = STORY[clock.i];
  return <div className={`br-page ${focus ? 'br-pagefocus' : ''}`}>
    <header className="br-pageheader"><a href="#demo" className="br-brand" aria-label="Bracket, ir a la demostración"><img src="/logo_app.png" width="39" height="39" alt="" /><span>Bracket</span></a><span className="br-headernote">Para quienes hacen que la liga funcione.</span><button type="button" className="br-focusbutton" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? 'Ver página completa' : 'Centrar demo'}</button></header>
    <main>
      <div className="br-intro"><h1>Una jornada,<br /><span>de principio a fin.</span></h1><p>Del calendario al marcador.<br />Del resultado a la clasificación.<br /><strong>Así se organiza una liga con Bracket.</strong></p></div>
      <section id="demo" className="br-demosection" aria-label="Demostración de Bracket">
        <div className="br-demometa"><span><i />Apertura Demo · Primera</span><span>Datos ficticios · 28 s</span></div>
        <StepWindow steps={STEPS} tabs={['Bracket · Apertura Demo']} label="Una jornada en Bracket" stageClass="br-stage" clock={clock} />
        <div className="br-controls">
          <button className="br-playbutton" type="button" aria-label={clock.still ? 'Movimiento reducido: estados finales' : clock.paused ? 'Reanudar demostración' : 'Pausar demostración'} disabled={clock.still} onClick={() => clock.paused ? clock.resume() : clock.pause()}>{clock.paused || clock.still ? <RiPlayFill /> : <RiPauseFill />}</button>
          <button type="button" className="br-skip" aria-label="Retroceder 5 segundos" onClick={() => seek(Math.max(0, clock.elapsed - 5))}><RiReplay10Line /><span>−5 s</span></button>
          <label className="br-scrub"><span className="br-sr-only">Posición de la demostración</span><input type="range" min="0" max={clock.total} step="0.01" value={clock.elapsed} onChange={e => seek(e.target.value)} aria-valuetext={`${time(clock.elapsed)} de ${time(clock.total)}`} style={{ '--progress': `${clock.elapsed / clock.total * 100}%` }} /></label>
          <button type="button" className="br-skip" aria-label="Avanzar 5 segundos" onClick={() => seek(Math.min(clock.total, clock.elapsed + 5))}><RiForward10Line /><span>+5 s</span></button>
          <span className="br-time">{time(clock.elapsed)} <span>/ {time(clock.total)}</span></span>
          <button type="button" className="br-restart" aria-label="Reiniciar demostración" onClick={() => { clock.play(0); clock.resume(); }}><RiArrowGoBackLine /></button>
        </div>
        <div className="br-caption" aria-live="polite" aria-atomic="true"><span className="br-chapter">{String(clock.i + 1).padStart(2, '0')} / 05</span><div><h2>{story.title}</h2><p>{story.detail}</p></div><span className="br-loopnote">{clock.still ? 'Movimiento reducido' : 'Reproducción en bucle'}</span></div>
      </section>
      <div className="br-footnote"><p>Una simulación de la interfaz de Bracket, con un mismo torneo y datos de demostración.</p><span>Jornadas → Resultados → Clasificación</span></div>
    </main>
    <footer className="br-pagefooter"><span>Bracket · Organización de ligas de fútbol</span><a href="#demo">Volver a la demo ↑</a></footer>
  </div>;
}
