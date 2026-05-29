import { SENSES, type EtymNode } from "../data/etymology";
import { REFERENCES, sourceLink } from "../data/references";

interface Props {
  node: EtymNode | null;
  accent: string; // the node's sense colour
  onClose: () => void;
}

const KIND_LABEL: Record<EtymNode["kind"], string> = {
  root: "Proto-Indo-European root",
  reconstructed: "reconstructed form",
  attested: "attested historical word",
  modern: "modern word / borrowing",
};

export function DetailPanel({ node, accent, onClose }: Props) {
  if (!node) return null;

  const sense = node.sense ? SENSES[node.sense] : null;

  return (
    <aside className="detail" style={{ borderTopColor: accent }}>
      <button className="detail-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="detail-kind" style={{ color: accent }}>
        {KIND_LABEL[node.kind]}
        {node.kind === "reconstructed" && " · *not attested, reconstructed"}
      </div>

      <h3 className="detail-form">{node.form}</h3>
      {node.translit && <div className="detail-translit">[{node.translit}]</div>}
      <div className="detail-lang">{node.lang}</div>
      <p className="detail-gloss">“{node.gloss}”</p>

      {sense && (
        <div className="detail-sense">
          <span className="detail-sense-dot" style={{ background: accent }} />
          meaning: <b>{sense.label}</b>
        </div>
      )}

      {node.disputed && (
        <div className="detail-disputed">
          <strong>⚠ Disputed link.</strong> The connection from its parent is
          contested by scholars — see the note.
        </div>
      )}

      {node.note && <p className="detail-note">{node.note}</p>}

      {node.quote && <blockquote className="detail-quote">{node.quote}</blockquote>}

      {node.refs && node.refs.length > 0 && (
        <div className="detail-refs">
          <div className="detail-refs-title">Sources</div>
          <ul>
            {node.refs.map((rid) => {
              const url = REFERENCES[rid];
              if (!url) return null;
              return (
                <li key={rid}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {sourceLink(url)}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
