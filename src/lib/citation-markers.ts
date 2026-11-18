/** Extract citation IDs from single or comma-grouped model markers. */
export function extractCitationIds(text: string): Set<string> {
  const references = new Set<string>();
  const markerPattern = /(?<!\[)\[((?:S[1-9]\d*)(?:\s*,\s*S[1-9]\d*)*)\](?!\])/g;

  for (const match of text.matchAll(markerPattern)) {
    for (const id of match[1].split(/\s*,\s*/)) references.add(id);
  }

  return references;
}
