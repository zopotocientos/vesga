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

  const { data, error } = await supabase
    .from('scan_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE() {
  const { error: resultsError } = await supabase
    .from('scan_results')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 })

  const { error: runsError } = await supabase
    .from('scan_runs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
