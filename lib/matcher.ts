export type Match = {
  keyword: string
  snippet: string
  occurrences: number
  matchUrl?: string
}

/**
 * Searches text for all keyword occurrences.
 * Also finds the most relevant link on the page associated with the keyword —
 * i.e. an anchor tag whose text contains the keyword, likely pointing to the
 * specific content page (gallery, video, profile) where the name appears.
 */
export function findMatches(
  text: string,
  keywords: string[],
  links?: { href: string; text: string }[]
): Match[] {
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

    // Extract a readable snippet around the first occurrence
    const CONTEXT = 120
    const start = Math.max(0, firstIndex - CONTEXT)
    const end = Math.min(text.length, firstIndex + keyword.length + CONTEXT)
    const raw = text.slice(start, end).trim()
    const snippet = (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '')

    // Find the best matching link — prefer links whose anchor text contains the keyword
    let matchUrl: string | undefined
    if (links && links.length > 0) {
      const lowerKw = keyword.toLowerCase()

      // First priority: anchor text directly contains the keyword
      const directMatch = links.find((l) => l.text.toLowerCase().includes(lowerKw))
      if (directMatch) {
        matchUrl = directMatch.href
      } else {
        // Second priority: any link on the page (first non-navigation link)
        const fallback = links.find(
          (l) =>
            !l.href.includes('#') &&
            !l.href.endsWith('/') &&
            l.text.length > 2
        )
        if (fallback) matchUrl = fallback.href
      }
    }

    matches.push({ keyword, snippet, occurrences, matchUrl })
  }

  return matches
}
