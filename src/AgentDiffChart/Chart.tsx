import { useId, useMemo } from 'react';
import type { AgentSession } from './data';
import { seriesPoints, seriesValueAt } from './model';
import type { Layout, Scales } from './scales';
import { DITHER, RIPPLE_SIM_SECONDS } from './tokens';

interface ChartProps {
  session: AgentSession;
  layout: Layout;
  scales: Scales;
  /** Simulated session time of the playhead. */
  t: number;
  done: boolean;
  /** Simulated time under the pointer, or null when not hovering. */
  hoverT: number | null;
}

type Tone = 'add' | 'rem';
type Pt = readonly [number, number];

const LEVELS = DITHER.bayer.length * DITHER.bayer[0].length;
const TILE = DITHER.cell * DITHER.bayer.length;

function linePath(pts: readonly Pt[]): string {
  return 'M' + pts.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join('L');
}

function areaPath(pts: readonly Pt[], zeroY: number): string {
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${linePath(pts)}L${last[0].toFixed(2)},${zeroY}L${first[0].toFixed(2)},${zeroY}Z`;
}

const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);

/** One pattern per dither level: a single dot placed by the Bayer matrix. */
function DitherPatterns({ uid, tone, originX, originY }: { uid: string; tone: Tone; originX: number; originY: number }) {
  const out = [];
  for (let k = 0; k < LEVELS; k++) {
    let cx = 0;
    let cy = 0;
    DITHER.bayer.forEach((row, j) =>
      row.forEach((rank, i) => {
        if (rank === k) {
          cx = i;
          cy = j;
        }
      }),
    );
    out.push(
      <pattern
        key={k}
        id={`${uid}-${tone}-${k}`}
        width={TILE}
        height={TILE}
        x={originX}
        y={originY}
        patternUnits="userSpaceOnUse"
      >
        <rect
          className={`adc-dot adc-dot--${tone}`}
          x={cx * DITHER.cell}
          y={cy * DITHER.cell + 1}
          width={DITHER.dot}
          height={DITHER.dot}
        />
      </pattern>,
    );
  }
  return <>{out}</>;
}

/**
 * Ordered-dither dot fill. Dot density rises linearly from the baseline (none)
 * to the series' current extreme (full grid), giving the reference's sparse-
 * near-zero / dense-near-the-line texture. Each level is a horizontal band
 * filled with its pattern and clipped to the area.
 */
function DitherFill({
  uid,
  tone,
  clipId,
  x0,
  x1,
  zeroY,
  extremeY,
}: {
  uid: string;
  tone: Tone;
  clipId: string;
  x0: number;
  x1: number;
  zeroY: number;
  extremeY: number;
}) {
  const span = zeroY - extremeY;
  if (Math.abs(span) < 1 || x1 <= x0) return null;
  const bands = [];
  for (let k = 0; k < LEVELS; k++) {
    const threshold = zeroY - ((k + 0.5) / LEVELS) * span;
    const top = Math.min(threshold, extremeY) - 2;
    const height = Math.abs(threshold - extremeY) + 4;
    bands.push(
      <rect key={k} x={x0} y={top} width={x1 - x0} height={height} fill={`url(#${uid}-${tone}-${k})`} />,
    );
  }
  return <g clipPath={`url(#${clipId})`}>{bands}</g>;
}

function yLabel(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

export function Chart({ session, layout, scales, t, done, hoverT }: ChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { x, y, zeroY } = scales;
  const { events } = session;

  const paths = useMemo(() => {
    const toXY = (pts: Array<[number, number]>, sign: 1 | -1): Pt[] =>
      pts.map(([tt, v]) => [x(tt), y(sign * v)] as const);
    const add = toXY(seriesPoints(events, 'additions', t), 1);
    const rem = toXY(seriesPoints(events, 'removals', t), -1);
    const net = toXY(seriesPoints(events, 'net', t), 1);
    return {
      addLine: linePath(add),
      addArea: areaPath(add, zeroY),
      remLine: linePath(rem),
      remArea: areaPath(rem, zeroY),
      netLine: linePath(net),
      addExtremeY: Math.min(...add.map((p) => p[1])),
      remExtremeY: Math.max(...rem.map((p) => p[1])),
    };
  }, [events, t, x, y, zeroY]);

  const head = {
    x: x(t),
    add: y(seriesValueAt(events, 'additions', t)),
    rem: y(-seriesValueAt(events, 'removals', t)),
    net: y(seriesValueAt(events, 'net', t)),
  };

  const ripples = done
    ? []
    : events.flatMap((e) => {
        const age = (t - e.t) / RIPPLE_SIM_SECONDS;
        if (age < 0 || age >= 1) return [];
        // Rings spawn where the jump lands (rises end exactly at the event time).
        const settle = e.t;
        const r = 3 + 6.5 * easeOut(age);
        const opacity = 0.5 * (1 - age);
        const rings = [];
        if (e.additions > 0)
          rings.push({ key: `a${e.t}`, tone: 'add', cx: x(settle), cy: y(seriesValueAt(events, 'additions', settle)), r, opacity });
        if (e.removals > 0)
          rings.push({ key: `r${e.t}`, tone: 'rem', cx: x(settle), cy: y(-seriesValueAt(events, 'removals', settle)), r, opacity });
        return rings;
      });

  const ticks = [];
  for (let s = 0; s <= session.axisDuration; s += 10) {
    const major = s % 60 === 0;
    const tx = Math.round(x(s) * 2) / 2;
    ticks.push(
      <line
        key={s}
        className={`adc-axis-tick${major ? ' is-major' : ''}${s <= t ? ' is-reached' : ''}`}
        x1={tx}
        x2={tx}
        y1={layout.axisTickTop}
        y2={layout.axisTickTop + (major ? 6.5 : 4)}
      />,
    );
  }

  const hover =
    hoverT === null
      ? null
      : {
          x: x(hoverT),
          add: y(seriesValueAt(events, 'additions', hoverT)),
          rem: y(-seriesValueAt(events, 'removals', hoverT)),
          net: y(seriesValueAt(events, 'net', hoverT)),
        };

  const patternOriginY = Math.round(zeroY);

  return (
    <svg className="adc-svg" width={layout.width} height={layout.height} aria-hidden="true">
      <defs>
        <DitherPatterns uid={uid} tone="add" originX={layout.plotLeft} originY={patternOriginY} />
        <DitherPatterns uid={uid} tone="rem" originX={layout.plotLeft} originY={patternOriginY} />
        <clipPath id={`${uid}-add-clip`}>
          <path d={paths.addArea} />
        </clipPath>
        <clipPath id={`${uid}-rem-clip`}>
          <path d={paths.remArea} />
        </clipPath>
      </defs>

      {/* y grid + labels */}
      {session.yTicks.map((v) =>
        v === 0 ? null : (
          <line key={v} className="adc-grid" x1={layout.plotLeft} x2={layout.plotRight} y1={y(v)} y2={y(v)} />
        ),
      )}
      {session.yTicks.map((v) => (
        <text key={v} className={`adc-ylabel${v === 0 ? ' is-zero' : ''}`} x={layout.yLabelRight} y={y(v)} dy="0.34em">
          {yLabel(v)}
        </text>
      ))}

      {/* dotted areas */}
      <path className="adc-area adc-area--add" d={paths.addArea} />
      <path className="adc-area adc-area--rem" d={paths.remArea} />
      <DitherFill
        uid={uid}
        tone="add"
        clipId={`${uid}-add-clip`}
        x0={layout.plotLeft}
        x1={head.x}
        zeroY={zeroY}
        extremeY={paths.addExtremeY}
      />
      <DitherFill
        uid={uid}
        tone="rem"
        clipId={`${uid}-rem-clip`}
        x0={layout.plotLeft}
        x1={head.x}
        zeroY={zeroY}
        extremeY={paths.remExtremeY}
      />

      <line className="adc-zero" x1={layout.plotLeft} x2={layout.plotRight} y1={zeroY} y2={zeroY} />

      {/* cumulative paths */}
      <path className="adc-net" d={paths.netLine} />
      <path className="adc-line adc-line--rem" d={paths.remLine} />
      <path className="adc-line adc-line--add" d={paths.addLine} />

      {ripples.map((r) => (
        <circle key={r.key} className={`adc-ripple adc-ripple--${r.tone}`} cx={r.cx} cy={r.cy} r={r.r} opacity={r.opacity} />
      ))}

      {/* playhead + heads (shrink to plain end dots on completion) */}
      <g className={`adc-heads${done ? ' is-done' : ''}`}>
        <line className="adc-playhead" x1={head.x} x2={head.x} y1={head.add} y2={head.rem} />
        <circle className="adc-halo adc-halo--add" cx={head.x} cy={head.add} r={5.5} />
        <circle className="adc-halo adc-halo--rem" cx={head.x} cy={head.rem} r={5.5} />
        <circle className="adc-halo adc-halo--net" cx={head.x} cy={head.net} r={5} />
        <circle className="adc-head adc-head--net" cx={head.x} cy={head.net} r={2.4} />
        <circle className="adc-head adc-head--rem" cx={head.x} cy={head.rem} r={3} />
        <circle className="adc-head adc-head--add" cx={head.x} cy={head.add} r={3} />
      </g>

      {hover && (
        <g className="adc-hover">
          <line className="adc-crosshair" x1={hover.x} x2={hover.x} y1={layout.crossTop} y2={layout.crossBottom} />
          <circle className="adc-hover-dot adc-hover-dot--net" cx={hover.x} cy={hover.net} r={2.4} />
          <circle className="adc-hover-dot adc-hover-dot--rem" cx={hover.x} cy={hover.rem} r={4.2} />
          <circle className="adc-hover-dot adc-hover-dot--add" cx={hover.x} cy={hover.add} r={4.2} />
        </g>
      )}

      {ticks}
    </svg>
  );
}
