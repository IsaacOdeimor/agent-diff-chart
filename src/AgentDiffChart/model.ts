import type { AgentSession, EditEvent, FileTrack } from './data';

/**
 * Every derived value (chart paths, header counters, timeline state, footer)
 * is a pure function of one simulated session time `t` in seconds.
 */

/**
 * Each cumulative jump eases in over this many simulated seconds and lands
 * exactly at its event time, so the new plateau begins at the event's tick.
 * Plateaus stay flat; the rise is a steep S-curve with rounded corners (~5px on
 * screen). This matches the reference, whose softened rises sit just ahead of
 * their timeline ticks.
 */
export const STEP_SECONDS = 2.5;
const STEP_SAMPLES = 10;

export type Series = 'additions' | 'removals' | 'net';

/** Smootherstep: flat at both ends, steep in the middle. */
const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (6 * u - 15) + 10));

function delta(e: EditEvent, series: Series): number {
  if (series === 'additions') return e.additions;
  if (series === 'removals') return e.removals;
  return e.additions - e.removals;
}

/** Cumulative value of a series at time `t` (removals are returned positive). */
export function seriesValueAt(events: readonly EditEvent[], series: Series, t: number): number {
  let v = 0;
  for (const e of events) {
    const start = e.t - STEP_SECONDS;
    if (start >= t) break;
    const d = delta(e, series);
    if (d !== 0) v += d * smoothstep((t - start) / STEP_SECONDS);
  }
  return v;
}

/** Sample points `[t, value]` describing a series from 0 up to `tEnd`. */
export function seriesPoints(
  events: readonly EditEvent[],
  series: Series,
  tEnd: number,
): Array<[number, number]> {
  const times: number[] = [0];
  for (const e of events) {
    const start = e.t - STEP_SECONDS;
    if (start >= tEnd) break;
    if (delta(e, series) === 0) continue;
    for (let k = 0; k <= STEP_SAMPLES; k++) {
      const tt = start + (k / STEP_SAMPLES) * STEP_SECONDS;
      if (tt > 0 && tt < tEnd) times.push(tt);
    }
  }
  times.push(tEnd);
  return times.map((tt) => [tt, seriesValueAt(events, series, tt)]);
}

export interface Totals {
  additions: number;
  removals: number;
  net: number;
  files: number;
  edits: number;
  /** Most recent event at or before `t` (null before the first edit). */
  current: EditEvent | null;
}

/** Discrete totals: an event counts once the playhead reaches its timestamp. */
export function totalsAt(events: readonly EditEvent[], t: number): Totals {
  let additions = 0;
  let removals = 0;
  let edits = 0;
  let current: EditEvent | null = null;
  const files = new Set<string>();
  for (const e of events) {
    if (e.t > t) break;
    additions += e.additions;
    removals += e.removals;
    edits += 1;
    files.add(e.fileId);
    current = e;
  }
  return { additions, removals, net: additions - removals, files: files.size, edits, current };
}

/** The event a hover at time `t` describes: the latest one at or before it. */
export function eventForHover(events: readonly EditEvent[], t: number): EditEvent | null {
  let found: EditEvent | null = null;
  for (const e of events) {
    if (e.t <= t + 0.5) found = e;
    else break;
  }
  return found ?? events[0] ?? null;
}

export function fileById(session: AgentSession, id: string): FileTrack {
  const f = session.files.find((file) => file.id === id);
  if (!f) throw new Error(`Unknown file id: ${id}`);
  return f;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface TrackState {
  file: FileTrack;
  row: number;
  /** Events of this file that have happened by `t`. */
  seen: EditEvent[];
  /** Visible portions of the activity intervals (grown up to the latest seen event). */
  segments: Array<{ start: number; end: number }>;
  /** Left and right extremes of what is drawn, used to place the label. */
  firstT: number;
  lastT: number;
}

export function trackStates(session: AgentSession, t: number): TrackState[] {
  const out: TrackState[] = [];
  session.files.forEach((file, row) => {
    const seen = session.events.filter((e) => e.fileId === file.id && e.t <= t);
    if (seen.length === 0) return;
    const segments: TrackState['segments'] = [];
    for (const [start, end] of file.activity) {
      const reached = seen.filter((e) => e.t >= start && e.t <= end);
      if (reached.length === 0) continue;
      const visibleEnd = Math.max(...reached.map((e) => e.t));
      segments.push({ start: Math.min(start, reached[0].t), end: Math.min(end, visibleEnd) });
    }
    out.push({
      file,
      row,
      seen,
      segments,
      firstT: Math.min(...seen.map((e) => e.t)),
      lastT: Math.max(...segments.map((s) => s.end), ...seen.map((e) => e.t)),
    });
  });
  return out;
}

/** Tick color on the file timeline: net-negative edits read red, binaries neutral. */
export function tickTone(e: EditEvent): 'add' | 'remove' | 'binary' {
  if (e.kind === 'binary') return 'binary';
  return e.removals > e.additions ? 'remove' : 'add';
}

/** Consistency checks for the example data; returns a list of problems. */
export function validateSession(session: AgentSession): string[] {
  const problems: string[] = [];
  const { events, files, expected } = session;
  for (let i = 1; i < events.length; i++) {
    if (events[i].t <= events[i - 1].t) problems.push(`events not strictly ordered at index ${i}`);
  }
  for (const e of events) {
    if (e.t < 0 || e.t > session.duration) problems.push(`event at ${e.t}s outside the session`);
    const file = files.find((f) => f.id === e.fileId);
    if (!file) {
      problems.push(`event at ${e.t}s references unknown file ${e.fileId}`);
      continue;
    }
    if (!file.activity.some(([s, end]) => e.t >= s && e.t <= end)) {
      problems.push(`event at ${e.t}s is outside every activity interval of ${file.name}`);
    }
    // Typed as literal 0, but data may come from untyped sources at runtime.
    const lines: number = e.additions + e.removals;
    if (e.kind === 'binary' && lines !== 0) {
      problems.push(`binary event at ${e.t}s has line counts`);
    }
    if (e.kind === 'text') {
      const plus = e.diff.filter((d) => d.op === '+').length;
      const minus = e.diff.filter((d) => d.op === '-').length;
      if (plus > e.additions || minus > e.removals) problems.push(`diff rows exceed counts at ${e.t}s`);
    }
  }
  const final = totalsAt(events, session.duration);
  if (final.additions !== expected.additions) problems.push(`additions ${final.additions} ≠ ${expected.additions}`);
  if (final.removals !== expected.removals) problems.push(`removals ${final.removals} ≠ ${expected.removals}`);
  if (final.files !== expected.files) problems.push(`files ${final.files} ≠ ${expected.files}`);
  if (final.edits !== expected.edits) problems.push(`edits ${final.edits} ≠ ${expected.edits}`);
  const settled = seriesValueAt(events, 'additions', session.duration);
  if (Math.abs(settled - final.additions) > 1e-9) problems.push('chart and counters disagree at the end');
  return problems;
}
