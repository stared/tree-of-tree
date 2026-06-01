// The mobile "sources on tap" bubble — anchored at the tapped node, flipping
// above/below to stay on screen. Tap the backdrop (or the node again) to close.

import { useLayoutEffect, useRef, useState } from "react";
import { SENSES, senseColor, type EtymNode } from "../data/etymology";
import { REFERENCES, sourceLink } from "../data/references";

interface Props {
  node: EtymNode;
  anchor: DOMRect; // the tapped node's on-screen box (viewport coords)
  onClose: () => void;
}

export function MobilePopover({ node, anchor, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; below: boolean; caret: number } | null>(
    null,
  );
  const accent = senseColor(node);
  const sense = node.sense ? SENSES[node.sense] : null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = anchor.left + anchor.width / 2;
    // prefer below when the node sits high on screen, above when it sits low
    const below = anchor.top < vh * 0.5;
    const top = below ? anchor.bottom + 12 : Math.max(8, anchor.top - ph - 12);
    const left = Math.max(8, Math.min(cx - pw / 2, vw - pw - 8));
    setBox({ left, top, below, caret: cx - left });
  }, [anchor, node]);

  return (
    <>
      <div className="m-pop-backdrop" onClick={onClose} />
      <div
        ref={ref}
        className={`m-popover${box?.below ? " below" : " above"}`}
        style={{
          left: box?.left ?? 0,
          top: box?.top ?? 0,
          visibility: box ? "visible" : "hidden",
          borderTopColor: accent,
        }}
        role="dialog"
      >
        <span className="m-pop-caret" style={{ left: box?.caret ?? 20, borderTopColor: accent }} />
        <button className="m-pop-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h3 className="m-pop-form">{node.form}</h3>
        {node.translit && <div className="m-pop-translit">[{node.translit}]</div>}
        <div className="m-pop-lang">{node.lang}</div>
        <p className="m-pop-gloss">“{node.gloss}”</p>

        {sense && (
          <div className="m-pop-sense">
            <span className="m-pop-dot" style={{ background: accent }} /> {sense.label}
          </div>
        )}

        {node.disputed && (
          <p className="m-pop-disputed">
            <strong>⚠ Disputed link</strong> — the connection from its parent is contested.
          </p>
        )}

        {node.note && <p className="m-pop-note">{node.note}</p>}

        {node.refs && node.refs.length > 0 && (
          <div className="m-pop-refs">
            <span className="m-pop-refs-title">Sources</span>
            {node.refs.map((rid) => {
              const url = REFERENCES[rid];
              if (!url) return null;
              return (
                <a key={rid} href={url} target="_blank" rel="noreferrer">
                  {sourceLink(url)}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
