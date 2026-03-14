import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Keyword = {
  id: string
  name: string
  created_at: string
}

export type Website = {
  id: string
  url: string
  label: string
  created_at: string
}

export type ScanResult = {
  id: string
  scan_run_id: string
  keyword_id: string
  keyword_name: string
  website_id: string
  website_url: string
  website_label: string
  snippet: string
  match_url: string | null
  is_new: boolean
  created_at: string
}

export type ScanRun = {
  id: string
  status: 'running' | 'completed' | 'failed'
  sites_scanned: number
  matches_found: number
  new_matches: number
  error?: string
  started_at: string
  completed_at?: string
}
