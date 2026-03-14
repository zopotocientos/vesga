import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { scrapePage } from '@/lib/scraper'
import { findMatches } from '@/lib/matcher'
import { sendReport, type MatchReport } from '@/lib/email'

export const maxDuration = 60

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.SCAN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: scanRun, error: runError } = await supabase
    .from('scan_runs')
    .insert({ status: 'running' })
    .select()
    .single()

  if (runError || !scanRun) {
    return NextResponse.json({ error: runError?.message ?? 'Failed to create scan run' }, { status: 500 })
  }

  try {
    const { data: keywords } = await supabase.from('keywords').select('*')
    const { data: websites } = await supabase.from('websites').select('*')

    if (!keywords?.length || !websites?.length) {
      await supabase
        .from('scan_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', scanRun.id)

      return NextResponse.json({
        scan_run_id: scanRun.id,
        message: 'Nothing to scan — add keywords and websites first',
      })
    }

    const keywordNames = keywords.map((k) => k.name)
    const reportMatches: MatchReport[] = []
    let sitesScanned = 0
    let matchesFound = 0
    let newMatches = 0

    for (const website of websites) {
      const { success, text, links, error: scrapeError } = await scrapePage(website.url)
      sitesScanned++

      if (!success || !text) {
        console.warn(`[Scan] Failed to scrape ${website.url}: ${scrapeError}`)
        continue
      }

      const matches = findMatches(text, keywordNames, links)

      for (const match of matches) {
        const keyword = keywords.find((k) => k.name === match.keyword)!

        const { data: prior } = await supabase
          .from('scan_results')
          .select('id')
          .eq('keyword_id', keyword.id)
          .eq('website_id', website.id)
          .limit(1)

        const isNew = !prior?.length
        matchesFound++
        if (isNew) newMatches++

        await supabase.from('scan_results').insert({
          scan_run_id: scanRun.id,
          keyword_id: keyword.id,
          keyword_name: match.keyword,
          website_id: website.id,
          website_url: website.url,
          website_label: website.label || website.url,
          snippet: match.snippet,
          match_url: match.matchUrl ?? null,
          is_new: isNew,
        })

        reportMatches.push({
          keyword_name: match.keyword,
          website_label: website.label || website.url,
          website_url: website.url,
          match_url: match.matchUrl,
          snippet: match.snippet,
          is_new: isNew,
        })
      }
    }

    await supabase
      .from('scan_runs')
      .update({
        status: 'completed',
        sites_scanned: sitesScanned,
        matches_found: matchesFound,
        new_matches: newMatches,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanRun.id)

    const shouldEmail = reportMatches.length > 0 || process.env.SEND_EMPTY_REPORTS === 'true'
    if (shouldEmail) {
      await sendReport(reportMatches, {
        sites_scanned: sitesScanned,
        matches_found: matchesFound,
        new_matches: newMatches,
        scan_date: new Date(),
      })
    }

    return NextResponse.json({
      scan_run_id: scanRun.id,
      sites_scanned: sitesScanned,
      matches_found: matchesFound,
      new_matches: newMatches,
    })
  } catch (err: any) {
    await supabase
      .from('scan_runs')
      .update({
        status: 'failed',
        error: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanRun.id)

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
