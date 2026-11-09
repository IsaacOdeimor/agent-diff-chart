/**
 * Example session for the agent diff chart.
 *
 * This is local mock data, not the original component's dataset (which is not
 * recoverable). Provenance of each value:
 *
 *  - `verified`: read directly from a hover tooltip in the reference recording
 *    (1:24 public/hero.png, 3:08 components/hero.tsx, 3:28 hero.test.tsx).
 *  - `approximated`: event time read from the tick position on the file timeline,
 *    line counts inferred from the header counters visible during playback.
 *    Diff fragments on these events are illustrative mock content.
 *
 * Diff `text` values are the *visible, already-truncated* fragments as they appear
 * in the tooltip (ending in "…" where the reference cuts them off). They are not
 * complete source lines and must not be read as such.
 */

export type FileIconKind = 'code' | 'image' | 'test';

export interface FileTrack {
  id: string;
  /** Basename shown on the timeline and in the header. */
  name: string;
  /** Directory prefix (with trailing slash) shown muted before the basename. */
  dir: string;
  icon: FileIconKind;
  /**
   * Activity intervals in session seconds. A file may have several; each one is
   * drawn as its own segment. Every edit event must fall inside one of them.
   */
  activity: ReadonlyArray<readonly [start: number, end: number]>;
}

export interface DiffLine {
  op: '+' | '-';
  /** Visible fragment, leading indentation preserved, truncated with "…". */
  text: string;
}

interface EditEventBase {
  /** Seconds since the session started. */
  t: number;
  fileId: string;
  provenance: 'verified' | 'approximated';
}

export interface TextEditEvent extends EditEventBase {
  kind: 'text';
  additions: number;
  removals: number;
  diff: DiffLine[];
}

export interface BinaryEditEvent extends EditEventBase {
  kind: 'binary';
  /** Binary files never contribute added/removed lines. */
  additions: 0;
  removals: 0;
  binary: {
    status: 'new file' | 'modified';
    summary: string;
    width: number;
    height: number;
    /** The reference cuts the metadata row off after the dimensions ("·…"). */
    truncated: boolean;
  };
}

export type EditEvent = TextEditEvent | BinaryEditEvent;

export interface AgentSession {
  agent: string;
  pr: string;
  /** Simulated session length in seconds (3:46). */
  duration: number;
  /** Length of the x axis in seconds (4:00). */
  axisDuration: number;
  /** Labelled horizontal levels; 0 is drawn as the baseline. */
  yTicks: number[];
  files: FileTrack[];
  events: EditEvent[];
  /** Totals the data must add up to; checked by `validateSession`. */
  expected: { additions: number; removals: number; files: number; edits: number };
}

export const SESSION: AgentSession = {
  agent: 'Frontend agent',
  pr: 'PR #214',
  duration: 226,
  axisDuration: 240,
  yTicks: [300, 150, 0, -100],
  expected: { additions: 318, removals: 94, files: 7, edits: 15 },
  files: [
    { id: 'page', name: 'page.tsx', dir: 'app/canvas/', icon: 'code', activity: [[4, 96]] },
    { id: 'landing', name: 'landing-page.tsx', dir: 'components/', icon: 'code', activity: [[12, 150]] },
    { id: 'hero', name: 'hero.tsx', dir: 'components/', icon: 'code', activity: [[20, 188]] },
    { id: 'pricing', name: 'pricing.tsx', dir: 'components/', icon: 'code', activity: [[40, 132]] },
    { id: 'brand', name: 'brand.ts', dir: 'lib/', icon: 'code', activity: [[52, 196]] },
    { id: 'heroPng', name: 'hero.png', dir: 'public/', icon: 'image', activity: [[84, 84]] },
    { id: 'heroTest', name: 'hero.test.tsx', dir: '', icon: 'test', activity: [[160, 208]] },
  ],
  events: [
    {
      t: 4, fileId: 'page', kind: 'text', additions: 24, removals: 0, provenance: 'approximated',
      diff: [
        { op: '+', text: 'import { LandingPage } from "@/c…' },
        { op: '+', text: 'export default function Page() {' },
      ],
    },
    {
      t: 12, fileId: 'landing', kind: 'text', additions: 58, removals: 0, provenance: 'approximated',
      diff: [
        { op: '+', text: 'export function LandingPage() {' },
        { op: '+', text: '  return (' },
        { op: '+', text: '    <main className="flex min-h-…' },
      ],
    },
    {
      t: 20, fileId: 'hero', kind: 'text', additions: 36, removals: 0, provenance: 'approximated',
      diff: [
        { op: '+', text: 'export function Hero({ title }: …' },
        { op: '+', text: '  return <section className="rel…' },
      ],
    },
    {
      t: 40, fileId: 'pricing', kind: 'text', additions: 22, removals: 31, provenance: 'approximated',
      diff: [
        { op: '-', text: 'const tiers = [{ name: "Starter",…' },
        { op: '+', text: 'import { tiers } from "@/lib/pri…' },
      ],
    },
    {
      t: 52, fileId: 'brand', kind: 'text', additions: 16, removals: 12, provenance: 'approximated',
      diff: [
        { op: '-', text: 'export const accent = "#7c3aed"' },
        { op: '+', text: 'export const brand = {' },
        { op: '+', text: '  accent: "oklch(0.72 0.19 150)…' },
      ],
    },
    {
      t: 70, fileId: 'landing', kind: 'text', additions: 14, removals: 6, provenance: 'approximated',
      diff: [
        { op: '-', text: '      <section className="py-24…' },
        { op: '+', text: '      <Hero title={brand.tagline…' },
      ],
    },
    {
      t: 84, fileId: 'heroPng', kind: 'binary', additions: 0, removals: 0, provenance: 'verified',
      binary: { status: 'new file', summary: 'Binary file added', width: 2400, height: 1350, truncated: true },
    },
    {
      t: 96, fileId: 'page', kind: 'text', additions: 6, removals: 2, provenance: 'approximated',
      diff: [
        { op: '-', text: '  return <main>{children}</main>' },
        { op: '+', text: '  return <LandingPage />' },
      ],
    },
    {
      t: 118, fileId: 'hero', kind: 'text', additions: 42, removals: 8, provenance: 'approximated',
      diff: [
        { op: '-', text: '      <h1 className="text-4xl">' },
        { op: '+', text: '      <h1 className="text-balanc…' },
        { op: '+', text: '        {title}' },
      ],
    },
    {
      t: 132, fileId: 'pricing', kind: 'text', additions: 12, removals: 10, provenance: 'approximated',
      diff: [
        { op: '-', text: '      <span>${tier.price}</span>' },
        { op: '+', text: '      <Price value={tier.price} …' },
      ],
    },
    {
      t: 150, fileId: 'landing', kind: 'text', additions: 22, removals: 6, provenance: 'approximated',
      diff: [
        { op: '-', text: '      <Pricing />' },
        { op: '+', text: '      <Pricing tiers={tiers} hig…' },
      ],
    },
    {
      t: 160, fileId: 'heroTest', kind: 'text', additions: 53, removals: 0, provenance: 'approximated',
      diff: [
        { op: '+', text: 'import { render, screen } from "…' },
        { op: '+', text: 'describe("Hero", () => {' },
      ],
    },
    {
      // Verified: tooltip at 3:08 reads components/hero.tsx, +6 -9.
      t: 188, fileId: 'hero', kind: 'text', additions: 6, removals: 9, provenance: 'verified',
      diff: [
        { op: '-', text: '    <Image src="/hero.png" priori…' },
        { op: '+', text: '    <Image' },
        { op: '+', text: '      src="/hero.png" priority al…' },
      ],
    },
    {
      t: 196, fileId: 'brand', kind: 'text', additions: 3, removals: 8, provenance: 'approximated',
      diff: [
        { op: '-', text: '  muted: "#a1a1aa",' },
        { op: '+', text: '  muted: "oklch(0.7 0 0)",' },
      ],
    },
    {
      // Verified: tooltip at 3:28 reads hero.test.tsx, +4 -2.
      t: 208, fileId: 'heroTest', kind: 'text', additions: 4, removals: 2, provenance: 'verified',
      diff: [
        { op: '-', text: '  expect(screen.getByRole("img"))…' },
        { op: '+', text: '  expect(screen.getByAltText(/fin…' },
      ],
    },
  ],
};
