// A STATIC, CROPPED view of the WHOLE tree for the mobile inline story — not an
// extracted subtree. Every chapter renders the same shared layout at the SAME
// scale and just pans a fixed-size viewBox window onto its focus, so neighbouring
// branches bleed in at the edges (dimmed) and it reads as "a part of THE tree".
// Consistent scale across chapters; no empty space. Tap a node → popover.

import { useMemo } from "react";
import { linkPath, type LaidNode, type Layout } from "../lib/layout";

interface Props {
  layout: Layout; // the full tree, built once and shared
  focusIds: string[]; // what this chapter centers on; [] = whole-tree overview
  overview?: boolean; // fit the whole tree (bookend), few labels
  selectedId: string | null;
  onSelect: (id: string, el: SVGGElement) => void;
}

// The camera's WIDTH is fixed (in layout units) so the on-screen scale is
// identical in every chapter; its HEIGHT fits the lit branch (plus room for
// labels), so there's no dead vertical space. Neighbouring branches still fill
// the width because the whole tree is drawn behind the crop.
const VIEW_W = 470;
const PAD_TOP = 90; // labels read up from the topmost nodes
const BOTTOM_REACH = 78; // a stub of the incoming link, so the branch attaches
//                          to the trunk without an empty whole generation below

function radius(n: LaidNode): number {
  if (n.data.kind === "root") return 8;
  if (n.data.kind === "modern") return 5;
  return 3.8;
}

function strokeWidthFor(subtreeSize: number): number {
  return Math.max(1.6, Math.min(6.5, 1.3 + Math.sqrt(subtreeSize) * 0.95));
}

export function MobileTree({ layout, focusIds, overview, selectedId, onSelect }: Props) {
  // which nodes are "lit" — the focus nodes, their subtrees, and the trunk down
  // to them; everything else is faint context.
  const activeIds = useMemo(() => {
    if (overview || !focusIds.length) return null; // null = everything lit
    const set = new Set<string>();
    for (const f of focusIds) {
      const fn = layout.byId.get(f);
      if (fn) fn.lineage.forEach((id) => set.add(id));
      for (const n of layout.nodes) if (n.lineage.includes(f)) set.add(n.id);
    }
    return set;
  }, [overview, focusIds, layout]);

  // the viewBox: overview fits the whole tree; a chapter frames its lit branch —
  // fixed WIDTH (constant scale), HEIGHT fitted to the branch (no dead space).
  const viewBox = useMemo(() => {
    if (overview || !focusIds.length) {
      const xs = layout.nodes.map((n) => n.x);
      const ys = layout.nodes.map((n) => n.y);
      const padX = 46;
      const padTop = 26;
      const padBottom = 50;
      const x0 = Math.min(...xs) - padX;
      const y0 = Math.min(...ys) - padTop;
      return `${x0} ${y0} ${Math.max(...xs) - x0 + padX} ${Math.max(...ys) - y0 + padBottom}`;
    }

    // the nodes that set the frame's vertical extent: the focus nodes and their
    // descendants (NOT the parent — that left an empty generation at the bottom)
    const rootFocus = focusIds.some((f) => layout.byId.get(f)?.depth === 0);
    const frame = rootFocus
      ? layout.nodes.filter((n) => n.depth <= 1) // opening chapter: root + first split
      : layout.nodes.filter(
          (n) => focusIds.includes(n.id) || focusIds.some((f) => n.lineage.includes(f)),
        );

    const fxs = (focusIds.map((f) => layout.byId.get(f)).filter(Boolean) as LaidNode[]).map((n) => n.x);
    const cx = (Math.min(...fxs) + Math.max(...fxs)) / 2;
    const ys = frame.map((n) => n.y);
    const y0 = Math.min(...ys) - PAD_TOP;
    const vbH = Math.max(...ys) + BOTTOM_REACH - y0;
    return `${cx - VIEW_W / 2} ${y0} ${VIEW_W} ${vbH}`;
  }, [overview, focusIds, layout]);

  const labelOn = (n: LaidNode) => {
    if (overview) return false; // the bookend tree is a bare silhouette — no words
    if (!activeIds) return true;
    return activeIds.has(n.id); // label only the lit branch; context stays bare
  };
  const dimOf = (id: string) => (activeIds ? !activeIds.has(id) : false);

  return (
    <svg
      className="m-tree-svg"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A view into the etymological tree"
    >
      <g fill="none">
        {layout.links.map((l) => {
          const dim = dimOf(l.target.id);
          return (
            <path
              key={l.id}
              d={linkPath(l)}
              className={`link${l.disputed ? " disputed" : ""}`}
              stroke={l.target.color}
              strokeLinecap="round"
              style={{
                opacity: dim ? 0.12 : l.disputed ? 0.9 : 0.72,
                strokeWidth: l.disputed ? 2 : strokeWidthFor(l.target.subtreeSize),
              }}
            />
          );
        })}
      </g>

      <g>
        {layout.nodes.map((n) => {
          const isRoot = n.data.kind === "root";
          const reconstructed = n.data.kind === "reconstructed";
          const selected = n.id === selectedId;
          const dim = dimOf(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={`node node-${n.data.kind}${selected ? " selected" : ""}`}
              style={{ opacity: dim ? 0.16 : 1, cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(n.id, e.currentTarget);
              }}
            >
              <title>
                {n.data.form} — {n.data.gloss} ({n.data.lang})
              </title>

              {/* generous invisible tap target — dots are tiny on a phone */}
              <circle r={20} fill="transparent" />

              <circle
                r={radius(n)}
                fill={reconstructed ? "#fffdf8" : n.color}
                stroke={n.color}
                strokeWidth={reconstructed ? 1.8 : selected ? 2.6 : 1}
                strokeDasharray={reconstructed ? "2.5 2" : undefined}
              />

              {labelOn(n) &&
                (isRoot ? (
                  <text
                    className="label root-label"
                    textAnchor="middle"
                    y={26}
                    transform={`translate(${n.labelDx},${n.labelDy})`}
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
                    transform={`translate(${n.labelDx},${n.labelDy}) rotate(-30)`}
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
