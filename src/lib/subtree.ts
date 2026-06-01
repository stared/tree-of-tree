// For the MOBILE inline-stacked story: each chapter shows just its own branch,
// not the whole tree. Given a chapter's focus ids, find the smallest subtree
// that contains them all — the lowest common ancestor (LCA) — and render from
// there. Single-focus chapters root at the focus node itself; multi-focus
// chapters root at their nearest shared ancestor. Empty focus = the whole tree
// (used for the overview at the top and the recap at the end).

import type { EtymNode } from "../data/etymology";

/** root→node chain (inclusive) for every node, keyed by id */
function chains(root: EtymNode): Map<string, EtymNode[]> {
  const map = new Map<string, EtymNode[]>();
  (function walk(node: EtymNode, ancestors: EtymNode[]) {
    const chain = [...ancestors, node];
    map.set(node.id, chain);
    node.children?.forEach((c) => walk(c, chain));
  })(root, []);
  return map;
}

/** the EtymNode to render for a chapter: LCA of its focus ids (or the whole tree) */
export function subtreeForFocus(root: EtymNode, focusIds: string[]): EtymNode {
  if (!focusIds.length) return root;
  const byId = chains(root);
  const paths = focusIds.map((id) => byId.get(id)).filter(Boolean) as EtymNode[][];
  if (!paths.length) return root;

  // walk down the shared prefix of every path; the last shared node is the LCA
  let depth = 0;
  for (; ; depth++) {
    const here = paths[0][depth];
    if (!here || paths.some((p) => p[depth]?.id !== here.id)) break;
  }
  return paths[0][depth - 1] ?? root;
}
