export type MatchReport = {
  keyword_name: string
  website_label: string
  website_url: string
  snippet: string
  is_new: boolean
}

export type ScanSummary = {
  sites_scanned: number
  matches_found: number
  new_matches: number
  scan_date: Date
}

/**
 * Sends the daily digest email.
 *
 * To activate email sending, uncomment ONE provider block below
 * and add the corresponding env vars to .env.local and Vercel.
 */
export async function sendReport(
  matches: MatchReport[],
  summary: ScanSummary
): Promise<void> {
  const to = process.env.REPORT_EMAIL_TO!
  const from = process.env.REPORT_EMAIL_FROM!
  const newCount = matches.filter((m) => m.is_new).length

  const subject =
    newCount > 0
      ? `[Monitor] ${newCount} new match${newCount > 1 ? 'es' : ''} — ${summary.scan_date.toLocaleDateString()}`
      : `[Monitor] No new matches — ${summary.scan_date.toLocaleDateString()}`

  const html = buildEmailHtml(matches, summary)

  // ── Option A: Resend ──────────────────────────────────────────────────────
  // npm install resend
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from, to, subject, html })

  // ── Option B: SendGrid ────────────────────────────────────────────────────
  // npm install @sendgrid/mail
  // const sgMail = (await import('@sendgrid/mail')).default
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  // await sgMail.send({ from, to, subject, html })

  // ── Option C: SMTP (nodemailer) ───────────────────────────────────────────
  // npm install nodemailer @types/nodemailer
  // const nodemailer = await import('nodemailer')
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT),
  //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // })
  // await transporter.sendMail({ from, to, subject, html })

  // ── Fallback: log to console until a provider is configured ───────────────
  console.log(`[Email] Subject: ${subject}`)
  console.log(`[Email] To: ${to} | Matches: ${matches.length} total, ${newCount} new`)
}

function buildEmailHtml(matches: MatchReport[], summary: ScanSummary): string {
  const newMatches = matches.filter((m) => m.is_new)
  const oldMatches = matches.filter((m) => !m.is_new)

  const row = (m: MatchReport) => `
    <tr>
      <td style="padding:10px 8px;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e7eb">${escape(m.keyword_name)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">
        <a href="${m.website_url}" style="color:#2563eb;text-decoration:none">${escape(m.website_label || m.website_url)}</a>
      </td>
      <td style="padding:10px 8px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-style:italic">${escape(m.snippet)}</td>
    </tr>`

  const table = (rows: MatchReport[]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em">Keyword</th>
          <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em">Website</th>
          <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em">Context</th>
        </tr>
      </thead>
      <tbody>${rows.map(row).join('')}</tbody>
    </table>`

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff">
  <div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px;font-weight:700">Keyword Monitor</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${summary.scan_date.toLocaleString()} · ${summary.sites_scanned} sites scanned · ${summary.matches_found} matches</p>
  </div>

  ${newMatches.length > 0 ? `
  <h2 style="font-size:15px;font-weight:600;color:#dc2626;margin:0 0 12px">🔴 New matches (${newMatches.length})</h2>
  ${table(newMatches)}
  ` : `<p style="color:#16a34a;font-weight:500">✅ No new matches found.</p>`}

  ${oldMatches.length > 0 ? `
  <h2 style="font-size:15px;font-weight:600;color:#d97706;margin:24px 0 12px">⚠️ Previously seen (${oldMatches.length})</h2>
  ${table(oldMatches)}
  ` : ''}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Sent by Keyword Monitor · <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}" style="color:#9ca3af">Open dashboard</a>
  </div>
</body>
</html>`
}

function escape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
