export function linkCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? "link" : "links"}`;
}
