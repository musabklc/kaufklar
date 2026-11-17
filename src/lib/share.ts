/** Erster https-Link aus geteiltem Text ("Schau mal: https://… via AutoScout24"), ohne angehängte Satzzeichen. */
export function sharedListingUrl(parts: (string | null | undefined)[]): string | null {
  for (const s of parts) {
    const m = s?.match(/https:\/\/[^\s<>"']+/i);
    if (m) return m[0].replace(/[).,!?;:]+$/, "").slice(0, 2000);
  }
  return null;
}
