// A STATIC tree for the mobile inline story — no zoom, no pan, no chrome.
// It lays out one branch (or the whole tree, for the overview) and sizes itself
// with a viewBox so it scales to the column width. Tapping a node bubbles up so
// the story can show a popover anchored at it.

import { useMemo } from "react";
import { buildLayout, linkPath, type LaidNode } from "../lib/layout";
import type { EtymNode } from "../data/etymology";

interface Props {
  root: EtymNode;
  /** the whole-tree overview: label only the headline words, not every node */
  overview?: boolean;
  selectedId: string | null;
  onSelect: (id: string, el: SVGGElement) => void;
}

function radius(n: LaidNode): number {
  if (n.data.kind === "root") return 8;
  if (n.data.kind === "modern") return 5;
  return 3.8;
}

function strokeWidthFor(subtreeSize: number): number {
  return Math.max(1.6, Math.min(6.5, 1.3 + Math.sqrt(subtreeSize) * 0.95));
}

export function MobileTree({ root, overview, selectedId, onSelect }: Props) {
  // a lone branch needs more breathing room per node than the dense full tree
  const layout = useMemo(
    () => buildLayout(root, overview ? { dx: 30, dy: 150 } : { dx: 46, dy: 150 }),
    [root, overview],
  );

  // padding leaves room for labels: they read up-and-to-the-right, the root
  // label sits below the base.
  const pad = { top: 64, right: 172, bottom: 60, left: 30 };
  const vbW = layout.width + pad.left + pad.right;
  const vbH = layout.height + pad.top + pad.bottom;

  return (
    <svg
      className="m-tree-svg"
      viewBox={`${-pad.left} ${-pad.top} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A branch of the etymological tree"
    >
      <g fill="none">
        {layout.links.map((l) => (
          <path
            key={l.id}
            d={linkPath(l)}
            className={`link${l.disputed ? " disputed" : ""}`}
            stroke={l.target.color}
            strokeLinecap="round"
            style={{
              opacity: l.disputed ? 0.9 : 0.72,
              strokeWidth: l.disputed ? 2 : strokeWidthFor(l.target.subtreeSize),
            }}
          />
        ))}
      </g>

      <g>
        {layout.nodes.map((n) => {
          const isRoot = n.data.kind === "root";
          const reconstructed = n.data.kind === "reconstructed";
          const selected = n.id === selectedId;
          const labeled = !overview || isRoot || n.data.important;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={`node node-${n.data.kind}${selected ? " selected" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(n.id, e.currentTarget);
              }}
            >
              <title>
                {n.data.form} — {n.data.gloss} ({n.data.lang})
              </title>

              {/* generous invisible tap target — the visible dot is tiny on a
                  phone, so give the whole node a finger-sized hit area */}
              <circle r={20} fill="transparent" />

              <circle
                r={radius(n)}
                fill={reconstructed ? "#fffdf8" : n.color}
                stroke={n.color}
                strokeWidth={reconstructed ? 1.8 : selected ? 2.6 : 1}
                strokeDasharray={reconstructed ? "2.5 2" : undefined}
              />

              {labeled &&
                (isRoot ? (
                  <text
                    className="label root-label"
                    textAnchor="middle"
                    y={26}
                    style={{ pointerEvents: "auto" }}
                  >
                    <tspan className="form" x={0}>
                      {n.data.form}
                    </tspan>
                    <tspan className="gloss" x={0} dy={16}>
                      {n.data.gloss}
                    </tspan>
                  </text>
                ) : (
                  <text
                    className="label"
                    transform="rotate(-30)"
                    textAnchor="start"
                    x={radius(n) + 5}
                    y={2}
                    style={{ pointerEvents: "auto" }}
                  >
                    <tspan className="form" x={radius(n) + 5}>
                      {n.data.form}
                    </tspan>
                    {n.data.translit && (
                      <tspan className="translit" x={radius(n) + 5} dy={11}>
                        [{n.data.translit}]
                      </tspan>
                    )}
                    {!overview && (
                      <tspan className="gloss" x={radius(n) + 5} dy={12}>
                        {n.data.gloss}
                      </tspan>
                    )}
                  </text>
                ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
