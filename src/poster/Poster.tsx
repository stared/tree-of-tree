// A SEPARATE, static view of the whole tree — built for a single high-res PNG
// (r/dataisbeautiful). NOT interactive, NOT the live story: every one of the 94
// words is labelled (the live tree only does that when zoomed in), the handful
// of `important` words are drawn bigger, and the image carries its own title,
// legend and attribution so it stands alone if reposted.
//
// Rendering is copied from EtymologyTree (so it matches the site you link to),
// then frozen: no zoom, no focus/dimming, all labels always on. Geometry stays
// at the site's native dx/dy because that is what the crossing-free layout was
// tuned for — pushing it taller re-introduces branch crossings.
import { buildLayout, linkPath, type LaidNode } from "./layout";
import { SENSES, TREE, type SenseId } from "../data/etymology";
import "./poster.css";

// ── tuning (this view only — the live app is untouched) ─────────────────────
const DX = 36; // breadth between leaves — native (keeps the layout crossing-free)
const DY = 188; // generation gap — native
const CPU = 7.6; // label-width budget per char (slightly above native 7: ALL labels show)
const IMPORTANT_SCALE = 1.4; // headline words drawn ~1.4× → reserve room so they don't collide
const PAD = { l: 140, r: 250, t: 215, b: 150 }; // viewBox padding for the label fringe + 4:3 framing

function radius(node: LaidNode): number {
  switch (node.data.kind) {
    case "root":
      return 11;
    case "modern":
      return 5.5;
    default:
      return 4;
  }
}

// organic branch thickness — copied from EtymologyTree
function strokeWidthFor(targetSubtree: number): number {
  return Math.max(1.8, Math.min(7.5, 1.4 + Math.sqrt(targetSubtree) * 1.05));
}

export function Poster() {
  const layout = buildLayout(TREE, { dx: DX, dy: DY, cpu: CPU, importantScale: IMPORTANT_SCALE });

  const xs = layout.nodes.map((n) => n.x);
  const ys = layout.nodes.map((n) => n.y);
  const minX = Math.min(...xs) - PAD.l;
  const maxX = Math.max(...xs) + PAD.r;
  const minY = Math.min(...ys) - PAD.t;
  const maxY = Math.max(...ys) + PAD.b;
  const vw = maxX - minX;
  const vh = maxY - minY;

  return (
    <div className="poster">
      {/* one compact top bar: title left, legend right — fills the sky over the
          canopy instead of stacking empty header bands. */}
      <div className="topbar">
        <div className="brand">
          <h1>
            The Tree of <span className="it">tree</span>
          </h1>
          <p className="dek">
            90-odd English and cousin words — <b>tree, true, trust, tar, druid, dryad, dendrite</b> —
            grew from one Proto-Indo-European root, <span className="it">*deru-</span> “(be) firm,
            solid; tree, wood”.
          </p>
        </div>

        <div className="legend">
          <div className="lg-row">
            {(Object.keys(SENSES) as SenseId[]).map((s) => (
              <span className="chip" key={s}>
                <i style={{ background: SENSES[s].color }} />
                {SENSES[s].label}
              </span>
            ))}
          </div>
          <div className="lg-row keys">
            <span className="chip">
              <i className="ring" />
              reconstructed
            </span>
            <span className="chip">
              <i className="dash" />
              disputed link
            </span>
            <span className="chip">
              <i className="big" />
              headline word
            </span>
          </div>
        </div>
      </div>

      <svg
        className="poster-svg"
        viewBox={`${minX} ${minY} ${vw} ${vh}`}
        role="img"
        aria-label="Etymological tree of the Proto-Indo-European root *deru-"
      >
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
                  strokeWidth={reconstructed ? 1.8 : 1}
                  strokeDasharray={reconstructed ? "2.5 2" : undefined}
                />

                {isRoot ? (
                  <text className="label root-label" textAnchor="middle" y={30}>
                    <tspan className="form" x={0}>
                      {n.data.form}
                    </tspan>
                    <tspan className="gloss" x={0} dy={20}>
                      {n.data.gloss}
                    </tspan>
                  </text>
                ) : (
                  <text className="label" transform={`rotate(-32)`} textAnchor="start" x={r + 5} y={2}>
                    <tspan className="form" x={r + 5}>
                      {n.data.form}
                    </tspan>
                    {n.data.translit && (
                      <tspan className="translit" x={r + 5} dy={12}>
                        [{n.data.translit}]
                      </tspan>
                    )}
                    {imp && (
                      <tspan className="gloss" x={r + 5} dy={13}>
                        {n.data.gloss}
                      </tspan>
                    )}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="credit">
        by <b>Piotr Migdał</b> · explore the interactive version at{" "}
        <b className="link">p.migdal.pl/tree-of-tree</b>
        <span className="src">
          {" "}
          · sources: Online Etymology Dictionary, Wiktionary, Watkins, de Vaan, Kroonen, Beekes,
          Derksen, Mayrhofer, Kloekhorst, Pokorny, EIEC
        </span>
      </div>
    </div>
  );
}
