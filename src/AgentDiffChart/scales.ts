import type { AgentSession } from './data';

/**
 * Geometry in CSS pixels. The reference clip is a 2× capture of a ~571×529 card,
 * so most values are the clip's pixel measurements halved. Everything that shares
 * the time axis (chart, file timeline, x-axis ticks, hover) uses the same `x()`.
 */
export const DESIGN_WIDTH = 571;
/** Below this width the header stats wrap and small text grows for legibility. */
const COMPACT_BELOW = 500;

/**
 * Plot height. The reference uses 167px with 72px of empty space under the
 * footer; 36px of that space is given to the plot so it reads at roughly twice
 * the height of the file tracks. The card's overall size is unchanged.
 */
const CHART_HEIGHT = 203;
const BOTTOM_PAD = 36;

export interface Layout {
  width: number;
  height: number;
  compact: boolean;
  padLeft: number;
  plotLeft: number;
  plotRight: number;
  headerTop: number;
  chartTop: number;
  chartBottom: number;
  /** Right edge of the y-axis labels. */
  yLabelRight: number;
  rowFirst: number;
  rowPitch: number;
  crossTop: number;
  crossBottom: number;
  axisTickTop: number;
  axisLabelTop: number;
  footerTop: number;
  tooltipTop: number;
  tooltipWidth: number;
  /** Mono sizes for axis labels and file-track labels. */
  axisFont: number;
  trackFont: number;
}

export function computeLayout(width: number, rows: number): Layout {
  const compact = width < COMPACT_BELOW;
  const headerExtra = compact ? 20 : 0;
  const chartTop = 102 + headerExtra;
  const chartBottom = chartTop + CHART_HEIGHT;
  const rowPitch = compact ? 17 : 14.42;
  const rowFirst = chartBottom + 30;
  const crossBottom = rowFirst + (rows - 1) * rowPitch + 9;
  const axisTickTop = crossBottom + 3.5;
  const axisLabelTop = axisTickTop + 14.5;
  const footerTop = axisLabelTop + 28.5;
  return {
    width,
    height: footerTop + 16 + BOTTOM_PAD,
    compact,
    padLeft: 19,
    plotLeft: 59,
    plotRight: width - 20,
    headerTop: 44,
    chartTop,
    chartBottom,
    yLabelRight: 49,
    rowFirst,
    rowPitch,
    crossTop: chartTop - 0.5,
    crossBottom,
    axisTickTop,
    axisLabelTop,
    footerTop,
    tooltipTop: chartTop + 3,
    tooltipWidth: Math.min(270, width - 16),
    axisFont: compact ? 10.6 : 9.9,
    trackFont: compact ? 10.8 : 9.7,
  };
}

export interface Scales {
  /** Session seconds → x. */
  x: (t: number) => number;
  /** Signed line count → y (removals are plotted as negative values). */
  y: (v: number) => number;
  /** x → session seconds. */
  tAt: (px: number) => number;
  zeroY: number;
  yMin: number;
  yMax: number;
}

/** 20% headroom above the final additions and below the final removals. */
const Y_HEADROOM = 1.2;

export function makeScales(layout: Layout, session: AgentSession): Scales {
  const { plotLeft, plotRight, chartTop, chartBottom } = layout;
  const span = plotRight - plotLeft;
  const yMax = session.expected.additions * Y_HEADROOM;
  const yMin = -session.expected.removals * Y_HEADROOM;
  const x = (t: number) => plotLeft + (t / session.axisDuration) * span;
  const y = (v: number) => chartTop + ((yMax - v) / (yMax - yMin)) * (chartBottom - chartTop);
  const tAt = (px: number) => ((px - plotLeft) / span) * session.axisDuration;
  return { x, y, tAt, zeroY: y(0), yMin, yMax };
}

export function rowCenter(layout: Layout, row: number): number {
  return layout.rowFirst + row * layout.rowPitch;
}
