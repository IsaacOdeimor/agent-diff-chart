import type { EditEvent, FileTrack } from './data';
import { FileIcon } from './icons';
import { formatClock } from './model';
import type { Layout, Scales } from './scales';

/** Gap between the hovered event's x and the tooltip edge anchored to it. */
const ANCHOR_GAP = 8;
const EDGE_MARGIN = 8;

/**
 * Tooltip placement (approximated from the clip; exact rules are not recoverable):
 * the tooltip hangs to the left of the event with its right edge just before it;
 * when that would leave the card's content area, its left edge sits at the same
 * anchor instead. Always clamped inside the card.
 */
export function tooltipLeft(layout: Layout, scales: Scales, event: EditEvent): number {
  const w = layout.tooltipWidth;
  const anchor = scales.x(event.t) - ANCHOR_GAP;
  const left = anchor - w >= layout.padLeft ? anchor - w : anchor;
  return Math.max(EDGE_MARGIN, Math.min(layout.width - EDGE_MARGIN - w, left));
}

export function Tooltip({
  event,
  file,
  layout,
  scales,
}: {
  event: EditEvent;
  file: FileTrack;
  layout: Layout;
  scales: Scales;
}) {
  return (
    <div
      className="adc-tooltip"
      role="tooltip"
      style={{ left: tooltipLeft(layout, scales, event), top: layout.tooltipTop, width: layout.tooltipWidth }}
    >
      <div className="adc-tt-head">
        <FileIcon kind={file.icon} />
        <span className="adc-tt-path">
          <span className="adc-tt-dir">{file.dir}</span>
          <span className="adc-tt-name">{file.name}</span>
        </span>
        <span className="adc-tt-time">{formatClock(event.t)}</span>
      </div>

      {event.kind === 'binary' ? (
        <>
          <div className="adc-tt-stats">
            <span className="adc-tt-binary">binary</span>
            <span className="adc-tt-badge">{event.binary.status}</span>
          </div>
          <div className="adc-diff">
            <div className="adc-diff-row adc-diff-row--meta">
              <span className="adc-diff-prefix" aria-hidden="true" />
              <code className="adc-diff-code">
                {event.binary.summary} · {event.binary.width} × {event.binary.height}
                {event.binary.truncated ? ' ·…' : ''}
              </code>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="adc-tt-stats">
            <span className="adc-tt-add">+{event.additions}</span>
            <span className="adc-tt-rem">-{event.removals}</span>
          </div>
          <div className="adc-diff">
            {event.diff.map((line, i) => (
              <div key={i} className={`adc-diff-row adc-diff-row--${line.op === '+' ? 'add' : 'del'}`}>
                <span className="adc-diff-prefix">{line.op}</span>
                <code className="adc-diff-code">{line.text}</code>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
