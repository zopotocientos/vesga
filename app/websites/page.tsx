'use client'

import { useEffect, useState } from 'react'
import type { Website } from '@/lib/supabase'

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  async function load() {
    const res = await fetch('/api/websites')
    setWebsites(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!url.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/websites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), label: label.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setUrl('')
    setLabel('')
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/websites/${id}`, { method: 'DELETE' })
    setWebsites((prev) => prev.filter((w) => w.id !== id))
  }

  async function syncPatternSites() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/websites/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncMsg(`✓ Done — ${data.added} added, ${data.skipped} already existed`)
      load()
    } catch (err: any) {
      setSyncMsg(`✗ ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  function fmt(date: string) {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Separate pattern-generated URLs from manual ones
  const patternSites = websites.filter((w) =>
    w.url.includes('/search_v2/') || w.label?.includes('Fapello')
  )
  const manualSites = websites.filter((w) =>
    !w.url.includes('/search_v2/') && !w.label?.includes('Fapello')
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Websites</h2>
          <p>Target URLs to scan for keyword matches</p>
        </div>
      </div>

      {/* Manual add */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Add website manually</div>
        <div style={{ padding: '16px 18px' }}>
          <div className="input-row">
            <input
              className="input"
              placeholder="https://example.com/news"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <input
              className="input"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ maxWidth: 200 }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn btn-primary" onClick={add} disabled={saving || !url.trim()}>
              {saving ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '-8px 0 8px' }}>{error}</p>}
        </div>
      </div>

      {/* Auto-sync card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">Auto-generated search URLs</div>
        <div style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px' }}>
            Automatically generates search URLs on pattern-based sites (currently Fapello) for every keyword in your list.
            Run this after adding new models.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={syncPatternSites}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : '⟳ Sync search URLs'}
            </button>
            {syncMsg && (
              <span style={{ fontSize: 12, color: syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
                {syncMsg}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '10px 0 0' }}>
            Currently configured: Fapello (fapello.com/search_v2/). To add more sites, edit URL_PATTERN_SITES in lib/scraper.ts.
          </p>
        </div>
      </div>

      {/* Manual websites table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          {loading ? 'Loading…' : `${manualSites.length} manual website${manualSites.length !== 1 ? 's' : ''}`}
        </div>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : manualSites.length === 0 ? (
          <div className="empty">No manual websites yet. Add one above.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>URL</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {manualSites.map((ws) => (
                <tr key={ws.id}>
                  <td style={{ fontWeight: 500 }}>{ws.label || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                  <td>
                    <a className="url-text" href={ws.url} target="_blank" rel="noopener noreferrer">{ws.url}</a>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(ws.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" onClick={() => remove(ws.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pattern-generated websites table */}
      <div className="card">
        <div className="card-header">
          {loading ? 'Loading…' : `${patternSites.length} auto-generated search URL${patternSites.length !== 1 ? 's' : ''}`}
        </div>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : patternSites.length === 0 ? (
          <div className="empty">No auto-generated URLs yet — click Sync search URLs above.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Search URL</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patternSites.map((ws) => (
                <tr key={ws.id}>
                  <td style={{ fontWeight: 500 }}>{ws.label}</td>
                  <td>
                    <a className="url-text" href={ws.url} target="_blank" rel="noopener noreferrer">{ws.url}</a>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(ws.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" onClick={() => remove(ws.id)}>Remove</button>
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
