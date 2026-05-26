# The Tree of *tree* 🌳

An **explorable explanation** of the English word *tree* and its surprising
relatives — *true, trust, truth, trough, tray, tar, endure, durable, druid,
dryad, dendrite, rhododendron, deodar*, even Russian *zdorov* "healthy" — all
traced back to one Proto-Indo-European root, **\*deru- / \*dóru-**
("be firm, solid, steadfast; tree, wood").

The visualization is a **bottom-up tree**: the PIE root sits in the soil and the
words grow upward like a canopy — the diagram is literally the thing it names.

## What's here

- **Scrollytelling narrative** — scroll to walk the branches; the tree on the
  right focuses and dims to follow along.
- **Interactive tree** — drag to pan, scroll to zoom, **hover** a word to trace
  its line back to the root, **click** it for the gloss and exact sources.
- **Honest about uncertainty** — contested links (the Latin *dūrus* family,
  *druid* as "oak-knower", Slavic *zdorov* as "good wood", Greek *déndron*) are
  drawn **dashed with a "?"** and can be toggled off to see only secure descent.

## Sourcing

Every claim is cited. The full claim-by-claim reference list — and *who disputes
what* — lives in [`references.md`](references.md). The structured data and its
`refs` live in [`src/data/etymology.ts`](src/data/etymology.ts) and
[`src/data/references.ts`](src/data/references.ts).

Primary sources: the Online Etymology Dictionary, Wiktionary, the American
Heritage Dictionary of Indo-European Roots (Watkins), de Vaan's *Etymological
Dictionary of Latin*, and Wikipedia.

## Run it

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check + production bundle into dist/
pnpm preview  # serve the production build
```

## Stack

Vite + React + TypeScript. D3 is used only for what it's best at — `d3-hierarchy`
for the tree layout, `d3-zoom` for pan/zoom, `d3-transition` for the focus
animations — while React renders the SVG declaratively (no imperative,
jQuery-style DOM mutation).

```
src/
  data/etymology.ts    the typed etymology tree (root → branches → words)
  data/references.ts   numbered source list, keyed to references.md
  lib/layout.ts        d3-hierarchy → positioned nodes & links (bottom-up)
  components/EtymologyTree.tsx   the zoomable SVG tree
  components/DetailPanel.tsx     per-word detail + sources
  App.tsx              the explorable-explanation narrative + scrollytelling
```
