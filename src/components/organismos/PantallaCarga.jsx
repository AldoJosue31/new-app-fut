import { APP_NAME } from "../../lib/brand.js";
import styles from "./PantallaCarga.module.css";

// The pen strokes follow the artwork in the mark's native 128 × 128 coordinates.
const rim = "M19 122.4 Q13.6 122.4 13.6 117 V10.8 Q13.6 5.6 19 5.6 H68.5 C94 5.6 110.9 20.8 110.9 39.6 C110.9 50.3 106.3 58.4 98.3 64 C108.1 70.4 113.4 80.6 113.4 92.4 C113.4 111 98.8 122.4 76.4 122.4 Z";
const face = "M19 117 V10.9 H68.5 C90.8 10.9 105.3 23.5 105.3 39.6 C105.3 50.9 99.2 59.4 86.7 64.3 C100.9 68 107.9 79.3 107.9 92.4 C107.9 108.1 95 117 76.4 117 Z";
const hourglass = "M36.2 23.6 H83.7 Q87.3 23.6 86.1 26.8 L66.7 53.9 C74.5 58.8 74.5 69 66.7 74.1 L87.2 103.1 Q88.7 106.2 85.4 106.2 H36.1 Q32.6 106.2 34.4 103.1 L53.4 74.1 C45.2 69 45.1 59 53.4 53.9 L34.5 26.8 Q32.6 23.6 36.2 23.6 Z";
const flame = "M57.5 48.2 C54.2 42.5 56.2 37.5 60 32.8 C64.6 38.1 65.8 43.5 62.2 48.2 L60.6 48.1 Q62.3 43.9 60 39.6 Q57.6 43.8 59.4 48.1 Z";

export function PantallaCarga() {
  return (
    <div className={styles.screen} data-loading-screen="" role="status">
      <svg className={styles.mark} viewBox="-8 -8 144 144" aria-hidden="true" focusable="false">
        <g className={styles.lines} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className={styles.rim} d={rim} pathLength="1" />
          <path className={styles.face} d={face} pathLength="1" />
          <path className={styles.hourglass} d={hourglass} pathLength="1" />
          <g className={styles.details}>
            <path d={flame} pathLength="1" />
            <circle cx="60" cy="64" r="9" pathLength="1" />
            <circle cx="60" cy="64" r="2.7" pathLength="1" />
            <path d="M60 55 V61.3 M68.4 60.6 L62.5 63 M65.5 71.1 L61.6 66.1 M54.4 71.1 L58.4 66.1 M51.6 60.6 L57.5 63" pathLength="1" />
            <path d="M54.9 85.2 V89.3 H65.3 V85.2 M60.1 89.3 V97 M54.9 101.8 V97 H65.3 V101.8" pathLength="1" />
            <circle cx="60.1" cy="93.3" r="1.2" pathLength="1" />
          </g>
        </g>
        <image className={styles.artwork} href="/bracket-unity-loading-mark.webp" width="128" height="128" />
        <g className={styles.light} fill="none" strokeLinecap="round">
          <path className={styles.halo} d={rim} />
          <path className={styles.spark} d={rim} pathLength="1" />
        </g>
      </svg>
      <span className={styles.caption}>Cargando {APP_NAME}…</span>
    </div>
  );
}
