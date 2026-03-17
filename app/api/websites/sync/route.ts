import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { keywordToSlug } from '@/lib/scraper'

// Sites that support keyword-as-slug search URLs
// Add more here as needed
const PATTERN_SITES = [
  { base: 'https://fapello.com/search_v2/', suffix: '/', label: 'Fapello' },
]

export async function POST() {
  const { data: keywords, error: kwError } = await supabase
    .from('keywords')
    .select('*')

  if (kwError) return NextResponse.json({ error: kwError.message }, { status: 500 })
  if (!keywords?.length) return NextResponse.json({ added: 0, message: 'No keywords found' })

  let added = 0
  let skipped = 0

  for (const keyword of keywords) {
    const slug = keywordToSlug(keyword.name)

    for (const site of PATTERN_SITES) {
      const url = `${site.base}${slug}${site.suffix}`
      const label = `${site.label} — ${keyword.name}`

      // Check if this URL already exists
      const { data: existing } = await supabase
        .from('websites')
        .select('id')
        .eq('url', url)
        .limit(1)

      if (existing?.length) {
        skipped++
        continue
      }

      const { error } = await supabase
        .from('websites')
        .insert({ url, label })

      if (!error) added++
    }
  }

  return NextResponse.json({ added, skipped })
}
