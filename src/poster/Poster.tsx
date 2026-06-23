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
import { buildLayout, linkPath, type LaidNode } from "./layout";
import { SENSES, TREE, type SenseId } from "../data/etymology";
import "./poster.css";

// ── tuning (this view only — the live app is untouched) ─────────────────────
const DX = 36; // breadth between leaves — native (keeps the layout crossing-free)
const DY = 188; // generation gap — native
const CPU = 9; // label-width budget per char — tracks the bigger forms-only labels
const IMPORTANT_SCALE = 1.3; // headline words a touch bigger — gentle, so nothing flies
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

export function Poster() {
  const layout = useMemo(
    () => buildLayout(TREE, { dx: DX, dy: DY, cpu: CPU, importantScale: IMPORTANT_SCALE }),
    [],
  );

  // Tight-fit the viewBox to the ACTUAL drawn content (nodes + every label),
  // measured after fonts load — no guessed padding, so zero wasted margin and
  // the tree fills the frame as large as it can. This is the real "bigger" lever.
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
  }, []);

  return (
    <div className="poster">
      <div className="topbar">
        <h1 className="brand">
          The Tree of <span className="it" style={{ color: GREEN }}>tree</span>
        </h1>
        {/* one combined legend line — meaning colours + the two form cues, no
            category captions, no wrapping */}
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
      </div>

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
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node node-${n.data.kind}${imp ? " imp" : ""}`}
                >
                  <circle
                    r={r}
                    fill={isRoot ? n.color : reconstructed ? "#fffdf8" : n.color}
                    stroke={n.color}
                    strokeWidth={starred ? 1.8 : 1}
                    strokeDasharray={starred ? "2.5 2" : undefined}
                  />

                  {isRoot ? (
                    <text className="label root-label" textAnchor="middle" y={32}>
                      <tspan className="form" x={0}>
                        {n.data.form}
                      </tspan>
                      <tspan className="meta" x={0} dy={20}>
                        {n.data.gloss}
                      </tspan>
                    </text>
                  ) : (
                    <text className="label" transform={`rotate(-32)`} textAnchor="start" x={r + 5} y={2}>
                      <tspan className="form" x={r + 5}>
                        {n.data.form}
                      </tspan>
                      {n.data.translit && (
                        <tspan className="meta" x={r + 5} dy={13}>
                          [{n.data.translit}]
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

      <div className="credit">
        by <b>Piotr Migdał</b> · explore the interactive version at{" "}
        <b className="link">p.migdal.pl/tree-of-tree</b> · sources: Online Etymology Dictionary,
        Wiktionary, Watkins, de Vaan, Kroonen, Beekes, Derksen, Mayrhofer, Kloekhorst, Pokorny, EIEC
      </div>
    </div>
  );
}
