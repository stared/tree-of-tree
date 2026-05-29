import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import "d3-transition"; // augments selection.prototype with .transition()
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { buildLayout, linkPath, type LaidNode, type Layout } from "../lib/layout";
import { SENSES, TREE, type SenseId } from "../data/etymology";

interface Props {
  /** ids the current narrative step wants to spotlight; empty = whole tree */
  focusIds: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

export function EtymologyTree({ focusIds, selectedId, onSelect }: Props) {
  const layout: Layout = useMemo(() => buildLayout(TREE, { dx: 34, dy: 150 }), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // fullscreen the whole tree region (so the detail panel comes along too)
  function toggleFullscreen() {
    const region = wrapRef.current?.closest(".tree-region") as HTMLElement | null;
    if (!region) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else region.requestFullscreen?.();
  }
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Disputed branches are always shown (dashed); the legend explains the dashing.
  const visibleNodes = layout.nodes;
  const visibleLinks = layout.links;

  // "Reset view" lifts the narrative dimming so the WHOLE tree is lit again.
  // Scrolling to another section re-arms the focus (effect below).
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setShowAll(false);
  }, [focusIds]);

  // active set for the current narrative focus: focus nodes + their ancestors + their subtrees
  const activeIds = useMemo(() => {
    if (showAll || focusIds.length === 0) return null; // null = everything active
    const set = new Set<string>();
    for (const f of focusIds) {
      const fn = layout.byId.get(f);
      if (fn) fn.lineage.forEach((id) => set.add(id));
      for (const n of layout.nodes) if (n.lineage.includes(f)) set.add(n.id);
    }
    return set;
  }, [showAll, focusIds, layout]);

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
      .scaleExtent([0.04, 12]) // wide open: zoom all the way out or deep in
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

    // Frame the focus nodes and their subtrees, but NOT the trunk down to the
    // root — so a step zooms into its branch rather than always showing the
    // whole stem. (The dimming in `activeIds` does include ancestors, so the
    // lit region is a little larger than the framed one; intentional.)
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
    const dur = prefersReducedMotion() ? 0 : 720;
    select(svg).transition().duration(dur).call(zoomBehavior.transform, t);
  }

  // Refit whenever the narrative focus or the viewport size changes. fitTo and
  // visibleNodes are deliberately not deps: fitTo is stable enough for this and
  // we don't want a refit on every unrelated render.
  useEffect(() => {
    fitTo(focusIds.length ? focusIds : null);
  }, [focusIds, size.w, size.h]);

  // A node is "active" only if it is a focus node, an ancestor of one (the
  // trunk leading to it), or a descendant of one — NOT merely a sibling that
  // happens to share a branch ancestor.
  function isDim(id: string): boolean {
    if (!activeIds) return false;
    return !activeIds.has(id);
  }

  // Gloss + language only appear once you've zoomed in a bit, or when a small
  // narrative focus is active — keeps the zoomed-out canopy from turning to mud.
  const showDetailGlobal = transform.k >= 0.62;
  const focusedSmall = !!activeIds && activeIds.size <= 18;

  // Greedy label placement in SCREEN space: walk nodes by importance and keep a
  // label only if it doesn't collide with one already kept. Zooming in spreads
  // the anchors apart, so more labels reveal themselves — organic decluttering.
  // Memoized: this runs on every zoom/pan/hover, so recompute only when an input
  // it actually reads changes.
  const labelShown = useMemo(() => {
    const shown = new Set<string>();
    const placed: Array<[number, number]> = [];
    const prio = (n: LaidNode) =>
      n.data.kind === "root" ? 0 : n.data.kind === "modern" ? 1 : n.hasChildren ? 2 : 3;
    const sorted = [...visibleNodes].sort((a, b) => prio(a) - prio(b));
    const minDist = 46;
    for (const n of sorted) {
      if (activeIds && !activeIds.has(n.id)) continue; // dimmed → no label
      const sx = n.x * transform.k + transform.x;
      const sy = n.y * transform.k + transform.y;
      const forced =
        n.data.kind === "root" ||
        n.id === selectedId ||
        n.id === hoverId ||
        !!hoverLineage?.has(n.id) ||
        (focusedSmall && !!activeIds?.has(n.id));
      if (forced) {
        shown.add(n.id);
        placed.push([sx, sy]);
        continue;
      }
      if (sx < -120 || sx > size.w + 120 || sy < -80 || sy > size.h + 80) continue;
      const collide = placed.some(([px, py]) => Math.abs(px - sx) < minDist && Math.abs(py - sy) < minDist);
      if (!collide) {
        shown.add(n.id);
        placed.push([sx, sy]);
      }
    }
    return shown;
  }, [visibleNodes, activeIds, transform, size.w, size.h, selectedId, hoverId, hoverLineage, focusedSmall]);

  // organic branch thickness: more wood flows through a link with a bigger subtree.
  // floor is generous so even a lone twig stays clearly attached (no "orphan" look).
  function strokeWidthFor(targetSubtree: number): number {
    return Math.max(1.8, Math.min(7.5, 1.4 + Math.sqrt(targetSubtree) * 1.05));
  }

  return (
    <div className="tree-wrap" ref={wrapRef}>
      <div className="tree-controls">
        <button
          onClick={() => {
            onSelect(null); // clear the clicked-node detail
            setShowAll(true); // lift the narrative dimming — light the whole tree
            fitTo(null); // and frame all of it
          }}
        >
          ⤢ Reset view
        </button>
        <button onClick={toggleFullscreen} title="Toggle full screen">
          {isFullscreen ? "⤧ Exit full screen" : "⛶ Full screen"}
        </button>

        {/* sense legend, same line — colour = meaning; dashed = scholars disagree */}
        <span className="tree-legend">
          {(Object.keys(SENSES) as SenseId[]).map((s) => (
            <span className="legend-chip" key={s}>
              <i style={{ background: SENSES[s].color }} />
              {SENSES[s].short}
            </span>
          ))}
          <span className="legend-chip legend-disputed" title="A link scholars dispute">
            <i className="dash" />
            disputed
          </span>
        </span>
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
                  strokeLinecap="round"
                  style={{
                    opacity: dim ? 0.07 : l.disputed ? 0.9 : 0.72,
                    strokeWidth: l.disputed
                      ? 2
                      : Math.max(strokeWidthFor(l.target.subtreeSize), onHoverPath ? 2.8 : 0),
                  }}
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
              const labeled = labelShown.has(n.id);
              const detail =
                isRoot ||
                showDetailGlobal ||
                selected ||
                n.id === hoverId ||
                (focusedSmall && !!activeIds?.has(n.id));
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

                  {/* label: root sits below the base, everything else reads up-right.
                      stack is: WORD / gloss / language. Gloss + language only when
                      `detail` (zoomed in or focused); whole label only when `labeled`
                      (passed collision avoidance) or hovered/selected. */}
                  {labeled &&
                    (isRoot ? (
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
                        {n.data.translit && (
                          <tspan className="translit" x={radius(n) + 5} dy={11}>
                            [{n.data.translit}]
                          </tspan>
                        )}
                        {detail && (
                          <tspan className="gloss" x={radius(n) + 5} dy={12}>
                            {n.data.gloss}
                          </tspan>
                        )}
                        {detail && (
                          <tspan className="lang" x={radius(n) + 5} dy={11}>
                            {n.data.lang}
                          </tspan>
                        )}
                      </text>
                    ))}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
