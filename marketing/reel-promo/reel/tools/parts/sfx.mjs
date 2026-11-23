// ───────────────────────── sonido ─────────────────────────
// Efectos con causa en pantalla (tiempos globales). Las tomas se alternan.
const SFX = [];
const add = (file, t, dur, vol = 0.6) => SFX.push({ file, t: +t.toFixed(3), dur, vol });
let wk = 0;
const whoosh = (t, vol = 0.3, dur = 0.5) => add(wk++ % 2 ? "whoosh-2.mp3" : "whoosh-1.mp3", t, dur, vol);
// chat
LLEGA.forEach((t, i) => add("notificacion.mp3", t, 0.15, i % 2 ? 0.3 : 0.38));
add("clic.mp3", 6.7, 0.12, 0.9);
whoosh(6.76, 0.45);
// resultado
const R0 = 7.5;
whoosh(R0 + 0.15, 0.22); add("clic.mp3", R0 + 0.85, 0.12, 0.8); whoosh(R0 + 0.95, 0.25); whoosh(R0 + 1.4, 0.32);
add("clic-2.mp3", R0 + 1.95, 0.3, 0.55); add("clic-2.mp3", R0 + 2.4, 0.3, 0.55);
whoosh(R0 + 2.8, 0.22); add("clic-2.mp3", R0 + 3.42, 0.3, 0.8); whoosh(R0 + 3.52, 0.28); whoosh(R0 + 3.95, 0.3);
whoosh(R0 + 4.45, 0.3); add("clic.mp3", R0 + 5.0, 0.12, 0.7);
// reglas
const G0 = 13;
whoosh(G0 + 0.0, 0.22); whoosh(G0 + 0.35, 0.22); add("clic.mp3", G0 + 1.3, 0.12, 0.75); add("clic.mp3", G0 + 2.2, 0.12, 0.75);
// exportar
const X0 = 16;
whoosh(X0 + 0.0, 0.22); whoosh(X0 + 0.5, 0.32);
[1.05, 1.32, 1.59, 1.86, 2.13, 2.42].forEach((t) => whoosh(X0 + t, 0.2, 0.3));
whoosh(X0 + 2.95, 0.22); add("clic.mp3", X0 + 3.45, 0.12, 0.8);
add("impacto.mp3", X0 + 3.6, 1.0, 0.45); whoosh(X0 + 4.12, 0.5);
// delegado
const D0 = 20.5;
whoosh(D0 + 0.05, 0.32); whoosh(D0 + 1.75, 0.22); whoosh(D0 + 2.35, 0.32);
[0, 0.14, 0.28].forEach((d) => add("clic.mp3", D0 + 3.1 + d, 0.12, 0.35));
whoosh(D0 + 4.3, 0.22); whoosh(D0 + 4.58, 0.3);
// liguilla
const L0 = 25.5;
whoosh(L0 + 0.0, 0.3); add("clic.mp3", L0 + 0.8, 0.12, 0.8); whoosh(L0 + 1.25, 0.18, 0.6); whoosh(L0 + 3.1, 0.25);
add("impacto.mp3", L0 + 3.5, 2.0, 0.95); add("obturador.mp3", L0 + 3.5, 0.5, 0.25);
// final
const F0 = 30;
whoosh(F0 + 0.1, 0.28); whoosh(F0 + 0.2, 0.3);
add("notificacion.mp3", F0 + 0.95, 0.3, 0.38); add("notificacion.mp3", F0 + 1.2, 0.3, 0.3);
whoosh(F0 + 3.0, 0.35); add("impacto.mp3", F0 + 3.35, 1.4, 0.4);

