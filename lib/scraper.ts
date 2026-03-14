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
        'User-Agent':
          'Mozilla/5.0 (compatible; KeywordMonitor/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    })

    const $ = cheerio.load(response.data)

    // Extract all links with their anchor text before removing elements
    const links: { href: string; text: string }[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const text = $(el).text().trim()

      // Resolve relative URLs
      let resolvedHref = href
      try {
        resolvedHref = new URL(href, url).toString()
      } catch {}

      // Only keep links that point somewhere useful
      if (resolvedHref.startsWith('http') && text.length > 0) {
        links.push({ href: resolvedHref, text })
      }
    })

    // Remove noise before extracting plain text
    $('script, style, nav, footer, header, noscript, iframe, [aria-hidden="true"]').remove()

    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      return { success: false, error: 'Page returned empty content — may require JS rendering' }
    }

    return { success: true, text, links }
  } catch (err: any) {
    const msg =
      err.code === 'ECONNABORTED'
        ? 'Request timed out'
        : err.response?.status
        ? `HTTP ${err.response.status}`
        : err.message

    return { success: false, error: msg }
  }
}
