import type { PageNode } from "./to-blocks";

const ELEMENT_NODE = 1;

export type TreeLimits = { elements: number; depth: number };

// Iterative, and stops at the first element past a limit, so a hostile tree
// can neither overflow the stack nor cost more than the limits to measure.
export function exceedsLimits(root: PageNode, limits: TreeLimits): boolean {
  const stack: { node: PageNode; depth: number }[] = [{ node: root, depth: 0 }];
  let elements = 0;
  for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
    for (const child of item.node.childNodes) {
      if (child.nodeType !== ELEMENT_NODE) continue;
      elements += 1;
      if (elements > limits.elements || item.depth + 1 > limits.depth) return true;
      stack.push({ node: child, depth: item.depth + 1 });
    }
  }
  return false;
}
