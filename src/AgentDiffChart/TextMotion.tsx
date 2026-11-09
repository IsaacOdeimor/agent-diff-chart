import { useEffect, useRef, useState } from 'react';

const DIGITS = '0123456789'.split('');
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/**
 * Renders an already-derived integer with per-digit rolling transitions.
 * It never counts on its own: the value always comes from the session clock.
 */
export function RollingNumber({
  value,
  sign = 'none',
  className,
}: {
  value: number;
  sign?: 'plus' | 'minus' | 'auto' | 'none';
  className?: string;
}) {
  const abs = String(Math.abs(Math.round(value)));
  const prefix =
    sign === 'plus' ? '+' : sign === 'minus' ? '-' : sign === 'auto' ? (value < 0 ? '-' : '+') : '';
  const chars = abs.split('');
  return (
    <span className={`adc-roll ${className ?? ''}`}>
      <span className="adc-sr">{`${prefix}${abs}`}</span>
      {/* Always render a first item so the flex baseline is the text baseline. */}
      <span aria-hidden="true">{prefix || ZERO_WIDTH_SPACE}</span>
      {chars.map((d, i) => (
        // Keyed from the right so the ones column persists as the number grows.
        <span key={chars.length - i} className="adc-roll-col" aria-hidden="true">
          <span className="adc-roll-strip" style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
            {DIGITS.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * A monospace path ("dir/" muted + basename bright) that briefly scrambles and
 * resolves left-to-right when the file changes, as in the reference.
 */
export function ScramblePath({
  dir,
  name,
  reduced,
  durationMs = 360,
}: {
  dir: string;
  name: string;
  reduced: boolean;
  durationMs?: number;
}) {
  const full = dir + name;
  const [shown, setShown] = useState(full);
  const prev = useRef(full);

  useEffect(() => {
    if (prev.current === full) return;
    prev.current = full;
    if (reduced) {
      setShown(full);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs);
      const settled = Math.floor(u * full.length);
      let out = full.slice(0, settled);
      for (let i = settled; i < full.length; i++) {
        const c = full[i];
        out += c === '/' || c === '.' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setShown(u >= 1 ? full : out);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [full, reduced, durationMs]);

  return (
    <span className="adc-path">
      <span className="adc-sr">{full}</span>
      <span className="adc-path-dir" aria-hidden="true">
        {shown.slice(0, dir.length)}
      </span>
      <span className="adc-path-name" aria-hidden="true">
        {shown.slice(dir.length)}
      </span>
    </span>
  );
}
