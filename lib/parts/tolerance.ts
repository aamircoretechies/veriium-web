/** Exhibit A §5.5 — parts receipt tolerance band. */
export function partsToleranceBand(partsCost: number): number {
  return Math.max(partsCost * 0.1, 25);
}

/** Whether actual parts cost is within the allowed band above the quoted amount. */
export function isWithinTolerance(
  quotedParts: number,
  actualParts: number,
): boolean {
  return actualParts <= quotedParts + partsToleranceBand(quotedParts);
}
