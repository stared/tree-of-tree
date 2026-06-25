// A SEPARATE, static view of the whole tree — built for a single high-res PNG
// (r/dataisbeautiful). NOT interactive, NOT the live story: every one of the 94
// words is labelled (the live tree only does that when zoomed in), the handful
// of `important` words are drawn bigger, and the image carries its own title,
// legend and attribution so it stands alone if reposted.
//
// Rendering is copied from EtymologyTree (so it matches the site you link to),
// then frozen. Geometry stays near the site's native dx/dy/cpu — that is what
// the crossing-free, no-fly layout is tuned for; inflating it scatters labels
// (and, by widening the viewBox, silently shrinks everything again).
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildLayout, findCrossings, linkPath, type LaidNode } from "./layout";
import { SENSES, TREE, type SenseId } from "../data/etymology";
import "./poster.css";

// ── tuning (this view only — the live app is untouched) ─────────────────────
const DX = 36; // breadth between leaves — native (keeps the layout crossing-free)
const DY = 188; // generation gap — native
const CPU = 8.5; // label-width budget per char
// Headline words are rendered 2× in CSS but get NO extra layout reservation: their
// boxes are already reserved wide for their (long) glosses, so the big short form
// fits inside that — keeping the layout at its proven-clean native positions.
const IMPORTANT_SCALE = 1;
const GREEN = SENSES.tree.color; // the word "tree" is green in the diagram → so in the title

function radius(node: LaidNode): number {
  switch (node.data.kind) {
    case "root":
      return 12;
    case "modern":
      return 6;
    default:
      return 4.2;
  }
}

// organic branch thickness — copied from EtymologyTree
function strokeWidthFor(targetSubtree: number): number {
  return Math.max(1.8, Math.min(7.5, 1.4 + Math.sqrt(targetSubtree) * 1.05));
}

// The locked force-directed layout: a compaction relaxation that packs labels
// densely + uniformly (so they render LARGE once fit to the frame), keeps the
// tree planar (bottom-up, no crossings), and de-tangles two stubborn leaves by
// hand. Beats the old tidy layout on word size (+27%) and label uniformity
// (2.4× more even) at zero overlaps / zero crossings. Tuned via scripts/eval-poster.mjs.
const WIN_FORCE: Record<string, number | boolean> = {
  krep: 26000, // node repulsion (keeps branch sectors apart → planar)
  kgrav: 0.003, // compaction toward the centroid (density → big font)
  klabel: 1.4, // label-box separation (no overlaps)
  kspring: 0.05,
  rest: 64,
  chainrest: 38, // short rest for single-child chains (compress trunk)
  mingap: 24, // bottom-up: child clears parent by ≥ this
  kangle: 0.012, // gentle branch straightening
  kedge: 1800, // edge–edge repulsion
  xbias: 1.2, // mild widen (square-ish packs the largest font)
  iters: 1200,
  repair: true,
  repairPasses: 12, // light crossing-repair (heavy repair re-tangles)
  repairStep: 14,
};

// EXPERIMENT HARNESS: default (no query) is the tidy layout. `?force=1` runs the
// experimental force pass (WIN_FORCE), `?force=1&krep=...` overrides single knobs
// so the screenshot script can keep sweeping. e.g. ?force=1&kgrav=0.004&xbias=1.5
function forceFromQuery(): false | Record<string, number | boolean> {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  if (!q.has("force") || q.get("force") === "0") return false;
  const fp: Record<string, number | boolean> = { ...WIN_FORCE };
  for (const [k, v] of q) {
    if (k === "force") continue;
    if (v === "true" || v === "false") fp[k] = v === "true";
    else if (!Number.isNaN(Number(v))) fp[k] = Number(v);
  }
  return fp;
}

// general layout knobs from the query (so dx/dy/cpu/importantScale tune live too)
function numQ(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = new URLSearchParams(window.location.search).get(key);
  return v != null && !Number.isNaN(Number(v)) ? Number(v) : fallback;
}

export function Poster() {
  const force = forceFromQuery();
  // MANUAL layout: ?json=<path> loads explicit positions (the hand-tuned source
  // of truth). Fetched async; until it arrives we render nothing (avoids a flash
  // of the solver layout that the screenshot might capture).
  const jsonPath =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("json") : null;
  const [positions, setPositions] = useState<Record<string, [number, number]> | null>(null);
  useLayoutEffect(() => {
    if (!jsonPath) return;
    fetch(jsonPath, { cache: "no-store" })
      .then((r) => r.json())
      .then(setPositions);
  }, [jsonPath]);

  // LABEL shifts: ?lshift=<path> loads {id:[dx,dy]} that nudge a label's TEXT in
  // its own (pre-rotation) frame WITHOUT moving the node or its link — so a label
  // can step out of a neighbour's way in a saturated fan with zero crossing risk.
  const lshiftPath =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lshift") : null;
  const [labelShifts, setLabelShifts] = useState<Record<string, [number, number]>>({});
  useLayoutEffect(() => {
    if (!lshiftPath) return;
    fetch(lshiftPath, { cache: "no-store" })
      .then((r) => r.json())
      .then(setLabelShifts);
  }, [lshiftPath]);

  const layout = useMemo(
    () =>
      buildLayout(TREE, {
        dx: numQ("dx", DX),
        dy: numQ("dy", DY),
        cpu: numQ("cpu", CPU),
        importantScale: numQ("importantScale", IMPORTANT_SCALE),
        force,
        positions: positions ?? undefined,
      }),
    [positions],
  );

  // Tight-fit the viewBox to the ACTUAL drawn content (nodes + every label),
  // measured after fonts load — no guessed padding, so zero wasted margin and
  // the tree fills the frame as large as it can. This is the real "bigger" lever.
  // expose ground-truth crossings + node coords for the screenshot script (verification)
  const g = globalThis as { __crossings?: unknown; __nodes?: unknown; __abstract?: unknown };
  g.__crossings = findCrossings(layout.links);
  g.__nodes = layout.nodes.map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) }));
  // abstract dump for the offline layout sandbox (scripts/sandbox.mjs): tree
  // topology + label text so the sandbox can size each label itself.
  g.__abstract = layout.nodes.map((n) => ({
    id: n.id,
    parent: n.lineage[1] ?? null,
    depth: n.depth,
    kind: n.data.kind,
    important: !!n.data.important,
    form: n.data.form,
    gloss: n.data.gloss ?? "",
    translit: n.data.translit ?? "",
    x: Math.round(n.x),
    y: Math.round(n.y),
  }));

  const gRef = useRef<SVGGElement>(null);
  const [viewBox, setViewBox] = useState("0 0 1600 1000");
  useLayoutEffect(() => {
    const g = gRef.current;
    if (!g) return;
    const fit = () => {
      const b = g.getBBox();
      const p = 8;
      setViewBox(`${b.x - p} ${b.y - p} ${b.width + 2 * p} ${b.height + 2 * p}`);
    };
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(fit);
    else fit();
  }, [layout]);

  return (
    <div className="poster">
      <h1 className="brand">
        The Tree of <span className="it" style={{ color: GREEN }}>tree</span>
      </h1>
      {/* tagline — one line, the site's own wording */}
      <p className="dek">
        Did you know that <b>truth, druid, dryad, tar</b> and <b>dendrite</b> all grew from the same
        root as the word <b>tree</b>? A single Proto-Indo-European root, <span className="it">*deru-</span>.
      </p>

      <svg
        className="poster-svg"
        viewBox={viewBox}
        role="img"
        aria-label="Etymological tree of the Proto-Indo-European root *deru-"
      >
        <g ref={gRef}>
          {/* links */}
          <g fill="none">
            {layout.links.map((l) => (
              <path
                key={l.id}
                d={linkPath(l)}
                className={`link${l.disputed ? " disputed" : ""}`}
                stroke={l.target.color}
                strokeLinecap="round"
                style={{
                  opacity: l.disputed ? 0.85 : 0.72,
                  strokeWidth: l.disputed ? 2 : strokeWidthFor(l.target.subtreeSize),
                }}
              />
            ))}
          </g>

          {/* nodes + labels */}
          <g>
            {layout.nodes.map((n) => {
              const isRoot = n.data.kind === "root";
              const reconstructed = n.data.kind === "reconstructed";
              const imp = !!n.data.important;
              const r = radius(n);
              // root + every starred proto-form share ONE reconstructed cue (dashed
              // outline); attested + modern words stay solid.
              const starred = isRoot || reconstructed;
              // show the meaning for headline words + foreign (non-English) cognates;
              // plain English outcomes and the proto-form scaffolding stay bare.
              const showG = n.data.kind === "attested" || n.data.kind === "modern";
              const firstDy = imp ? 21 : 11; // clear the (bigger) headline form
              return (
                <g
                  key={n.id}
                  data-id={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node node-${n.data.kind}${imp ? " imp" : ""}`}
                >
                  <circle
                    r={r}
                    fill={starred ? "#fffdf8" : n.color}
                    stroke={n.color}
                    strokeWidth={starred ? 1.8 : 1}
                    strokeDasharray={starred ? "2.5 2" : undefined}
                  />

                  {isRoot ? (
                    <text className="label root-label" textAnchor="middle" y={32}>
                      {/* poster-only: show the bare root *deru-, not the dictionary
                          double-citation "*deru-, *dóru-". The o-grade noun *dóru
                          already sits as its own node one step up (stem-doru), so
                          repeating it here is redundant and clashes with the
                          tagline's "a single root, *deru-". */}
                      <tspan className="form" x={0}>
                        *deru-
                      </tspan>
                      <tspan className="rootgloss" x={0} dy={36}>
                        {n.data.gloss}
                      </tspan>
                    </text>
                  ) : (
                    <text
                      className="label"
                      transform={`translate(${labelShifts[n.id]?.[0] ?? 0},${labelShifts[n.id]?.[1] ?? 0}) rotate(-32)`}
                      textAnchor="start"
                      x={r + 5}
                      y={2}
                    >
                      <tspan className="form" x={r + 5}>
                        {n.data.form}
                      </tspan>
                      {n.data.translit && (
                        <tspan className="meta" x={r + 5} dy={firstDy}>
                          [{n.data.translit}]
                        </tspan>
                      )}
                      {showG && (
                        <tspan className="gloss" x={r + 5} dy={n.data.translit ? 12 : firstDy}>
                          {n.data.gloss}
                        </tspan>
                      )}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* legend — moved into the empty lower-right wedge, a little above the root */}
      <div className="legend">
        {(Object.keys(SENSES) as SenseId[]).map((s) => (
          <span className="chip" key={s}>
            <i className="dot" style={{ background: SENSES[s].color }} />
            {SENSES[s].short}
          </span>
        ))}
        <span className="chip">
          <i className="dot ring" />
          reconstructed
        </span>
        <span className="chip">
          <i className="dash" />
          disputed
        </span>
      </div>

      <div className="credit">
        by <b>Piotr Migdał</b> · 2026 · <b className="link">p.migdal.pl/tree-of-tree</b> for an
        explorable explanation · sources: Wiktionary, Etymonline, Watkins, Kroonen, Beekes, de Vaan,
        Mayrhofer, Kloekhorst, Derksen, Matasović, Adams, Martirosyan, Pokorny, EIEC
      </div>
    </div>
  );
}
