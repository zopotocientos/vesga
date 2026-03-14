export type Match = {
  keyword: string
  snippet: string
  occurrences: number
}

/**
 * Searches text for all keyword occurrences.
 * Case-insensitive. Returns a match with surrounding context snippet.
 *
 * For names that appear in multiple formats (e.g. "J. Smith", "Smith, John"),
 * add each variant as a separate keyword in the admin UI.
 */
export function findMatches(text: string, keywords: string[]): Match[] {
  const matches: Match[] = []
  const lowerText = text.toLowerCase()

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase()
    const firstIndex = lowerText.indexOf(lowerKeyword)

    if (firstIndex === -1) continue

    // Count all occurrences
    let occurrences = 0
    let pos = 0
    while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
      occurrences++
      pos += lowerKeyword.length
    }

    // Extract a readable snippet around the FIRST occurrence
    const CONTEXT = 120
    const start = Math.max(0, firstIndex - CONTEXT)
    const end = Math.min(text.length, firstIndex + keyword.length + CONTEXT)
    const raw = text.slice(start, end).trim()
    const snippet = (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '')

    matches.push({ keyword, snippet, occurrences })
  }

  return matches
}
