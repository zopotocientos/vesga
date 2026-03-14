'use client'

import { useEffect, useState } from 'react'
import type { Keyword } from '@/lib/supabase'

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/keywords')
    setKeywords(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!input.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: input.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setInput('')
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' })
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  function fmt(date: string) {
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Keywords</h2>
          <p>Names and terms to search for across target websites</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">Add keyword</div>
        <div style={{ padding: '16px 18px' }}>
          <div className="input-row" style={{ marginBottom: error ? 8 : 0 }}>
            <input
              className="input"
              placeholder="e.g. John Smith"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn btn-primary" onClick={add} disabled={saving || !input.trim()}>
              {saving ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 4px' }}>{error}</p>}
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Tip: Add name variants separately — e.g. "John Smith", "J. Smith", "Smith, John"
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          {loading ? 'Loading…' : `${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`}
        </div>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : keywords.length === 0 ? (
          <div className="empty">No keywords yet. Add one above to get started.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr key={kw.id}>
                  <td className="mono" style={{ fontWeight: 500 }}>{kw.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(kw.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" onClick={() => remove(kw.id)}>Remove</button>
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
