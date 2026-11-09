import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCED_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export type ThemeSetting = 'system' | 'light' | 'dark';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Resolves 'system' against prefers-color-scheme and follows changes to it. */
export function useResolvedTheme(setting: ThemeSetting): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(
    () => typeof window === 'undefined' || window.matchMedia(DARK_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  if (setting !== 'system') return setting;
  return systemDark ? 'dark' : 'light';
}

/** Resolves once web fonts are usable (or after a short fallback timeout). */
export function useFontsReady(timeoutMs = 1500): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    const timer = window.setTimeout(done, timeoutMs);
    document.fonts?.ready.then(done, done);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [timeoutMs]);
  return ready;
}

export function useElementWidth(ref: RefObject<HTMLElement>, fallback: number): number {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width) || fallback);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return width;
}

interface ClockOptions {
  /** Simulated session length in seconds. */
  duration: number;
  /** Wall-clock seconds the playback takes from empty to complete. */
  playbackSeconds: number;
  /** Playback waits until this is true (e.g. fonts loaded). */
  ready: boolean;
  startDelayMs?: number;
  /** Skip playback and show the completed state. */
  skip: boolean;
}

/**
 * Drives simulated session time from requestAnimationFrame. Media time and
 * simulated time are separate: `duration` sim-seconds play over `playbackSeconds`.
 */
export function useSessionClock({ duration, playbackSeconds, ready, startDelayMs = 250, skip }: ClockOptions) {
  const [t, setT] = useState(skip ? duration : 0);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (skip) {
      setT(duration);
      return;
    }
    // Resume from wherever playback is (never replays once complete).
    const from = tRef.current;
    if (!ready || from >= duration) return;
    const speed = duration / playbackSeconds;
    let raf = 0;
    let start: number | null = null;
    const delay = window.setTimeout(() => {
      const frame = (now: number) => {
        if (start === null) start = now;
        const next = Math.min(duration, from + ((now - start) / 1000) * speed);
        setT(next);
        if (next < duration) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, startDelayMs);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [duration, playbackSeconds, ready, startDelayMs, skip]);

  return { t, done: t >= duration };
}
