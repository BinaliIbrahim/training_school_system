import sgMail from '@sendgrid/mail'

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ibratechinnovations.com'
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'SMS Pro'
const APP_URL = process.env.APP_URL || 'https://sms.ibratechinnovations.com'

let configured = false

export function initEmail() {
  const key = process.env.SENDGRID_API_KEY
  if (key) {
    sgMail.setApiKey(key)
    configured = true
  } else {
    console.warn('SENDGRID_API_KEY not set — emails will be skipped')
  }
}

export function buildNotificationHtml({ title, message, ctaLabel, ctaUrl }) {
  const button = ctaUrl
    ? `<p style="margin-top:24px"><a href="${ctaUrl}" style="background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${ctaLabel || 'Open SMS Pro'}</a></p>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <div style="font-size:12px;color:#6366f1;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px">SMS Pro</div>
  <h2 style="margin:0 0 12px;color:#0f172a">${title}</h2>
  <p style="color:#475569;line-height:1.6;margin:0">${message}</p>
  ${button}
  <p style="margin-top:32px;font-size:11px;color:#94a3b8">Ibratech Innovations · School Management System</p>
</div></body></html>`
}

export async function sendEmail({ to, subject, text, html }) {
  if (!configured || !to) return { sent: false, reason: 'not_configured' }
  try {
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      text: text || subject,
      html: html || `<p>${text || subject}</p>`,
    })
    return { sent: true }
  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message)
    return { sent: false, reason: err.message }
  }
}

export { APP_URL }
