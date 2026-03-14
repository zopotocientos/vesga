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

  function fmt(date: string) {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Websites</h2>
          <p>Target URLs to scan for keyword matches</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">Add website</div>
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
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Tip: Point to the most specific page possible (e.g. /news, /mentions) for better results.
            JS-heavy sites may need ScrapingBee — see <code>lib/scraper.ts</code>.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          {loading ? 'Loading…' : `${websites.length} website${websites.length !== 1 ? 's' : ''}`}
        </div>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : websites.length === 0 ? (
          <div className="empty">No websites yet. Add one above to get started.</div>
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
              {websites.map((ws) => (
                <tr key={ws.id}>
                  <td style={{ fontWeight: 500 }}>{ws.label || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                  <td>
                    <a className="url-text" href={ws.url} target="_blank" rel="noopener noreferrer">
                      {ws.url}
                    </a>
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
