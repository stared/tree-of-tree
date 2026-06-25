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

// The camera FRAMES the lit branch itself — its real width and height, plus
// label-aware padding — rather than a fixed-width window. Labels read up and to
// the RIGHT (−30°), so the box leans that way: more room on the right (the
// words) and top (the rising stack) than on the left/bottom. A MIN_W floor
// keeps a single thin chain from zooming in huge, so the scale stays roughly
// consistent across chapters; wider branches simply render a touch smaller
// rather than spilling off the edges. The whole tree is still drawn behind the
// crop, so neighbouring branches bleed in (dimmed) at the edges.
const PAD_L = 70;
const PAD_R = 205; // labels read up-right — the words live here
const PAD_TOP = 135; // a tall label stack rises off the topmost nodes
const PAD_BOTTOM = 70; // a stub of the incoming link, so the branch attaches
const MIN_W = 540; // narrowest frame — keeps thin chains at a sane scale

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
  // the branch's real extent (both axes) plus label-aware padding, centred on
  // the lit content so the focus words are always whole and centred.
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

    // the nodes that set the frame: the focus nodes and their descendants (NOT
    // the parent — that left an empty generation at the bottom). The opening
    // chapter is about the root itself, so it frames the root + the first fan.
    const rootFocus = focusIds.some((f) => layout.byId.get(f)?.depth === 0);
    const frame = rootFocus
      ? layout.nodes.filter((n) => n.depth <= 1) // opening chapter: root + first split
      : layout.nodes.filter(
          (n) => focusIds.includes(n.id) || focusIds.some((f) => n.lineage.includes(f)),
        );

    const xs = frame.map((n) => n.x);
    const ys = frame.map((n) => n.y);
    const x0 = Math.min(...xs) - PAD_L;
    const x1 = Math.max(...xs) + PAD_R;
    const y0 = Math.min(...ys) - PAD_TOP;
    const y1 = Math.max(...ys) + PAD_BOTTOM;
    const vbH = y1 - y0;
    // floor the width so a thin chain keeps a sane scale; grow the box around
    // its own centre (the dot column stays put, extra room spreads to the sides)
    let vx = x0;
    let vbW = x1 - x0;
    if (vbW < MIN_W) {
      vx = (x0 + x1) / 2 - MIN_W / 2;
      vbW = MIN_W;
    }
    return `${vx} ${y0} ${vbW} ${vbH}`;
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
