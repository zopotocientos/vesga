export type MatchReport = {
  keyword_name: string
  website_label: string
  website_url: string
  match_url?: string
  snippet: string
  is_new: boolean
}

export type ScanSummary = {
  sites_scanned: number
  matches_found: number
  new_matches: number
  scan_date: Date
}

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

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({ from, to, subject, html })
}

function buildDmcaNotice(m: MatchReport, date: string): string {
  const infringingUrl = m.match_url || m.website_url
  return `
<div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:20px;margin-top:12px;font-size:13px;line-height:1.7;color:#1c1917">
  <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#854d0e;margin-bottom:12px">
    📋 DMCA Takedown Notice — ready to send
  </div>

  <p style="margin:0 0 12px"><strong>To:</strong> DMCA Agent / Abuse Department of ${escape(m.website_label || m.website_url)}<br>
  <strong>Re:</strong> DMCA Takedown Notice — Unauthorized Use of Copyrighted Material<br>
  <strong>Date:</strong> ${date}</p>

  <p style="margin:0 0 12px">Dear DMCA Agent,</p>

  <p style="margin:0 0 12px">I am writing on behalf of <strong>[AGENCY/MANAGER NAME]</strong>, the authorized representative and manager of <strong>${escape(m.keyword_name)}</strong> (the "Copyright Owner"), who is the original creator and exclusive copyright holder of the content described below.</p>

  <p style="margin:0 0 8px"><strong>1. Copyrighted Work Being Infringed</strong><br>
  Original photos and/or videos featuring ${escape(m.keyword_name)}, originally published on platforms including but not limited to OnlyFans, Instagram, and other authorized platforms operated by or on behalf of the Copyright Owner.</p>

  <p style="margin:0 0 8px"><strong>2. Infringing Material</strong><br>
  The following URL contains content that reproduces, distributes, or publicly displays the copyrighted works without authorization:<br>
  <a href="${infringingUrl}" style="color:#2563eb;word-break:break-all">${infringingUrl}</a></p>

  <p style="margin:0 0 8px"><strong>3. Statement of Good Faith</strong><br>
  I have a good faith belief that the use of the material described above is not authorized by the copyright owner, its agent, or the law.</p>

  <p style="margin:0 0 8px"><strong>4. Statement of Accuracy</strong><br>
  I swear, under penalty of perjury, that the information in this notification is accurate and that I am authorized to act on behalf of the Copyright Owner.</p>

  <p style="margin:0 0 8px"><strong>5. Contact Information</strong><br>
  Name: [YOUR FULL NAME]<br>
  Title: [YOUR TITLE — e.g. Talent Manager]<br>
  Agency: [AGENCY NAME]<br>
  Email: [YOUR EMAIL]<br>
  Phone: [YOUR PHONE — optional]<br>
  Address: [YOUR ADDRESS]</p>

  <p style="margin:0 0 12px"><strong>6. Requested Action</strong><br>
  We request the immediate removal or disabling of access to the infringing material identified above.</p>

  <p style="margin:0 0 0">Sincerely,<br>
  [YOUR FULL NAME]<br>
  [AGENCY NAME] — on behalf of ${escape(m.keyword_name)}</p>

  <div style="margin-top:16px;padding-top:12px;border-top:1px solid #fde047;font-size:11px;color:#92400e">
    ⚠️ Replace all [BRACKETED] fields before sending. To find the site's DMCA agent, check their website footer, /dmca page, or search the Copyright Office directory at copyright.gov/dmca-directory.
  </div>
</div>`
}

function buildEmailHtml(matches: MatchReport[], summary: ScanSummary): string {
  const newMatches = matches.filter((m) => m.is_new)
  const oldMatches = matches.filter((m) => !m.is_new)
  const date = summary.scan_date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const row = (m: MatchReport, includeDmca: boolean) => `
    <tr>
      <td colspan="4" style="padding:16px 8px 4px;border-bottom:none">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 4px;font-family:monospace;font-weight:700;font-size:14px">${escape(m.keyword_name)}</td>
            <td style="padding:0 0 4px;text-align:right">
              ${m.is_new
                ? '<span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px">NEW</span>'
                : '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px">SEEN BEFORE</span>'
              }
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0 0 4px;font-size:12px;color:#6b7280">
              Found on: <a href="${m.website_url}" style="color:#2563eb">${escape(m.website_label || m.website_url)}</a>
              ${m.match_url ? ` &nbsp;·&nbsp; <a href="${m.match_url}" style="color:#dc2626;font-weight:600">View stolen content ↗</a>` : ''}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:4px 0 0;font-size:12px;color:#6b7280;font-style:italic">${escape(m.snippet)}</td>
          </tr>
        </table>
        ${includeDmca ? buildDmcaNotice(m, date) : ''}
      </td>
    </tr>
    <tr><td colspan="4" style="padding:0;border-bottom:2px solid #e5e7eb"></td></tr>`

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:760px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff">

  <div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px;font-weight:700">Keyword Monitor</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">
      ${summary.scan_date.toLocaleString()} &nbsp;·&nbsp;
      ${summary.sites_scanned} sites scanned &nbsp;·&nbsp;
      ${summary.matches_found} matches found
    </p>
  </div>

  ${newMatches.length > 0 ? `
    <h2 style="font-size:15px;font-weight:600;color:#dc2626;margin:0 0 16px">
      🔴 New matches (${newMatches.length}) — DMCA notices included below
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px">
      ${newMatches.map((m) => row(m, true)).join('')}
    </table>
  ` : `<p style="color:#16a34a;font-weight:500">✅ No new matches found.</p>`}

  ${oldMatches.length > 0 ? `
    <h2 style="font-size:15px;font-weight:600;color:#d97706;margin:0 0 16px">
      ⚠️ Previously seen (${oldMatches.length})
    </h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px">
      ${oldMatches.map((m) => row(m, false)).join('')}
    </table>
  ` : ''}

  <div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280">
    <strong style="color:#111827">How to send a DMCA notice:</strong><br>
    1. Find the site's DMCA contact — check their footer, /dmca page, or <a href="https://www.copyright.gov/dmca-directory" style="color:#2563eb">copyright.gov/dmca-directory</a><br>
    2. Fill in all [BRACKETED] fields in the notice above<br>
    3. Send via email or their designated DMCA submission form<br>
    4. Keep a copy for your records — hosts must respond within 10–14 business days
  </div>

  <div style="margin-top:16px;font-size:11px;color:#9ca3af">
    Sent by Keyword Monitor &nbsp;·&nbsp; This is not legal advice — consult an IP attorney for complex cases
  </div>
</body>
</html>`
}

function escape(str: string): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
