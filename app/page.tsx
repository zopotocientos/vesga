'use client'

import { useEffect, useState } from 'react'
import type { ScanRun } from '@/lib/supabase'

export default function DashboardPage() {
  const [runs, setRuns] = useState<ScanRun[]>([])
  const [stats, setStats] = useState({ keywords: 0, websites: 0, totalMatches: 0, newMatches: 0 })
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [scanError, setScanError] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [runsRes, kwRes, wsRes, resultsRes] = await Promise.all([
        fetch('/api/results?type=runs&limit=10'),
        fetch('/api/keywords'),
        fetch('/api/websites'),
        fetch('/api/results?limit=500'),
      ])
      const [runsData, kwData, wsData, resultsData] = await Promise.all([
        runsRes.json(),
        kwRes.json(),
        wsRes.json(),
        resultsRes.json(),
      ])
      setRuns(Array.isArray(runsData) ? runsData : [])
      setStats({
        keywords: Array.isArray(kwData) ? kwData.length : 0,
        websites: Array.isArray(wsData) ? wsData.length : 0,
        totalMatches: Array.isArray(resultsData) ? resultsData.length : 0,
        newMatches: Array.isArray(resultsData) ? resultsData.filter((r: any) => r.is_new).length : 0,
      })
    } catch (err) {
      console.error('Failed to load dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function triggerScan() {
    setScanning(true)
    setScanMsg('Running scan…')
    setScanError(false)
    try {
      const secret = process.env.NEXT_PUBLIC_SCAN_SECRET
      if (!secret) throw new Error('NEXT_PUBLIC_SCAN_SECRET is not set — redeploy Netlify after adding it')
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScanMsg(`✓ Done — ${data.sites_scanned} sites, ${data.matches_found} matches (${data.new_matches} new)`)
      load()
    } catch (err: any) {
      setScanMsg(`✗ ${err.message}`)
      setScanError(true)
    } finally {
      setScanning(false)
    }
  }

  function fmt(date: string) {
    return new Date(date).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  function dur(run: ScanRun) {
    if (!run.completed_at) return '—'
    const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
    return ms < 60000 ? `${(ms / 1000).toFixed(0)}s` : `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Monitor overview and scan history</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {scanMsg && (
            <span style={{ fontSize: 12, color: scanError ? 'var(--red)' : scanning ? 'var(--accent)' : 'var(--green)' }}>
              {scanMsg}
            </span>
          )}
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            ↻ Refresh
          </button>
          <button
            className={`btn btn-primary ${scanning ? 'btn-scan-running' : ''}`}
            onClick={triggerScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning…' : '▶ Run scan now'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading…</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Keywords</div>
              <div className="value">{stats.keywords}</div>
            </div>
            <div className="stat-card">
              <div className="label">Websites</div>
              <div className="value">{stats.websites}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total matches</div>
              <div className="value amber">{stats.totalMatches}</div>
            </div>
            <div className="stat-card">
              <div className="label">New matches</div>
              <div className="value green">{stats.newMatches}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Recent scan runs</div>
            {runs.length === 0 ? (
              <div className="empty">No scans yet — run your first scan above.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Sites</th>
                    <th>Matches</th>
                    <th>New</th>
                    <th>Duration</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{fmt(run.started_at)}</td>
                      <td><span className={`badge ${run.status}`}>{run.status}</span></td>
                      <td className="mono">{run.sites_scanned}</td>
                      <td className="mono">{run.matches_found}</td>
                      <td className="mono" style={{ color: run.new_matches > 0 ? 'var(--green)' : undefined }}>
                        {run.new_matches}
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{dur(run)}</td>
                      <td style={{ fontSize: 12, color: 'var(--red)' }}>{run.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  )
}
