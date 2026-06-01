// The MOBILE experience: one plain scrolling column. No sticky tree, no
// Story/Explore modes, no zoom, no legend. Each chapter is text followed by its
// own branch of the tree; the whole tree bookends the story (overview + recap).
// Tapping any word opens a source popover anchored at it.

import { useMemo, useState } from "react";
import { COLOPHON, HERO, STEPS } from "../content/load";
import { nodeById, senseColor, TREE } from "../data/etymology";
import { buildLayout } from "../lib/layout";
import { MobileTree } from "./MobileTree";
import { MobilePopover } from "./MobilePopover";
import { EtymologyTree } from "./EtymologyTree";
import { DetailPanel } from "./DetailPanel";

export function MobileStory() {
  const index = useMemo(() => nodeById(TREE), []);
  // one shared full-tree layout; every chapter is a cropped window into it
  const layout = useMemo(() => buildLayout(TREE, { dx: 34, dy: 188 }), []);
  const [selected, setSelected] = useState<{ id: string; rect: DOMRect } | null>(null);
  // the closing "explore" tree has its own selection (a docked detail panel,
  // since its nodes move as you zoom/pan — an anchored popover wouldn't track)
  const [exploreId, setExploreId] = useState<string | null>(null);
  const exploreNode = exploreId ? index.get(exploreId) ?? null : null;
  const total = STEPS.length + 1;
  // a chapter with no explicit focus (the opening "old root") centres on the root
  const focusOf = (focus: string[]) => (focus.length ? focus : [TREE.id]);

  const onSelect = (id: string, el: SVGGElement) =>
    setSelected((cur) => (cur?.id === id ? null : { id, rect: el.getBoundingClientRect() }));

  const selectedNode = selected ? index.get(selected.id) ?? null : null;

  return (
    <div className="m-story">
      <header className="m-hero">
        <div className="hero-kicker">{HERO.kicker}</div>
        <h1 dangerouslySetInnerHTML={{ __html: HERO.titleHtml }} />
        <p className="hero-dek" dangerouslySetInnerHTML={{ __html: HERO.bodyHtml }} />
      </header>

      {/* orientation: the whole tree once, up top */}
      <section className="m-chapter m-overview">
        <MobileTree layout={layout} focusIds={[]} overview selectedId={selected?.id ?? null} onSelect={onSelect} />
      </section>

      {STEPS.map((s, i) => (
        <section className="m-chapter" key={s.key}>
          <div className="m-num">
            {String(i + 1).padStart(2, "0")} / {total}
          </div>
          <h2>{s.title}</h2>
          <p dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
          <MobileTree
            layout={layout}
            focusIds={focusOf(s.focus)}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
          />
        </section>
      ))}

      {/* closing chapter — words beyond the family */}
      <section className="m-chapter">
        <div className="m-num">
          {total} / {total}
        </div>
        <h2>{COLOPHON.title}</h2>
        <p dangerouslySetInnerHTML={{ __html: COLOPHON.bodyHtml }} />
      </section>

      {/* close by handing over the whole tree to explore — zoom, pan, tap */}
      <section className="m-chapter m-explore">
        <p>Zoom to explore, click on a word to see the sources.</p>
        <div className="m-explore-stage">
          <EtymologyTree
            focusIds={[]}
            selectedId={exploreId}
            onSelect={setExploreId}
            interactive
            showLabels
            chrome={false}
            exploreSelected
            onToggleExplore={() => {}}
          />
          <DetailPanel
            node={exploreNode}
            accent={exploreNode ? senseColor(exploreNode) : "#999"}
            onClose={() => setExploreId(null)}
          />
        </div>
      </section>

      <footer className="m-footer">
        By{" "}
        <a href="https://p.migdal.pl/" target="_blank" rel="noreferrer">
          Piotr Migdał
        </a>{" "}
        · Source &amp; data on{" "}
        <a href="https://github.com/stared/tree-of-tree" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>

      {selectedNode && selected && (
        <MobilePopover node={selectedNode} anchor={selected.rect} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
