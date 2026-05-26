import { BRANCHES, type EtymNode } from "../data/etymology";
import { REFERENCES } from "../data/references";

interface Props {
  node: EtymNode | null;
  branchColor: string;
  onClose: () => void;
}

const KIND_LABEL: Record<EtymNode["kind"], string> = {
  root: "Proto-Indo-European root",
  branch: "language branch",
  reconstructed: "reconstructed form",
  attested: "attested historical word",
  modern: "modern word / borrowing",
};

export function DetailPanel({ node, branchColor, onClose }: Props) {
  if (!node) return null;

  const branchName = node.branch ? BRANCHES[node.branch].name : null;

  return (
    <aside className="detail" style={{ borderTopColor: branchColor }}>
      <button className="detail-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="detail-kind" style={{ color: branchColor }}>
        {KIND_LABEL[node.kind]}
        {node.kind === "reconstructed" && " · *not attested, reconstructed"}
      </div>

      <h3 className="detail-form">{node.form}</h3>
      <div className="detail-lang">
        {node.lang}
        {branchName && node.kind !== "branch" ? ` · ${branchName}` : ""}
      </div>
      <p className="detail-gloss">“{node.gloss}”</p>

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
              const ref = REFERENCES[rid];
              if (!ref) return null;
              return (
                <li key={rid}>
                  <a href={ref.url} target="_blank" rel="noreferrer">
                    {ref.label}
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
