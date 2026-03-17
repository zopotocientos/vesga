import axios from 'axios'
import * as cheerio from 'cheerio'

export type ScrapeResult = {
  success: boolean
  text?: string
  links?: { href: string; text: string }[]
  error?: string
}

/**
 * Standard scraper — fetches page HTML and extracts text + links.
 * Works for static HTML sites.
 */
export async function scrapePage(url: string): Promise<ScrapeResult> {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KeywordMonitor/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    })

    const $ = cheerio.load(response.data)

    // Extract all links before removing elements
    const links: { href: string; text: string }[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().trim()
      let resolvedHref = href
      try { resolvedHref = new URL(href, url).toString() } catch {}
      if (resolvedHref.startsWith('http') && text.length > 0) {
        links.push({ href: resolvedHref, text })
      }
    })

    $('script, style, nav, footer, header, noscript, iframe, [aria-hidden="true"]').remove()
    const text = $('body').text().replace(/\s+/g, ' ').trim()

    if (!text) {
      return { success: false, error: 'Page returned empty content — may require JS rendering' }
    }

    return { success: true, text, links: links.length > 0 ? links : [{ href: url, text: url }] }
  } catch (err: any) {
    const msg =
      err.code === 'ECONNABORTED' ? 'Request timed out' :
      err.response?.status ? `HTTP ${err.response.status}` : err.message
    return { success: false, error: msg }
  }
}

/**
 * URL pattern scanner — checks if a keyword-derived URL exists on a site.
 *
 * Used for sites like fapello.com that encode model names in their URL
 * structure (e.g. /marissa-dubois/) rather than displaying them as text.
 *
 * Converts a keyword to a URL slug and checks if the page exists (HTTP 200).
 *
 * To add more sites with this pattern, add entries to URL_PATTERN_SITES below.
 */

// Sites that use keyword-as-slug URL patterns
// Format: { base: 'https://site.com/', suffix: '/' }
// The scanner will try: base + slug + suffix
// e.g. https://fapello.com/marissa-dubois/
export const URL_PATTERN_SITES: { base: string; suffix: string }[] = [
  { base: 'https://fapello.com/search_v2/', suffix: '/' },
  // Add more sites here as needed, e.g.:
  // { base: 'https://example.com/models/', suffix: '/' },
]

/**
 * Converts a keyword to a URL-friendly slug.
 * "Marissa Dubois" -> "marissa-dubois"
 * "Jane_Doe" -> "jane-doe"
 */
export function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim()
}

export type UrlPatternResult = {
  keyword: string
  matchUrl: string
  exists: boolean
}

/**
 * Checks all URL_PATTERN_SITES for a given keyword.
 * Returns results for sites where the profile page exists.
 */
export async function checkUrlPatterns(keyword: string): Promise<UrlPatternResult[]> {
  const slug = keywordToSlug(keyword)
  const results: UrlPatternResult[] = []

  for (const site of URL_PATTERN_SITES) {
    const url = `${site.base}${slug}${site.suffix}`
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KeywordMonitor/1.0)',
          Accept: 'text/html',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // don't throw on 404
      })

      // 200 = profile exists, 404 = doesn't exist
     if (response.status === 200) {
        // Verify the slug actually appears in the static HTML
        // to filter out empty search result pages
        const pageText = response.data?.toString().toLowerCase() || ''
        const slug = keywordToSlug(keyword)

        // Check og:title or <title> contains the slug — broad searches won't
        const titleMatch = pageText.match(/<title[^>]*>(.*?)<\/title>/i)
        const ogTitleMatch = pageText.match(/og:title.*?content="(.*?)"/i)
        const titleText = (titleMatch?.[1] || ogTitleMatch?.[1] || '').toLowerCase()

        if (titleText.includes(slug)) {
          results.push({ keyword, matchUrl: url, exists: true })
        }
      }
    } catch {
      // Network error — skip this site
    }
  }

  return results
}
