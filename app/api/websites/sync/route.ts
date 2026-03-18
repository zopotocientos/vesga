import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { keywordToSlug, keywordToTitleSlug } from '@/lib/scraper'

type SlugType = 'slug' | 'title' | 'query'

const PATTERN_SITES: { label: string; base: string; suffix: string; slugFn: SlugType }[] = [
  { label: 'Fapello',            base: 'https://fapello.com/search_v2/',      suffix: '/', slugFn: 'slug' },
  { label: 'Fapopedia',          base: 'https://fapopedia.net/',               suffix: '/', slugFn: 'slug' },
  { label: 'NudoStar TV',        base: 'https://nudostar.tv/models/',          suffix: '/', slugFn: 'slug' },
  { label: 'Fapeza',             base: 'https://fapeza.com/search/',           suffix: '/', slugFn: 'title' },
  { label: 'Nudogram',           base: 'https://nudogram.com/search/',         suffix: '/', slugFn: 'title' },
  { label: 'Faponic',            base: 'https://faponic.com/search/',          suffix: '/', slugFn: 'title' },
  { label: 'The Fappening Blog', base: 'https://thefappeningblog.com/search/', suffix: '/', slugFn: 'title' },
  { label: 'Leaked Models',      base: 'https://es.leakedmodels.com/search/?s=', suffix: '', slugFn: 'query' },
]

function buildUrl(keyword: string, site: typeof PATTERN_SITES[0]): string {
  let slug: string
  if (site.slugFn === 'title') {
    slug = keywordToTitleSlug(keyword)
  } else if (site.slugFn === 'query') {
    slug = encodeURIComponent(keyword.trim())
  } else {
    slug = keywordToSlug(keyword)
  }
  return `${site.base}${slug}${site.suffix}`
}

export async function POST() {
  const { data: keywords, error: kwError } = await supabase
    .from('keywords')
    .select('*')

  if (kwError) return NextResponse.json({ error: kwError.message }, { status: 500 })
  if (!keywords?.length) return NextResponse.json({ added: 0, message: 'No keywords found' })

  let added = 0
  let skipped = 0

  for (const keyword of keywords) {
    for (const site of PATTERN_SITES) {
      const url = buildUrl(keyword.name, site)
      const label = `${site.label} — ${keyword.name}`

      const { data: existing } = await supabase
        .from('websites')
        .select('id')
        .eq('url', url)
        .limit(1)

      if (existing?.length) { skipped++; continue }

      const { error } = await supabase.from('websites').insert({ url, label })
      if (!error) added++
    }
  }

  return NextResponse.json({ added, skipped })
}
