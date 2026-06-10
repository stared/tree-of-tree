// Types for content collections + the validators that run at load time.
// Cross-checks `focus` IDs against the real tree so typos fail loud.

import { TREE, type EtymNode } from "../data/etymology";

const ALL_NODE_IDS: ReadonlySet<string> = (() => {
  const ids = new Set<string>();
  (function walk(n: EtymNode) {
    ids.add(n.id);
    n.children?.forEach(walk);
  })(TREE);
  return ids;
})();

export interface Step {
  key: string;
  focus: string[];
  title: string;
  /** rendered body HTML — a single paragraph is unwrapped; multi-paragraph keeps its <p>s */
  bodyHtml: string;
}

export interface Hero {
  kicker: string;
  /** inline-rendered title; may contain <i> for the green-coloured word */
  titleHtml: string;
  /** rendered inline HTML for the dek (one paragraph, no outer <p>) */
  bodyHtml: string;
}

export function validateStep(step: Step, origin: string): void {
  if (!step.key) throw new Error(`[content] ${origin}: missing 'key'`);
  if (!step.title) throw new Error(`[content] ${origin}: missing 'title'`);
  if (!Array.isArray(step.focus)) {
    throw new Error(`[content] ${origin}: 'focus' must be an array`);
  }
  for (const id of step.focus) {
    if (!ALL_NODE_IDS.has(id)) {
      throw new Error(
        `[content] ${origin}: unknown tree node id in focus: '${id}'`,
      );
    }
  }
}
