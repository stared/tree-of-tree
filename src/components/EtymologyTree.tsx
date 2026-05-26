import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import "d3-transition"; // augments selection.prototype with .transition()
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { buildLayout, linkPath, type LaidNode, type Layout } from "../lib/layout";
import { TREE } from "../data/etymology";

interface Props {
  /** ids the current narrative step wants to spotlight; empty = whole tree */
  focusIds: string[];
  showDisputed: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function radius(node: LaidNode): number {
  switch (node.data.kind) {
    case "root":
      return 9;
    case "modern":
      return 5;
    default:
      return 3.8;
  }
}

function showGloss(node: LaidNode): boolean {
  const k = node.data.kind;
  return !node.hasChildren || k === "root" || k === "modern";
}

export function EtymologyTree({ focusIds, showDisputed, selectedId, onSelect }: Props) {
  const layout: Layout = useMemo(() => buildLayout(TREE, { dx: 26, dy: 155 }), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // nodes hidden because they sit under a disputed link
  const underDispute = useMemo(() => {
    const set = new Set<string>();
    for (const n of layout.nodes) {
      if (n.lineage.some((id) => layout.byId.get(id)?.data.disputed)) set.add(n.id);
    }
    return set;
  }, [layout]);

  const visibleNodes = useMemo(
    () => (showDisputed ? layout.nodes : layout.nodes.filter((n) => !underDispute.has(n.id))),
    [layout, showDisputed, underDispute],
  );
  const visibleLinks = useMemo(
    () =>
      showDisputed
        ? layout.links
        : layout.links.filter((l) => !underDispute.has(l.target.id)),
    [layout, showDisputed, underDispute],
  );

  // active set for the current narrative focus: focus nodes + their ancestors + their subtrees
  const activeIds = useMemo(() => {
    if (focusIds.length === 0) return null; // null = everything active
    const set = new Set<string>();
    for (const f of focusIds) {
      const fn = layout.byId.get(f);
      if (fn) fn.lineage.forEach((id) => set.add(id));
      for (const n of layout.nodes) if (n.lineage.includes(f)) set.add(n.id);
    }
    return set;
  }, [focusIds, layout]);

  const hoverLineage = useMemo(
    () => (hoverId ? new Set(layout.byId.get(hoverId)?.lineage ?? []) : null),
    [hoverId, layout],
  );

  // measure the container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // wire up zoom/pan once
  useEffect(() => {
    const svg = select(svgRef.current!);
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.18, 3])
      .on("zoom", (e) => setTransform(e.transform));
    svg.call(zoomBehavior);
    svg.on("dblclick.zoom", null); // dblclick is used for reset instead
    zoomRef.current = zoomBehavior;
  }, []);

  // compute a transform that fits a set of nodes into the viewport
  function fitTo(ids: string[] | null) {
    const svg = svgRef.current;
    const zoomBehavior = zoomRef.current;
    if (!svg || !zoomBehavior || size.w < 10) return;

    const pool = ids
      ? visibleNodes.filter((n) => ids.includes(n.id) || ids.some((f) => n.lineage.includes(f)))
      : visibleNodes;
    const target = pool.length ? pool : visibleNodes;
    if (!target.length) return;

    const xs = target.map((n) => n.x);
    const ys = target.map((n) => n.y);
    const padX = 150;
    const padY = 110;
    const minX = Math.min(...xs) - padX;
    const maxX = Math.max(...xs) + padX;
    const minY = Math.min(...ys) - padY;
    const maxY = Math.max(...ys) + padY;
    const bw = Math.max(maxX - minX, 50);
    const bh = Math.max(maxY - minY, 50);
    const k = Math.min(size.w / bw, size.h / bh, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const t = zoomIdentity
      .translate(size.w / 2, size.h / 2)
      .scale(k)
      .translate(-cx, -cy);
    select(svg).transition().duration(720).call(zoomBehavior.transform, t);
  }

  // refit whenever the narrative focus or the disputed toggle changes
  useEffect(() => {
    fitTo(focusIds.length ? focusIds : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIds, size.w, size.h, showDisputed]);

  // A node is "active" only if it is a focus node, an ancestor of one (the
  // trunk leading to it), or a descendant of one — NOT merely a sibling that
  // happens to share a branch ancestor.
  function isDim(id: string): boolean {
    if (!activeIds) return false;
    return !activeIds.has(id);
  }

  return (
    <div className="tree-wrap" ref={wrapRef}>
      <div className="tree-controls">
        <button onClick={() => fitTo(null)} title="Fit the whole tree">
          ⤢ Reset view
        </button>
        <span className="hint">drag to pan · scroll to zoom · click a word</span>
      </div>

      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onClick={() => onSelect(null)}
        role="img"
        aria-label="Etymological tree of the Proto-Indo-European root *deru-"
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* links */}
          <g fill="none">
            {visibleLinks.map((l) => {
              const onHoverPath =
                hoverLineage?.has(l.target.id) && hoverLineage?.has(l.source.id);
              const dim = isDim(l.target.id);
              return (
                <path
                  key={l.id}
                  d={linkPath(l)}
                  className={`link${l.disputed ? " disputed" : ""}${onHoverPath ? " trace" : ""}`}
                  stroke={l.target.color}
                  style={{ opacity: dim ? 0.08 : l.disputed ? 0.85 : 0.55 }}
                />
              );
            })}
          </g>

          {/* nodes */}
          <g>
            {visibleNodes.map((n) => {
              const dim = isDim(n.id);
              const selected = n.id === selectedId;
              const traced = hoverLineage?.has(n.id);
              const isRoot = n.data.kind === "root";
              const reconstructed = n.data.kind === "reconstructed";
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node node-${n.data.kind}${selected ? " selected" : ""}`}
                  style={{ opacity: dim ? 0.12 : 1, cursor: "pointer" }}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(n.id);
                  }}
                >
                  <title>
                    {n.data.form} — {n.data.gloss} ({n.data.lang})
                  </title>

                  <circle
                    r={radius(n)}
                    fill={isRoot ? n.color : reconstructed ? "#fffdf8" : n.color}
                    stroke={n.color}
                    strokeWidth={reconstructed ? 1.8 : selected || traced ? 2.4 : 1}
                    strokeDasharray={reconstructed ? "2.5 2" : undefined}
                  />

                  {n.data.disputed && (
                    <text className="badge" x={radius(n) + 2} y={-radius(n) - 1}>
                      ?
                    </text>
                  )}

                  {/* label: root sits below the base, everything else reads up-right.
                      stack is: WORD / gloss / language */}
                  {isRoot ? (
                    <text className="label root-label" textAnchor="middle" y={26}>
                      <tspan className="form" x={0}>
                        {n.data.form}
                      </tspan>
                      <tspan className="gloss" x={0} dy={16}>
                        {n.data.gloss}
                      </tspan>
                      <tspan className="lang" x={0} dy={14}>
                        {n.data.lang}
                      </tspan>
                    </text>
                  ) : (
                    <text
                      className="label"
                      transform="rotate(-32)"
                      textAnchor="start"
                      x={radius(n) + 5}
                      y={2}
                    >
                      <tspan className="form" x={radius(n) + 5}>
                        {n.data.form}
                      </tspan>
                      {showGloss(n) && (
                        <tspan className="gloss" x={radius(n) + 5} dy={12}>
                          {n.data.gloss}
                        </tspan>
                      )}
                      <tspan className="lang" x={radius(n) + 5} dy={11}>
                        {n.data.lang}
                      </tspan>
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
