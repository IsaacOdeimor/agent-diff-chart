import { useMemo } from 'react';
import type { AgentSession } from './data';
import { tickTone, trackStates } from './model';
import { rowCenter, type Layout, type Scales } from './scales';
import { trackLabelFont } from './tokens';

/** Distance from an activity endpoint to the start/end of its label. */
const LABEL_GAP = 10;

let measureCtx: CanvasRenderingContext2D | null = null;
function measureLabel(text: string, sizePx: number): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * sizePx * 0.6;
  measureCtx.font = trackLabelFont(sizePx);
  return measureCtx.measureText(text).width;
}

interface TimelineProps {
  session: AgentSession;
  layout: Layout;
  scales: Scales;
  t: number;
  /** File highlighted by the hover crosshair; other rows dim. */
  activeFileId: string | null;
  /** Re-measure labels once web fonts have loaded. */
  fontsReady: boolean;
}

export function Timeline({ session, layout, scales, t, activeFileId, fontsReady }: TimelineProps) {
  // `fontsReady` is a dependency on purpose: widths change once the web font loads.
  const labelWidths = useMemo(
    () => new Map(session.files.map((f) => [f.id, measureLabel(f.name, layout.trackFont)])),
    [session.files, layout.trackFont, fontsReady],
  );
  const tracks = trackStates(session, t);
  const { x } = scales;

  return (
    <div className="adc-timeline" aria-hidden="true">
      {tracks.map((track) => {
        const cy = rowCenter(layout, track.row);
        const w = labelWidths.get(track.file.id) ?? 0;
        // Label sits after the final activity endpoint; flips before the first
        // one when it would run past the plot; clamps (over a backdrop) if neither fits.
        const after = x(track.lastT) + LABEL_GAP;
        const before = x(track.firstT) - LABEL_GAP - w;
        let labelX = after;
        let clamped = false;
        if (after + w > layout.plotRight) {
          if (before >= layout.padLeft) labelX = before;
          else {
            labelX = Math.max(layout.padLeft, layout.plotRight - w);
            clamped = true;
          }
        }
        const state = activeFileId === null ? '' : activeFileId === track.file.id ? ' is-active' : ' is-dim';
        return (
          <div key={track.file.id} className={`adc-track${state}`}>
            {track.segments.map((seg, i) =>
              seg.end > seg.start ? (
                <span
                  key={i}
                  className="adc-track-bar"
                  style={{ left: x(seg.start), width: x(seg.end) - x(seg.start), top: cy - 2.5 }}
                />
              ) : null,
            )}
            {track.seen.map((e) => (
              <span
                key={e.t}
                className={`adc-track-tick adc-track-tick--${tickTone(e)}`}
                style={{ left: x(e.t), top: cy }}
              />
            ))}
            <span
              className={`adc-track-label${clamped ? ' is-clamped' : ''}`}
              style={{ transform: `translate(${labelX}px, ${cy}px)` }}
            >
              {track.file.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
