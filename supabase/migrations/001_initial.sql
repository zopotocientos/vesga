-- Keywords table
create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Websites table
create table public.websites (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  label text,
  created_at timestamptz default now()
);

-- Scan runs table (one row per daily scan execution)
create table public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running', -- running | completed | failed
  sites_scanned integer default 0,
  matches_found integer default 0,
  new_matches integer default 0,
  error text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Scan results table (one row per keyword+website match)
create table public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_run_id uuid references public.scan_runs(id) on delete cascade,
  keyword_id uuid references public.keywords(id) on delete cascade,
  keyword_name text not null,
  website_id uuid references public.websites(id) on delete cascade,
  website_url text not null,
  website_label text,
  snippet text,
  is_new boolean default true,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index on public.scan_results(keyword_id);
create index on public.scan_results(website_id);
create index on public.scan_results(scan_run_id);
create index on public.scan_results(is_new);
create index on public.scan_runs(started_at desc);

-- Row Level Security (enable for all tables)
alter table public.keywords enable row level security;
alter table public.websites enable row level security;
alter table public.scan_runs enable row level security;
alter table public.scan_results enable row level security;

-- Service role has full access (used by the app via SUPABASE_SERVICE_ROLE_KEY)
create policy "Service role full access" on public.keywords for all using (true);
create policy "Service role full access" on public.websites for all using (true);
create policy "Service role full access" on public.scan_runs for all using (true);
create policy "Service role full access" on public.scan_results for all using (true);
