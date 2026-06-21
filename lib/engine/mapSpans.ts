export function findSpan(
  sceneText: string,
  highlightedText: string,
): { start: number; end: number } | null {
  if (!highlightedText) return null;

  // exact match
  const idx = sceneText.indexOf(highlightedText);
  if (idx !== -1) return { start: idx, end: idx + highlightedText.length };

  // case-insensitive exact match
  const lowerScene = sceneText.toLowerCase();
  const lowerHighlight = highlightedText.toLowerCase();
  const idxCI = lowerScene.indexOf(lowerHighlight);
  if (idxCI !== -1) return { start: idxCI, end: idxCI + highlightedText.length };

  // normalize whitespace (collapses \n \t and multiple spaces to single space)
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const normText = norm(sceneText);
  const normHighlight = norm(highlightedText);
  const normIdx = normText.indexOf(normHighlight);
  if (normIdx !== -1) {
    // Map normalized index back to original offset.
    // Walk both strings together: when original has run of whitespace that maps to
    // a single space in normalized, only advance normCount once for the whole run.
    let origOffset = 0;
    let normCount = 0;
    while (normCount < normIdx && origOffset < sceneText.length) {
      const origIsWs = /\s/.test(sceneText[origOffset]);
      const normIsSpace = normText[normCount] === ' ';
      if (origIsWs && normIsSpace) {
        // Consume the entire whitespace run in original, but only one space in norm
        normCount++;
        while (origOffset < sceneText.length && /\s/.test(sceneText[origOffset])) origOffset++;
      } else {
        normCount++;
        origOffset++;
      }
    }
    return { start: origOffset, end: Math.min(origOffset + highlightedText.length, sceneText.length) };
  }

  // fallback: match on first 4 words
  const firstWords = highlightedText.split(/\s+/).slice(0, 4).join(' ');
  if (firstWords.length >= 8) {
    const tokenIdx = lowerScene.indexOf(firstWords.toLowerCase());
    if (tokenIdx !== -1) {
      return { start: tokenIdx, end: Math.min(tokenIdx + highlightedText.length, sceneText.length) };
    }
  }

  return null;
}
