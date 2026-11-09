# Agent diff chart

A recreation of the "Frontend agent · PR #214" diff chart from the reference clip,
built with React + TypeScript, plain CSS and hand-written SVG (no chart library).

## Run

```bash
npm install
npm run dev        # http://localhost:5178
npm run build      # type-check + production build
```

## Layout

```
src/
  main.tsx                    preview wrapper (card centred on a dark page)
  AgentDiffChart/
    AgentDiffChart.tsx        composition, session clock, hover state
    data.ts                   typed example session (15 events, 7 files)
    model.ts                  pure derivations from simulated time + data validation
    scales.ts                 layout constants and the shared x/y scales
    tokens.ts                 non-colour tokens (playback length, dither matrix, ...)
    AgentDiffChart.css        colour/type tokens and all styles
    Header.tsx  Chart.tsx  Timeline.tsx  Tooltip.tsx  Footer.tsx
    TextMotion.tsx            rolling digits + filename scramble (display only)
    hooks.ts                  rAF clock, reduced motion, fonts-ready, width
```

Everything on screen (paths, dotted areas, heads, header totals, current file,
file tracks, axis tick state, footer net) is a function of one simulated time `t`.
The 3:46 session plays over ~11.3 s of wall-clock time (`PLAYBACK_SECONDS`); the
x axis spans 4:00. With `prefers-reduced-motion: reduce` the completed state is
shown immediately and hover still works. Hover is enabled once playback completes;
on touch screens a tap (or horizontal drag) pins the crosshair and a tap elsewhere
clears it.

## Props

| prop | default | |
| --- | --- | --- |
| `theme` | `'system'` | `'light'`, `'dark'` or `'system'` (follows `prefers-color-scheme`) |
| `maxScale` | `1.6` | in containers wider than 571px the card scales up uniformly, up to this factor |
| `playbackSeconds` | `11.3` | wall-clock length of the autoplay |
| `session` | example data | any `AgentSession` |

The preview page adds a System / Light / Dark switcher (remembered per browser);
it is part of the preview wrapper, not the component.

## Sizing

- 571px and wider: the reference layout, scaled up to fill the container
  (the preview limits it so the card fits the viewport height).
- Narrower: the layout reflows; below 500px the header stats wrap onto their own
  line and the timeline/axis labels grow from ~9.8px to ~10.8px for legibility.

## Fidelity notes

- Geometry is the reference clip measured at 2× (card ≈ 571 × 529 CSS px), except
  the plot, which is 36px taller than the reference (taken from the empty space
  under the footer) so it reads at about twice the height of the file tracks.
- Data: event times are read from the timeline ticks, line counts from the header
  counters during playback; the 1:24, 3:08 and 3:28 tooltips are verified. Other
  diff fragments are illustrative mock content, kept visibly truncated.
- Each jump eases in over 2.5 simulated seconds and lands exactly on its event
  time, which reproduces the reference's rounded rises sitting just ahead of
  their timeline ticks. The step sizes are the reference's own (read from its
  counters), including the small late ones (+6, +3, +4).
- The light theme is not in the reference; it maps the same hierarchy onto a white card.
- Fonts are stand-ins (Inter, Geist Mono) sized by matching the reference's ink widths.
