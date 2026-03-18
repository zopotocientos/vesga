import axios from 'axios'
import * as cheerio from 'cheerio'

export type ScrapeResult = {
  success: boolean
  text?: string
  links?: { href: string; text: string }[]
  error?: string
}

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

    return { success: true, text, links }
  } catch (err: any) {
    const msg =
      err.code === 'ECONNABORTED' ? 'Request timed out' :
      err.response?.status ? `HTTP ${err.response.status}` : err.message
    return { success: false, error: msg }
  }
}

export function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim()
}

export function keywordToTitleSlug(keyword: string): string {
  return keyword
    .split(/[\s_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-')
}

// For sites like es.leakedmodels.com that use ?s=Keyword+Name query format
function keywordToQueryString(keyword: string): string {
  return encodeURIComponent(keyword.trim())
}

export type UrlPatternResult = {
  keyword: string
  matchUrl: string
  exists: boolean
}

type PatternSite = {
  label: string
  check: (keyword: string) => Promise<UrlPatternResult | null>
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Generic checker for sites that use /search/Title-Slug/ pattern
// Verifies the keyword appears in static HTML to reduce false positives
async function checkTitleSlugSite(
  keyword: string,
  base: string
): Promise<UrlPatternResult | null> {
  const titleSlug = keywordToTitleSlug(keyword)
  const url = `${base}${titleSlug}/`
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    })
    if (res.status === 200) {
      const pageText = res.data?.toString().toLowerCase() || ''
      const slug = keywordToSlug(keyword)
      if (pageText.includes(slug)) return { keyword, matchUrl: url, exists: true }
    }
  } catch {}
  return null
}

// Generic checker for sites that use direct /slug/ profile URL pattern
async function checkDirectSlugSite(
  keyword: string,
  base: string
): Promise<UrlPatternResult | null> {
  const slug = keywordToSlug(keyword)
  const url = `${base}${slug}/`
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      maxRedirects: 0,
      validateStatus: (s) => s < 500,
    })
    if (res.status === 200) return { keyword, matchUrl: url, exists: true }
  } catch {}
  return null
}

// ── Site-specific checkers ─────────────────────────────────────────────────

async function checkFapello(keyword: string): Promise<UrlPatternResult | null> {
  const slug = keywordToSlug(keyword)
  const searchUrl = `https://fapello.com/search_v2/${slug}/`
  try {
    const apiUrl = `https://fapello.com/search_v2/?ajax=1&q=${encodeURIComponent(slug)}&type=models&limit=1`
    const res = await axios.get(apiUrl, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    })
    const total = res.data?.total ?? 0
    if (total > 0) return { keyword, matchUrl: searchUrl, exists: true }
  } catch {}
  return null
}

async function checkLeakedModels(keyword: string): Promise<UrlPatternResult | null> {
  const query = keywordToQueryString(keyword)
  const url = `https://es.leakedmodels.com/search/?s=${query}`
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    })
    if (res.status === 200) {
      const pageText = res.data?.toString().toLowerCase() || ''
      const slug = keywordToSlug(keyword)
      if (pageText.includes(slug)) return { keyword, matchUrl: url, exists: true }
    }
  } catch {}
  return null
}

// ── Registry ───────────────────────────────────────────────────────────────
export const PATTERN_SITES: PatternSite[] = [
  { label: 'Fapello',           check: (kw) => checkFapello(kw) },
  { label: 'Fapopedia',         check: (kw) => checkDirectSlugSite(kw, 'https://fapopedia.net/') },
  { label: 'NudoStar TV',       check: (kw) => checkDirectSlugSite(kw, 'https://nudostar.tv/models/') },
  { label: 'Fapeza',            check: (kw) => checkTitleSlugSite(kw, 'https://fapeza.com/search/') },
  { label: 'Nudogram',          check: (kw) => checkTitleSlugSite(kw, 'https://nudogram.com/search/') },
  { label: 'Faponic',           check: (kw) => checkTitleSlugSite(kw, 'https://faponic.com/search/') },
  { label: 'The Fappening Blog',check: (kw) => checkTitleSlugSite(kw, 'https://thefappeningblog.com/search/') },
  { label: 'Leaked Models',     check: (kw) => checkLeakedModels(kw) },
]

export async function checkUrlPatterns(keyword: string): Promise<UrlPatternResult[]> {
  const results: UrlPatternResult[] = []
  for (const site of PATTERN_SITES) {
    const result = await site.check(keyword)
    if (result) results.push(result)
  }
  return results
}
