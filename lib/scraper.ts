import axios from 'axios'
import * as cheerio from 'cheerio'

export type ScrapeResult = {
  success: boolean
  text?: string
  error?: string
}

/**
 * Fetches a page and extracts clean plain text.
 * Works well for static HTML pages.
 *
 * For JS-rendered pages (SPAs, React apps, etc.) that return empty content,
 * swap this function with a ScrapingBee call:
 *
 *   const res = await axios.get('https://app.scrapingbee.com/api/v1', {
 *     params: { api_key: process.env.SCRAPINGBEE_API_KEY, url, render_js: true }
 *   })
 */
export async function scrapePage(url: string): Promise<ScrapeResult> {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KeywordMonitor/1.0; +https://github.com/your-org/keyword-monitor)',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    })

    const $ = cheerio.load(response.data)

    // Remove noise elements before extracting text
    $('script, style, nav, footer, header, noscript, iframe, [aria-hidden="true"]').remove()

    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      return { success: false, error: 'Page returned empty content — may require JS rendering' }
    }

    return { success: true, text }
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
