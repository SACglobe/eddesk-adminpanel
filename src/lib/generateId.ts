/**
 * Generates a UUID v4 string.
 *
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS).
 * This utility falls back to a manual implementation using `crypto.getRandomValues`
 * (which IS available in non-secure HTTP contexts) so the app works during
 * local LAN development at http://192.168.x.x.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback: manual UUID v4 using crypto.getRandomValues (works on HTTP)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version bits (4) and variant bits (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
