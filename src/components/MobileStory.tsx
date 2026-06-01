// The MOBILE experience: one plain scrolling column. No sticky tree, no
// Story/Explore modes, no zoom, no legend. Each chapter is text followed by its
// own branch of the tree; the whole tree bookends the story (overview + recap).
// Tapping any word opens a source popover anchored at it.

import { useMemo, useState } from "react";
import { COLOPHON, HERO, STEPS } from "../content/load";
import { nodeById, TREE } from "../data/etymology";
import { subtreeForFocus } from "../lib/subtree";
import { MobileTree } from "./MobileTree";
import { MobilePopover } from "./MobilePopover";

export function MobileStory() {
  const index = useMemo(() => nodeById(TREE), []);
  const [selected, setSelected] = useState<{ id: string; rect: DOMRect } | null>(null);
  const total = STEPS.length + 1;

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
        <MobileTree root={TREE} overview selectedId={selected?.id ?? null} onSelect={onSelect} />
      </section>

      {STEPS.map((s, i) => (
        <section className="m-chapter" key={s.key}>
          <div className="m-num">
            {String(i + 1).padStart(2, "0")} / {total}
          </div>
          <h2>{s.title}</h2>
          <p dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
          <MobileTree
            root={subtreeForFocus(TREE, s.focus)}
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

      {/* recap: the whole tree once more, to close */}
      <section className="m-chapter m-overview">
        <MobileTree root={TREE} overview selectedId={selected?.id ?? null} onSelect={onSelect} />
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
