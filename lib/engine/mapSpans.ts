export function findSpan(
  sceneText: string,
  highlightedText: string,
): { start: number; end: number } | null {
  // exact match
  const idx = sceneText.indexOf(highlightedText);
  if (idx !== -1) return { start: idx, end: idx + highlightedText.length };

  // normalize whitespace
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const normText = norm(sceneText);
  const normHighlight = norm(highlightedText);
  const normIdx = normText.indexOf(normHighlight);
  if (normIdx !== -1) {
    // map back to original offsets by counting chars up to normIdx
    let origOffset = 0;
    let normCount = 0;
    while (normCount < normIdx && origOffset < sceneText.length) {
      if (sceneText[origOffset] !== ' ' || normText[normCount] === ' ') {
        normCount++;
      }
      origOffset++;
    }
    return { start: origOffset, end: origOffset + highlightedText.length };
  }

  // fallback: try first 40 chars as token search
  const firstWords = highlightedText.split(' ').slice(0, 4).join(' ');
  const tokenIdx = sceneText.indexOf(firstWords);
  if (tokenIdx !== -1) {
    return { start: tokenIdx, end: Math.min(tokenIdx + highlightedText.length, sceneText.length) };
  }

  return null;
}
