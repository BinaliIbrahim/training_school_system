import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { BRAND_NAME, PRODUCT_NAME } from '../constants/brand'
import { getRoleLabel } from '../constants/roles'

const BRAND = {
  deep: [49, 46, 129],
  primary: [99, 102, 241],
  accent: [139, 92, 246],
  success: [16, 185, 129],
  ink: [30, 27, 75],
  muted: [100, 116, 139],
  zebra: [248, 250, 252],
  white: [255, 255, 255],
  tipBg: [236, 253, 245],
  tipBorder: [16, 185, 129],
}

const pageWidth = (doc) => doc.internal.pageSize.getWidth()
const pageHeight = (doc) => doc.internal.pageSize.getHeight()
const MARGIN = 14
const contentWidth = (doc) => pageWidth(doc) - MARGIN * 2

function createDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

function attachPageFooter(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    const w = pageWidth(doc)
    const h = pageHeight(doc)
    doc.setDrawColor(...BRAND.primary)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, h - 12, w - MARGIN, h - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.muted)
    doc.text(`${BRAND_NAME} — ${PRODUCT_NAME}`, MARGIN, h - 7)
    doc.text(`Page ${i} of ${total}`, w - MARGIN, h - 7, { align: 'right' })
  }
}

function drawCover(doc, manual, meta = {}) {
  const w = pageWidth(doc)
  doc.setFillColor(...BRAND.deep)
  doc.rect(0, 0, w, 72, 'F')
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 72, w, 3, 'F')

  doc.setTextColor(...BRAND.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(BRAND_NAME, MARGIN, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(220, 220, 255)
  doc.text(PRODUCT_NAME, MARGIN, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...BRAND.white)
  doc.text(manual.title, MARGIN, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(220, 220, 255)
  const subLines = doc.splitTextToSize(manual.subtitle || '', contentWidth(doc))
  doc.text(subLines, MARGIN, 50)

  const roleLabel = getRoleLabel(manual.role)
  doc.setFillColor(...BRAND.accent)
  const badge = `Role: ${roleLabel}`
  const badgeW = doc.getTextWidth(badge) + 12
  doc.roundedRect(MARGIN, 58, badgeW, 9, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.white)
  doc.text(badge, MARGIN + 6, 64)

  let y = 84
  doc.setTextColor(...BRAND.ink)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const introLines = doc.splitTextToSize(manual.intro || '', contentWidth(doc))
  doc.text(introLines, MARGIN, y)
  y += introLines.length * 5 + 8

  if (meta.recipientName) {
    doc.setFontSize(9)
    doc.setTextColor(...BRAND.muted)
    doc.text(`Prepared for: ${meta.recipientName}`, MARGIN, y)
    y += 5
  }
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy · HH:mm')}`, MARGIN, y)
  y += 10

  doc.setFillColor(...BRAND.zebra)
  doc.setDrawColor(...BRAND.primary)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, contentWidth(doc), 14 + manual.sections.length * 5, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.primary)
  doc.text('Contents', MARGIN + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.ink)
  manual.sections.forEach((section, i) => {
    doc.text(`${i + 1}. ${section.title.replace(/^\d+\.\s*/, '')}`, MARGIN + 4, y + 12 + i * 5)
  })

  return y + 20 + manual.sections.length * 5
}

function startBodyPages(doc) {
  doc.addPage()
  return 24
}

function ensureSpace(doc, y, needed = 24) {
  if (y + needed > pageHeight(doc) - 18) {
    doc.addPage()
    return 24
  }
  return y
}

function drawSection(doc, section, index, startY) {
  let y = ensureSpace(doc, startY, 30)
  const w = contentWidth(doc)

  doc.setFillColor(...BRAND.primary)
  doc.roundedRect(MARGIN, y, w, 10, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.white)
  doc.text(section.title, MARGIN + 4, y + 7)
  y += 14

  section.steps.forEach((step, stepIndex) => {
    y = ensureSpace(doc, y, 18)
    const numSize = 7
    doc.setFillColor(...BRAND.accent)
    doc.circle(MARGIN + numSize / 2 + 1, y + 3, numSize / 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.white)
    doc.text(String(stepIndex + 1), MARGIN + numSize / 2 + 1, y + 4.2, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BRAND.ink)
    const lines = doc.splitTextToSize(step, w - 14)
    doc.text(lines, MARGIN + 12, y + 4)
    y += Math.max(lines.length * 4.5, 8) + 3
  })

  return y + 4
}

function drawTips(doc, tips, startY) {
  if (!tips?.length) return startY
  let y = ensureSpace(doc, startY, 20 + tips.length * 6)
  const w = contentWidth(doc)

  doc.setFillColor(...BRAND.tipBg)
  doc.setDrawColor(...BRAND.tipBorder)
  doc.setLineWidth(0.4)
  const boxH = 10 + tips.length * 6
  doc.roundedRect(MARGIN, y, w, boxH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.success)
  doc.text('Quick tips', MARGIN + 4, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.ink)
  tips.forEach((tip, i) => {
    const lines = doc.splitTextToSize(`• ${tip}`, w - 10)
    doc.text(lines, MARGIN + 4, y + 13 + i * 6)
  })

  return y + boxH + 6
}

/**
 * Download a role user manual as a branded PDF.
 * @param {object} manual — from getUserManual()
 * @param {{ recipientName?: string, recipientEmail?: string }} meta
 */
export function downloadUserManualPdf(manual, meta = {}) {
  if (!manual) return

  const doc = createDoc()
  drawCover(doc, manual, meta)
  let y = startBodyPages(doc)

  manual.sections.forEach((section, index) => {
    y = drawSection(doc, section, index, y)
  })

  y = drawTips(doc, manual.tips, y)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.muted)
  y = ensureSpace(doc, y, 12)
  doc.text(
    'This guide reflects your SMS Pro role. Contact your school admin if your access differs.',
    MARGIN,
    y + 4,
  )

  const slug = getRoleLabel(manual.role).replace(/\s+/g, '_')
  attachPageFooter(doc)
  doc.save(`SMS_Pro_User_Guide_${slug}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
