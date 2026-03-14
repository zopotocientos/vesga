'use client'

import { useEffect, useState } from 'react'
import type { ScanResult } from '@/lib/supabase'

export default function ResultsPage() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [filter, setFilter] = useState<'all' | 'new' | 'seen'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function load() {
    setLoading(true)
    fetch('/api/results?limit=200')
      .then((r) => r.json())
      .then((data) => { setResults(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function clearAll() {
    setClearing(true)
    try {
      await fetch('/api/results', { method: 'DELETE' })
      setResults([])
      setShowConfirm(false)
    } finally {
      setClearing(false)
    }
  }

  const filtered = results.filter((r) => {
    const matchesFilter =
      filter === 'all' || (filter === 'new' && r.is_new) || (filter === 'seen' && !r.is_new)
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      r.keyword_name.toLowerCase().includes(q) ||
      r.website_label?.toLowerCase().includes(q) ||
      r.website_url.toLowerCase().includes(q) ||
      r.snippet?.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  function fmt(date: string) {
    return new Date(date).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Results</h2>
          <p>All keyword matches found across scans</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {showConfirm ? (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Delete all results?</span>
              <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--red)' }} onClick={clearAll} disabled={clearing}>
                {clearing ? 'Deleting…' : 'Yes, delete all'}
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--red)' }} onClick={() => setShowConfirm(true)}>
              🗑 Clear all results
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {(['all', 'new', 'seen'] as const).map((f) => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'new' && ` (${results.filter(r => r.is_new).length})`}
            {f === 'all' && ` (${results.length})`}
          </button>
        ))}
        <input
          className="input"
          placeholder="Search keyword, site, context…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280, marginLeft: 'auto' }}
        />
      </div>

      <div className="card">
        <div className="card-header">
          {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        </div>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {results.length === 0 ? 'No matches found yet — run a scan first.' : 'No results match your filter.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Website</th>
                <th>Content link</th>
                <th>Context</th>
                <th>Status</th>
                <th>Found</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {r.keyword_name}
                  </td>
                  <td>
                    <a className="url-text" href={r.website_url} target="_blank" rel="noopener noreferrer">
                      {r.website_label || r.website_url}
                    </a>
                  </td>
                  <td>
                    {r.match_url ? (
                      <a
                        href={r.match_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-text"
                        style={{ color: 'var(--red)', fontSize: 12 }}
                      >
                        View content ↗
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <p className="snippet">{r.snippet}</p>
                  </td>
                  <td>
                    <span className={`badge ${r.is_new ? 'new' : 'seen'}`}>
                      {r.is_new ? 'new' : 'seen'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {fmt(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
