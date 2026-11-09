import type { FileIconKind } from './data';

/** Four-point sparkle centred on (cx, cy). */
function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.16;
  return [
    `M${cx},${cy - r}`,
    `Q${cx + k},${cy - k} ${cx + r},${cy}`,
    `Q${cx + k},${cy + k} ${cx},${cy + r}`,
    `Q${cx - k},${cy + k} ${cx - r},${cy}`,
    `Q${cx - k},${cy - k} ${cx},${cy - r}Z`,
  ].join(' ');
}

/** Restrained, generic agent mark (the reference icon is indistinct). */
export function AgentMark() {
  return (
    <svg className="adc-avatar-mark" viewBox="0 0 29 29" aria-hidden="true">
      <path d={sparkle(13.2, 13.4, 5.2)} className="adc-avatar-star" />
      <path d={sparkle(18.6, 18.8, 2.3)} className="adc-avatar-star adc-avatar-star--small" />
    </svg>
  );
}

export function FileIcon({ kind }: { kind: FileIconKind }) {
  return (
    <svg className="adc-file-icon" viewBox="0 0 10 10" aria-hidden="true">
      {kind === 'code' && (
        <>
          <rect x="0.5" y="0.5" width="9" height="9" rx="2" className="adc-file-icon-bg" />
          <path d="M4 3.4 2.6 5 4 6.6M6 3.4 7.4 5 6 6.6" className="adc-file-icon-glyph" />
        </>
      )}
      {kind === 'image' && (
        <>
          <rect x="0.5" y="0.5" width="9" height="9" rx="2" className="adc-file-icon-bg" />
          <circle cx="3.4" cy="3.6" r="0.9" className="adc-file-icon-fill" />
          <path d="M1.6 7.6 4 5.2l1.6 1.5 1.2-1 1.6 1.9Z" className="adc-file-icon-fill" />
        </>
      )}
      {kind === 'test' && (
        <>
          <path d="M3.3 0.6h3.4v1H3.3Z" className="adc-file-icon-flask-neck" />
          <path
            d="M3.9 1.6h2.2v2.5l2.6 4.3c.3.5-.1 1.1-.7 1.1H2c-.6 0-1-.6-.7-1.1l2.6-4.3Z"
            className="adc-file-icon-flask"
          />
        </>
      )}
    </svg>
  );
}
