import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { format } from 'date-fns'
import { BRAND_NAME, PRODUCT_NAME } from '../constants/brand'

/* ── SMS Pro brand palette ── */
const BRAND = {
  deep: [49, 46, 129],
  primary: [99, 102, 241],
  accent: [139, 92, 246],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  ink: [30, 27, 75],
  muted: [100, 116, 139],
  zebra: [248, 250, 252],
  white: [255, 255, 255],
}

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)

const pageWidth = (doc) => doc.internal.pageSize.getWidth()
const pageHeight = (doc) => doc.internal.pageSize.getHeight()

function createDoc(orientation = 'portrait') {
  return new jsPDF({ orientation, unit: 'mm', format: 'a4' })
}

function drawBrandHeader(doc, { title, subtitle, badge }) {
  const w = pageWidth(doc)
  doc.setFillColor(...BRAND.deep)
  doc.rect(0, 0, w, 34, 'F')
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 34, w, 2.5, 'F')

  doc.setTextColor(...BRAND.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(BRAND_NAME, 14, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(220, 220, 255)
  doc.text(PRODUCT_NAME, 14, 17)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...BRAND.white)
  doc.text(title, w / 2, 16, { align: 'center' })

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(220, 220, 255)
    doc.text(subtitle, w / 2, 23, { align: 'center' })
  }

  if (badge) {
    const badgeW = doc.getTextWidth(badge) + 10
    doc.setFillColor(...BRAND.accent)
    doc.roundedRect(w - badgeW - 10, 8, badgeW, 8, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.white)
    doc.text(badge, w - badgeW / 2 - 10, 13.5, { align: 'center' })
  }

  doc.setTextColor(...BRAND.ink)
}

function drawKpiRow(doc, kpis, startY = 42) {
  const w = pageWidth(doc)
  const count = kpis.length
  const gap = 4
  const cardW = (w - 28 - gap * (count - 1)) / count
  let x = 14

  kpis.forEach((kpi) => {
    doc.setFillColor(...BRAND.zebra)
    doc.setDrawColor(...BRAND.primary)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, startY, cardW, 18, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.muted)
    doc.text(kpi.label.toUpperCase(), x + 4, startY + 6)

    doc.setFontSize(11)
    doc.setTextColor(...(kpi.color || BRAND.ink))
    doc.text(String(kpi.value), x + 4, startY + 14)

    x += cardW + gap
  })

  return startY + 24
}

function attachPageFooter(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    const w = pageWidth(doc)
    const h = pageHeight(doc)

    doc.setDrawColor(...BRAND.primary)
    doc.setLineWidth(0.2)
    doc.line(14, h - 12, w - 14, h - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.muted)
    doc.text(`${BRAND_NAME} — ${PRODUCT_NAME}`, 14, h - 7)
    doc.text(`Page ${i} of ${total}`, w - 14, h - 7, { align: 'right' })
  }
}

function addModernTable(doc, { head, body, startY, headColor = BRAND.primary, fontSize = 7, columnStyles }) {
  autoTable(doc, {
    head,
    body,
    startY,
    theme: 'plain',
    styles: {
      fontSize,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      textColor: BRAND.ink,
      valign: 'middle',
    },
    headStyles: {
      fillColor: headColor,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: fontSize + 0.5,
    },
    alternateRowStyles: { fillColor: BRAND.zebra },
    columnStyles,
    margin: { left: 14, right: 14, bottom: 18 },
    showHead: 'everyPage',
    rowPageBreak: 'auto',
    didDrawPage: (data) => {
      if (data.pageNumber > 1 && data.cursor.y < 40) {
        drawBrandHeader(doc, {
          title: data.settings?.docTitle || 'SMS Pro Report',
          subtitle: data.settings?.docSubtitle || '',
        })
        data.cursor.y = 64
      }
    },
  })
}

function resolveCourse(courses, student, matchOwner = false) {
  if (matchOwner) {
    return courses.find((c) => c.id === student.courseId && c.ownerId === student.ownerId)
  }
  return courses.find((c) => c.id === student.courseId)
}

function resolveCohort(cohorts, student, matchOwner = false) {
  if (matchOwner) {
    return cohorts.find((c) => c.id === student.cohortId && c.ownerId === student.ownerId)
  }
  return cohorts.find((c) => c.id === student.cohortId)
}

function calcStudentDue(student, courses, matchOwner = false) {
  const course = resolveCourse(courses, student, matchOwner)
  return (
    (course?.fee ?? 0) +
    (student.registrationFee ?? 0) +
    (student.trainingFee ?? 0) +
    (student.boardingFee ?? 0)
  )
}

function paymentStatus(balance) {
  if (balance <= 0) return 'Paid'
  if (balance > 0) return 'Pending'
  return '—'
}

function sortByName(list) {
  return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function saveDoc(doc, filename) {
  attachPageFooter(doc)
  doc.save(filename)
}

/** Full student export — always uses the complete list, ignoring UI filters */
export function downloadStudentsReport({
  students,
  courses,
  cohorts,
  calcTotalDue,
  calcBalance,
  matchOwner = false,
  schoolName = 'Your School',
  managedUserCount,
}) {
  const doc = createDoc('landscape')
  const today = format(new Date(), 'dd MMM yyyy · HH:mm')
  const allStudents = sortByName(students)

  const totalDue = allStudents.reduce((sum, s) => sum + (calcTotalDue ? calcTotalDue(s) : calcStudentDue(s, courses, matchOwner)), 0)
  const totalCollected = allStudents.reduce((sum, s) => sum + (s.amountPaid ?? 0), 0)
  const totalBalance = totalDue - totalCollected
  const paidCount = allStudents.filter((s) => (calcBalance ? calcBalance(s) : calcStudentDue(s, courses, matchOwner) - (s.amountPaid ?? 0)) <= 0).length

  drawBrandHeader(doc, {
    title: 'Complete Students Report',
    subtitle: `${schoolName} · Generated ${today}`,
    badge: 'FULL EXPORT',
  })

  const tableStart = drawKpiRow(doc, [
    { label: 'Total Students', value: allStudents.length, color: BRAND.primary },
    { label: 'Collected', value: formatCurrency(totalCollected), color: BRAND.success },
    { label: 'Outstanding', value: formatCurrency(totalBalance), color: BRAND.warning },
    { label: 'Fully Paid', value: `${paidCount} students`, color: BRAND.accent },
  ])

  if (managedUserCount != null) {
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.muted)
    doc.text(`Managed team members: ${managedUserCount}`, 14, tableStart - 2)
  }

  const tableData = allStudents.map((s, idx) => {
    const course = resolveCourse(courses, s, matchOwner)
    const cohort = resolveCohort(cohorts, s, matchOwner)
    const due = calcTotalDue ? calcTotalDue(s) : calcStudentDue(s, courses, matchOwner)
    const balance = calcBalance ? calcBalance(s) : due - (s.amountPaid ?? 0)
    const row = [
      String(idx + 1),
      s.name || '—',
      course?.name || '—',
      cohort?.name || '—',
      formatCurrency(due),
      formatCurrency(s.amountPaid ?? 0),
      formatCurrency(balance),
      paymentStatus(balance),
      s.modeOfPayment || '—',
      s.transId || '—',
    ]
    if (matchOwner) {
      row.splice(4, 0, s.ownerName || '—', s.age ?? '—', s.gender || '—')
    }
    return row
  })

  const head = matchOwner
    ? [['#', 'Name', 'Course', 'Cohort', 'Owner', 'Age', 'Gender', 'Total Due', 'Paid', 'Balance', 'Status', 'Method', 'Trans ID']]
    : [['#', 'Name', 'Course', 'Cohort', 'Total Due', 'Paid', 'Balance', 'Status', 'Method', 'Trans ID']]

  addModernTable(doc, {
    head,
    body: tableData,
    startY: tableStart + (managedUserCount != null ? 4 : 0),
    fontSize: 6.5,
    columnStyles: matchOwner
      ? { 0: { cellWidth: 8 }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } }
      : { 0: { cellWidth: 8 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
  })

  doc.setFontSize(7)
  doc.setTextColor(...BRAND.muted)
  const noteY = doc.lastAutoTable.finalY + 6
  doc.text(
    `This report includes all ${allStudents.length} students — not limited by search or date filters on screen.`,
    14,
    noteY,
  )

  const slug = format(new Date(), 'yyyy-MM-dd')
  saveDoc(doc, `SMS_Pro_All_Students_${slug}.pdf`)
}

/** Fee statement for coordinators */
export function downloadFeeStatement({ students, courses, cohorts, calcTotalDue, calcBalance, ownerName }) {
  const doc = createDoc('landscape')
  const today = format(new Date(), 'dd MMM yyyy · HH:mm')
  const allStudents = sortByName(students)

  const totalDue = allStudents.reduce((sum, s) => sum + calcTotalDue(s), 0)
  const totalCollected = allStudents.reduce((sum, s) => sum + (s.amountPaid ?? 0), 0)

  drawBrandHeader(doc, {
    title: 'Comprehensive Fee Statement',
    subtitle: `${ownerName || 'Coordinator'} · ${today}`,
    badge: 'STATEMENT',
  })

  const tableStart = drawKpiRow(doc, [
    { label: 'Students', value: allStudents.length },
    { label: 'Total Due', value: formatCurrency(totalDue) },
    { label: 'Collected', value: formatCurrency(totalCollected), color: BRAND.success },
    { label: 'Balance', value: formatCurrency(totalDue - totalCollected), color: BRAND.warning },
  ])

  const tableData = allStudents.map((s, idx) => {
    const course = resolveCourse(courses, s)
    const cohort = resolveCohort(cohorts, s)
    const due = calcTotalDue(s)
    const balance = calcBalance(s)
    return [
      String(idx + 1),
      s.name || '—',
      course?.name || '—',
      cohort?.name || '—',
      formatCurrency(due),
      formatCurrency(s.registrationFee ?? 0),
      formatCurrency(s.trainingFee ?? 0),
      formatCurrency(s.boardingFee ?? 0),
      formatCurrency(s.amountPaid ?? 0),
      formatCurrency(balance),
      paymentStatus(balance),
      s.modeOfPayment || '—',
      s.transId || '—',
    ]
  })

  addModernTable(doc, {
    head: [['#', 'Name', 'Course', 'Cohort', 'Total Due', 'Reg', 'Training', 'Boarding', 'Paid', 'Balance', 'Status', 'Method', 'Trans ID']],
    body: tableData,
    startY: tableStart,
    fontSize: 6.5,
    columnStyles: { 0: { cellWidth: 8 } },
  })

  saveDoc(doc, `SMS_Pro_Fee_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

/** Complete payments audit */
export function downloadPaymentsAudit({ payments, includeOwner = false, title = 'Complete Payments Audit' }) {
  const doc = createDoc('landscape')
  const today = format(new Date(), 'dd MMM yyyy · HH:mm')
  const allPayments = [...payments]

  const totalAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

  drawBrandHeader(doc, {
    title,
    subtitle: `Generated ${today}`,
    badge: `${allPayments.length} RECORDS`,
  })

  const tableStart = drawKpiRow(doc, [
    { label: 'Transactions', value: allPayments.length },
    { label: 'Total Collected', value: formatCurrency(totalAmount), color: BRAND.success },
    { label: 'Avg Payment', value: formatCurrency(allPayments.length ? totalAmount / allPayments.length : 0) },
    { label: 'Report Type', value: 'Full Audit', color: BRAND.accent },
  ])

  const tableData = allPayments.map((p, idx) => {
    const paymentDate = p.paymentDate?.toDate
      ? format(p.paymentDate.toDate(), 'dd/MM/yyyy HH:mm')
      : '—'
    const paymentType = p.isInitialPayment ? 'Initial' : p.transactionType || 'Additional'
    const row = [
      String(idx + 1),
      p.studentName || '—',
      paymentDate,
      formatCurrency(p.amount || 0),
      p.paymentMethod || '—',
      p.referenceNumber || '—',
      p.notes || '—',
      paymentType,
    ]
    if (includeOwner) row.splice(2, 0, p.ownerName || '—')
    return row
  })

  const head = includeOwner
    ? [['#', 'Student', 'Owner', 'Date & Time', 'Amount', 'Method', 'Reference', 'Notes', 'Type']]
    : [['#', 'Student', 'Date & Time', 'Amount', 'Method', 'Reference', 'Notes', 'Type']]

  addModernTable(doc, {
    head,
    body: tableData,
    startY: tableStart,
    fontSize: 7,
    columnStyles: { 0: { cellWidth: 8 } },
  })

  saveDoc(doc, `SMS_Pro_Payments_Audit_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

/** Individual student receipt */
export function downloadStudentReceipt({
  student,
  course,
  cohort,
  payments = [],
  calcTotalDue,
  extraFields = [],
}) {
  const doc = createDoc('portrait')
  const today = format(new Date(), 'dd/MM/yyyy HH:mm')
  const totalDue = calcTotalDue(student)
  const balance = totalDue - (student.amountPaid ?? 0)
  const receiptNo = (student.id || '00000000').substring(0, 8).toUpperCase()

  drawBrandHeader(doc, {
    title: 'Fee Receipt & Statement',
    subtitle: `Receipt #${receiptNo} · ${today}`,
    badge: paymentStatus(balance),
  })

  let y = drawKpiRow(doc, [
    { label: 'Total Due', value: formatCurrency(totalDue) },
    { label: 'Paid', value: formatCurrency(student.amountPaid ?? 0), color: BRAND.success },
    { label: 'Balance', value: formatCurrency(balance), color: balance > 0 ? BRAND.warning : BRAND.success },
  ])

  doc.setFillColor(...BRAND.zebra)
  doc.roundedRect(14, y, pageWidth(doc) - 28, 8 + extraFields.length * 6 + 28, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.ink)
  doc.text('Student Details', 18, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let lineY = y + 15
  const details = [
    ['Name', student.name || 'N/A'],
    ['Course', course?.name || 'N/A'],
    ['Cohort', cohort?.name || 'N/A'],
    ...extraFields,
    ['Phone', student.phoneNumber || 'N/A'],
    ['Payment Method', student.modeOfPayment || 'N/A'],
    ['Transaction ID', student.transId || 'N/A'],
  ]
  details.forEach(([label, value]) => {
    doc.setTextColor(...BRAND.muted)
    doc.text(`${label}:`, 18, lineY)
    doc.setTextColor(...BRAND.ink)
    doc.text(String(value), 52, lineY)
    lineY += 6
  })

  y = lineY + 6

  addModernTable(doc, {
    head: [['Description', 'Amount (MWK)']],
    body: [
      ['Course Fee', formatCurrency(course?.fee ?? 0)],
      ['Registration Fee', formatCurrency(student.registrationFee ?? 0)],
      ['Training Fee', formatCurrency(student.trainingFee ?? 0)],
      ['Boarding Fee', formatCurrency(student.boardingFee ?? 0)],
      ['TOTAL DUE', formatCurrency(totalDue)],
      ['TOTAL PAID', formatCurrency(student.amountPaid ?? 0)],
      ['OUTSTANDING', formatCurrency(balance)],
    ],
    startY: y,
    fontSize: 9,
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })

  if (payments.length > 0) {
    const paymentRows = payments.map((p) => {
      const paymentDate = p.paymentDate?.toDate
        ? format(p.paymentDate.toDate(), 'dd/MM/yyyy HH:mm')
        : '—'
      const paymentType = p.isInitialPayment ? 'Initial' : p.transactionType || 'Additional'
      return [paymentDate, formatCurrency(p.amount || 0), p.paymentMethod || '—', p.referenceNumber || '—', paymentType]
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.ink)
    doc.text('Payment History', 14, doc.lastAutoTable.finalY + 12)

    addModernTable(doc, {
      head: [['Date', 'Amount', 'Method', 'Reference', 'Type']],
      body: paymentRows,
      startY: doc.lastAutoTable.finalY + 16,
      headColor: BRAND.accent,
      fontSize: 8,
    })
  }

  const footerY = doc.lastAutoTable.finalY + 14
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.muted)
  doc.text('Thank you for your payments. This is an official SMS Pro receipt.', 14, footerY)

  const safeName = (student.name || 'student').replace(/\s+/g, '_')
  saveDoc(doc, `SMS_Pro_Receipt_${safeName}_${Date.now()}.pdf`)
}
