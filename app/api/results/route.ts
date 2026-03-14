import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'results'
  const limit = parseInt(searchParams.get('limit') ?? '50')

  if (type === 'runs') {
    const { data, error } = await supabase
      .from('scan_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Default: return scan results
  const { data, error } = await supabase
    .from('scan_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
