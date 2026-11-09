/**
 * Non-color design tokens shared by TS code. Colors, type sizes and the rest of
 * the visual tokens live as CSS custom properties at the top of AgentDiffChart.css.
 */

/** Canvas font for measuring file-track labels; must match `--adc-font-mono`. */
export const trackLabelFont = (sizePx: number) => `400 ${sizePx}px "Geist Mono", ui-monospace, monospace`;

/** Wall-clock seconds for the autoplay to go from empty to complete. */
export const PLAYBACK_SECONDS = 11.3;

/** Dither fill: Bayer-ordered dots on a 2px grid (8px super-tile, 16 levels). */
export const DITHER = {
  cell: 2,
  dot: 1,
  bayer: [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ],
} as const;

/** Ripple ring spawned at the head when a series jumps, in simulated seconds. */
export const RIPPLE_SIM_SECONDS = 16;
