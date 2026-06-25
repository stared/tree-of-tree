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

// The camera FRAMES the lit branch's own extent — its real width and height
// plus label-aware padding — and the viewBox aspect drives the SVG height
// (width:100%, height:auto), so there's no letterboxing and no dead band.
// Labels read up and to the RIGHT, so the box leans that way: lots of room on
// the right (the words) and a stub below (the incoming trunk — "where it grows
// from"). A MIN_W floor stops a thin chain from zooming in absurdly large.
const PAD_L = 60;
const PAD_R = 200; // labels read up-right — the words live here
const PAD_TOP = 104; // room for the rising label stack, no more
const PAD_BOTTOM = 104; // a stub of the incoming trunk, so the branch attaches
const MIN_W = 520; // narrowest frame — keeps thin chains at a sane scale

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

    // The opening chapter is about the ROOT itself: frame the root alone, large,
    // with a hint of the first stems rising out of it and room below for its
    // two-line label. (Everything descends from the root, so framing its subtree
    // would be the whole tree — deliberately avoided.)
    const rootNode = focusIds.map((f) => layout.byId.get(f)).find((n) => n?.depth === 0);
    if (rootNode) {
      const halfW = 285; // window half-width — the root dot dominates
      const aboveStem = 165; // a hint of the first stems rising
      const belowLabel = 135; // the root's label sits below the dot
      return `${rootNode.x - halfW} ${rootNode.y - aboveStem} ${halfW * 2} ${aboveStem + belowLabel}`;
    }

    // every other chapter: frame the focus nodes and their descendants — the lit
    // branch's real extent — plus the immediate lit STEM it grows from (the
    // focus nodes' parent, lineage[1]), so that labelled stem (e.g. *dréw-,
    // *dru-ko-) is shown whole rather than clipped off the bottom.
    const stemIds = new Set<string>();
    for (const f of focusIds) {
      const fn = layout.byId.get(f);
      const parent = fn && fn.lineage.length > 1 ? layout.byId.get(fn.lineage[1]) : null;
      // only a NEARBY parent (a far one like the disputed *dūrus → root link would
      // blow the crop open across the whole tree)
      if (fn && parent && Math.hypot(parent.x - fn.x, parent.y - fn.y) < 340) stemIds.add(parent.id);
    }
    const frame = layout.nodes.filter(
      (n) =>
        focusIds.includes(n.id) || focusIds.some((f) => n.lineage.includes(f)) || stemIds.has(n.id),
    );

    const xs = frame.map((n) => n.x);
    const ys = frame.map((n) => n.y);
    const y0 = Math.min(...ys) - PAD_TOP;
    const y1 = Math.max(...ys) + PAD_BOTTOM;
    let x0 = Math.min(...xs) - PAD_L;
    let vbW = Math.max(...xs) + PAD_R - x0;
    // floor the width so a thin chain keeps a sane scale; grow the box around its
    // own centre (the dot column stays put, extra room spreads to both sides)
    if (vbW < MIN_W) {
      x0 = (x0 + (x0 + vbW)) / 2 - MIN_W / 2;
      vbW = MIN_W;
    }
    return `${x0} ${y0} ${vbW} ${y1 - y0}`;
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
