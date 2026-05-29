// Source list for the detail panel, parsed from the human-facing /references.md
// so the two can never drift. references.md is the single source of truth;
// this module just lifts its master-list bullets into a typed map keyed by the
// [Rn] id, and checks at load that every `refs` in the tree resolves.
//
// A master-list line looks like:
//   - **[R3]** etymonline, *tree* — https://www.etymonline.com/word/tree
// The label may itself contain " — " (e.g. "EDSIL — Slavic Inherited Lexicon"),
// so we anchor on the trailing URL rather than splitting on the dash.

import rawReferences from "../../references.md?raw";
import { TREE, type EtymNode } from "./etymology";

export interface Reference {
  id: number;
  label: string;
  url: string;
}

const LINE = /^[-*]\s+\*\*\[R(\d+)\]\*\*\s+(.+?)\s*—\s*(https?:\/\/\S+)\s*$/;

/** drop the markdown emphasis/code that's noise in a link label, while keeping
 *  backslash-escaped asterisks (e.g. the PIE star in "*deru-"). */
function plain(md: string): string {
  return md
    .replace(/\\\*/g, "\x00") // park escaped asterisks on a sentinel
    .replace(/[*`]/g, "") // strip emphasis / code markers
    .replace(/\x00/g, "*") // restore the literal asterisks
    .trim();
}

function parseReferences(md: string): Record<number, Reference> {
  const out: Record<number, Reference> = {};
  for (const line of md.split(/\r?\n/)) {
    const m = LINE.exec(line.trim());
    if (!m) continue;
    const id = Number(m[1]);
    if (out[id]) throw new Error(`[references] duplicate [R${id}] in references.md`);
    out[id] = { id, label: plain(m[2]), url: m[3] };
  }
  return out;
}

export const REFERENCES: Record<number, Reference> = parseReferences(rawReferences);

// fail fast if a node cites a source that references.md doesn't define
(function validateTreeRefs(root: EtymNode) {
  const dangling: string[] = [];
  (function walk(n: EtymNode) {
    for (const r of n.refs ?? []) if (!REFERENCES[r]) dangling.push(`${n.id} → R${r}`);
    n.children?.forEach(walk);
  })(root);
  if (dangling.length) {
    throw new Error(`[references] nodes cite undefined sources: ${dangling.join(", ")}`);
  }
})(TREE);
