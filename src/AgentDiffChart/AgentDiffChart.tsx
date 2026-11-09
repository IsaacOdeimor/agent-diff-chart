import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import './AgentDiffChart.css';
import { Chart } from './Chart';
import { SESSION, type AgentSession } from './data';
import { Footer } from './Footer';
import { Header } from './Header';
import {
  useElementWidth,
  useFontsReady,
  useReducedMotion,
  useResolvedTheme,
  useSessionClock,
  type ThemeSetting,
} from './hooks';
import { eventForHover, fileById, formatClock, totalsAt, validateSession } from './model';
import { computeLayout, DESIGN_WIDTH, makeScales } from './scales';
import { Timeline } from './Timeline';
import { PLAYBACK_SECONDS } from './tokens';
import { Tooltip } from './Tooltip';

if (import.meta.env.DEV) {
  const problems = validateSession(SESSION);
  if (problems.length) console.warn('[AgentDiffChart] example data problems:', problems);
}

export interface AgentDiffChartProps {
  session?: AgentSession;
  /** Wall-clock seconds the autoplay takes (simulated time runs separately). */
  playbackSeconds?: number;
  /** 'system' follows prefers-color-scheme. The reference look is 'dark'. */
  theme?: ThemeSetting;
  /**
   * In containers wider than the 571px design width the card scales up
   * uniformly (keeping its proportions) up to this factor.
   */
  maxScale?: number;
}

export function AgentDiffChart({
  session = SESSION,
  playbackSeconds = PLAYBACK_SECONDS,
  theme = 'system',
  maxScale = 1.6,
}: AgentDiffChartProps) {
  const fitRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);

  // Below the design width the layout reflows; above it the card scales up.
  const available = useElementWidth(fitRef, DESIGN_WIDTH);
  const layoutWidth = Math.min(available, DESIGN_WIDTH);
  const scale = available > DESIGN_WIDTH ? Math.min(maxScale, available / DESIGN_WIDTH) : 1;
  const offsetX = Math.max(0, (available - layoutWidth * scale) / 2);

  const layout = useMemo(() => computeLayout(layoutWidth, session.files.length), [layoutWidth, session.files.length]);
  const scales = useMemo(() => makeScales(layout, session), [layout, session]);
  const resolvedTheme = useResolvedTheme(theme);

  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const { t, done } = useSessionClock({
    duration: session.duration,
    playbackSeconds,
    ready: fontsReady,
    skip: reduced,
  });

  const totals = totalsAt(session.events, t);
  const currentFile = fileById(session, (totals.current ?? session.events[0]).fileId);

  // Inspection is available once the session has completed.
  const [hoverT, setHoverT] = useState<number | null>(null);
  const activeHoverT = done ? hoverT : null;
  const hoverEvent = activeHoverT === null ? null : eventForHover(session.events, activeHoverT);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const tt = scales.tAt((e.clientX - rect.left) / scale);
      setHoverT(Math.max(0, Math.min(session.duration, tt)));
    },
    [scales, scale, session.duration],
  );
  // Mouse: the crosshair follows the pointer and leaves with it.
  // Touch: a tap or horizontal drag pins it; a tap anywhere else clears it.
  const onPointerLeave = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') setHoverT(null);
  }, []);
  useEffect(() => {
    if (hoverT === null) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (e.pointerType === 'touch' && !hitRef.current?.contains(e.target as Node)) setHoverT(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [hoverT]);

  const summary = `${session.agent}, ${session.pr}: +${session.expected.additions} −${session.expected.removals} lines across ${session.expected.files} files in ${session.events.length} edits over ${formatClock(session.duration)}.`;

  const cardStyle = {
    width: layout.width,
    height: layout.height,
    transform: scale !== 1 || offsetX ? `translateX(${offsetX}px) scale(${scale})` : undefined,
    '--adc-size-axis': `${layout.axisFont}px`,
    '--adc-size-track': `${layout.trackFont}px`,
  } as CSSProperties;

  return (
    <div className="adc-fit" ref={fitRef} style={{ height: layout.height * scale }}>
      <section
        ref={cardRef}
        className={`adc${reduced ? ' is-reduced' : ''}`}
        data-theme={resolvedTheme}
        style={cardStyle}
        aria-label={summary}
      >
        <Header
          session={session}
          layout={layout}
          totals={totals}
          currentFile={currentFile}
          done={done}
          reduced={reduced}
        />
        <Timeline
          session={session}
          layout={layout}
          scales={scales}
          t={t}
          activeFileId={hoverEvent?.fileId ?? null}
          fontsReady={fontsReady}
        />
        <Chart session={session} layout={layout} scales={scales} t={t} done={done} hoverT={activeHoverT} />
        <div
          className="adc-axis-labels"
          style={{ top: layout.axisLabelTop, left: layout.plotLeft, width: layout.plotRight - layout.plotLeft }}
          aria-hidden="true"
        >
          {Array.from({ length: session.axisDuration / 60 + 1 }, (_, i) => (
            <span key={i}>{formatClock(i * 60)}</span>
          ))}
        </div>
        <Footer layout={layout} net={totals.net} />
        {hoverEvent && (
          <Tooltip event={hoverEvent} file={fileById(session, hoverEvent.fileId)} layout={layout} scales={scales} />
        )}
        <div
          ref={hitRef}
          className={`adc-hit${done ? ' is-live' : ''}`}
          style={{
            left: layout.plotLeft - 4,
            width: layout.plotRight - layout.plotLeft + 8,
            top: layout.crossTop,
            height: layout.crossBottom - layout.crossTop,
          }}
          onPointerMove={done ? onPointerMove : undefined}
          onPointerDown={done ? onPointerMove : undefined}
          onPointerLeave={onPointerLeave}
        />
      </section>
    </div>
  );
}
