/**
 * Generate a deterministic, human-readable BatchID from a scanId + product name.
 * Uses FNV-1a 32-bit hash → 8 hex chars with AMN- prefix.
 *
 * Example: "AMN-A3F7C201"
 */
export function generateBatchId(scanId: string, product: string): string {
  const data = `${scanId}:${product.toLowerCase().trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h = Math.imul(h ^ data.charCodeAt(i), 0x01000193);
  }
  return `AMN-${(h >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}
