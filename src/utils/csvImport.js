import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'

const BATCH_SIZE = 400

const EXPORT_ONLY_FIELDS = new Set(['ownerName', 'ownerType'])

/** Parse RFC-style CSV text into array of row objects. */
export function parseCsv(text) {
  if (!text || !text.trim()) return []

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row)
    }
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      pushField()
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      pushField()
      pushRow()
      if (ch === '\r') i++
    } else if (ch !== '\r') {
      field += ch
    }
  }

  pushField()
  if (row.length) pushRow()
  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) => {
    const obj = {}
    headers.forEach((header, idx) => {
      obj[header] = cells[idx] ?? ''
    })
    return obj
  })
}

/** Extract store-only ZIP entries produced by csvBackup.js */
export function extractZipEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  const decoder = new TextDecoder()
  const files = {}
  let offset = 0

  while (offset + 30 <= arrayBuffer.byteLength) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) break

    const compression = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const name = decoder.decode(new Uint8Array(arrayBuffer, nameStart, nameLength))
    const dataStart = nameStart + nameLength + extraLength

    if (compression !== 0) {
      throw new Error(`Unsupported compression in "${name}". Re-export using the in-app backup tool.`)
    }

    files[name] = decoder.decode(
      new Uint8Array(arrayBuffer, dataStart, compressedSize),
    )
    offset = dataStart + compressedSize
  }

  if (!Object.keys(files).length) {
    throw new Error('No files found in ZIP. Use a backup created by this system.')
  }

  return files
}

export async function parseBackupZipFile(file) {
  const buffer = await file.arrayBuffer()
  const entries = extractZipEntries(buffer)

  return {
    readme: entries['README.txt'] || '',
    users: parseCsv(entries['users.csv'] || ''),
    students: parseCsv(entries['students.csv'] || ''),
    courses: parseCsv(entries['courses.csv'] || ''),
    cohorts: parseCsv(entries['cohorts.csv'] || ''),
    payments: parseCsv(entries['payments.csv'] || ''),
    loginLogs: parseCsv(entries['login_logs.csv'] || ''),
    publicSites: parseCsv(entries['public_sites.csv'] || ''),
  }
}

function parseBool(value) {
  if (value === '' || value == null) return undefined
  if (value === true || value === 'true' || value === '1') return true
  if (value === false || value === 'false' || value === '0') return false
  return undefined
}

function parseNum(value) {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function parseTimestamp(value) {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : Timestamp.fromDate(d)
}

function cleanPayload(row, omit = []) {
  const payload = {}
  Object.entries(row).forEach(([key, value]) => {
    if (EXPORT_ONLY_FIELDS.has(key) || omit.includes(key) || key === 'id' || key === 'slug') return
    if (value === '' || value == null) return
    payload[key] = value
  })
  return payload
}

function canImportOwner(profile, ownerId) {
  if (!ownerId) return false
  if (profile.role === 'super-admin') return true
  if (profile.role === 'admin') {
    return (
      ownerId === profile.id || (profile.managedUserIds || []).includes(ownerId)
    )
  }
  return false
}

function canImportCatalogItem(profile, row) {
  const ownerId = row.ownerId
  if (!ownerId) return false
  if (profile.role === 'super-admin') return true
  if (profile.role === 'admin') {
    if (ownerId === profile.id) return true
    if (parseBool(row.legacy) && canImportOwner(profile, ownerId)) return true
  }
  return false
}

async function commitBatch(db, ops) {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    ops.slice(i, i + BATCH_SIZE).forEach(({ ref, data }) => batch.set(ref, data, { merge: true }))
    await batch.commit()
  }
}

function buildUserPayload(row, profile) {
  const payload = {}
  if (row.fullName) payload.fullName = row.fullName
  if (row.schoolName) payload.schoolName = row.schoolName
  if (row.siteSlug) payload.siteSlug = row.siteSlug

  const active = parseBool(row.active)
  if (active !== undefined) payload.active = active

  if (row.managedUserIds) {
    payload.managedUserIds = row.managedUserIds.split(';').filter(Boolean)
  }

  const permissions = {}
  const create = parseBool(row.permissions_create)
  const edit = parseBool(row.permissions_edit)
  const del = parseBool(row.permissions_delete)
  if (create !== undefined) permissions.create = create
  if (edit !== undefined) permissions.edit = edit
  if (del !== undefined) permissions.delete = del
  if (Object.keys(permissions).length) payload.permissions = permissions

  if (profile.role === 'super-admin') {
    if (row.role) payload.role = row.role
    if (row.approvalStatus) payload.approvalStatus = row.approvalStatus
    const subEnd = parseTimestamp(row.subscriptionenddate)
    if (subEnd) payload.subscriptionenddate = subEnd
  }

  return payload
}

function buildStudentPayload(row) {
  return {
    ...cleanPayload(row, ['ownerId']),
    age: parseNum(row.age),
    registrationFee: parseNum(row.registrationFee) ?? 0,
    boardingFee: parseNum(row.boardingFee) ?? 0,
    amountPaid: parseNum(row.amountPaid) ?? 0,
    registrationDate: parseTimestamp(row.registrationDate),
    createdAt: parseTimestamp(row.createdAt),
    updatedAt: parseTimestamp(row.updatedAt) || Timestamp.now(),
  }
}

function buildCoursePayload(row) {
  return {
    ...cleanPayload(row, ['ownerId', 'legacy']),
    fee: parseNum(row.fee) ?? 0,
    weeksOrMonths: parseNum(row.weeksOrMonths),
    legacy: parseBool(row.legacy) ?? false,
  }
}

function buildCohortPayload(row) {
  return {
    ...cleanPayload(row, ['ownerId', 'legacy']),
    legacy: parseBool(row.legacy) ?? false,
  }
}

function buildPaymentPayload(row) {
  return {
    ...cleanPayload(row, ['ownerId']),
    amount: parseNum(row.amount) ?? 0,
    paymentDate: parseTimestamp(row.paymentDate),
  }
}

function buildPublicSitePayload(row) {
  return {
    ...cleanPayload(row, ['ownerId', 'ownerName']),
    published: parseBool(row.published) ?? false,
    updatedAt: parseTimestamp(row.updatedAt) || Timestamp.now(),
  }
}

/**
 * Import a backup ZIP (merge by document id).
 * Does not create Firebase Auth accounts — user profiles must already exist.
 */
export async function importSchoolBackupZip(db, profile, parsed, onProgress) {
  if (!profile?.id || !['admin', 'super-admin'].includes(profile.role)) {
    throw new Error('Only admins can import backups.')
  }

  const stats = {
    users: 0,
    students: 0,
    courses: 0,
    cohorts: 0,
    payments: 0,
    publicSites: 0,
    skipped: 0,
    errors: [],
  }

  const report = (stage, detail) => onProgress?.({ stage, detail, stats })

  report('users', 'Restoring user profiles…')
  for (const row of parsed.users) {
    const userId = row.id
    if (!userId || !canImportOwner(profile, userId)) {
      stats.skipped++
      continue
    }
    if (profile.role === 'admin' && userId !== profile.id && !(profile.managedUserIds || []).includes(userId)) {
      stats.skipped++
      continue
    }

    try {
      const existing = await getDoc(doc(db, 'users', userId))
      if (!existing.exists()) {
        stats.skipped++
        continue
      }
      const payload = buildUserPayload(row, profile)
      if (!Object.keys(payload).length) {
        stats.skipped++
        continue
      }
      await setDoc(doc(db, 'users', userId), payload, { merge: true })
      stats.users++
    } catch (err) {
      stats.errors.push(`User ${userId}: ${err.message}`)
    }
  }

  const cohortOps = []
  report('cohorts', 'Restoring cohorts…')
  for (const row of parsed.cohorts) {
    const ownerId = row.ownerId
    const id = row.id
    if (!id || !ownerId || !canImportCatalogItem(profile, row)) {
      stats.skipped++
      continue
    }
    cohortOps.push({
      ref: doc(db, `users/${ownerId}/cohorts`, id),
      data: buildCohortPayload(row),
    })
  }
  await commitBatch(db, cohortOps)
  stats.cohorts = cohortOps.length

  const courseOps = []
  report('courses', 'Restoring courses…')
  for (const row of parsed.courses) {
    const ownerId = row.ownerId
    const id = row.id
    if (!id || !ownerId || !canImportCatalogItem(profile, row)) {
      stats.skipped++
      continue
    }
    courseOps.push({
      ref: doc(db, `users/${ownerId}/courses`, id),
      data: buildCoursePayload(row),
    })
  }
  await commitBatch(db, courseOps)
  stats.courses = courseOps.length

  const studentOps = []
  report('students', 'Restoring students…')
  for (const row of parsed.students) {
    const ownerId = row.ownerId
    const id = row.id
    if (!id || !ownerId || !canImportOwner(profile, ownerId)) {
      stats.skipped++
      continue
    }
    studentOps.push({
      ref: doc(db, `users/${ownerId}/students`, id),
      data: buildStudentPayload(row),
    })
  }
  await commitBatch(db, studentOps)
  stats.students = studentOps.length

  const paymentOps = []
  report('payments', 'Restoring payments…')
  for (const row of parsed.payments) {
    const ownerId = row.ownerId
    const id = row.id
    if (!id || !ownerId || !canImportOwner(profile, ownerId)) {
      stats.skipped++
      continue
    }
    paymentOps.push({
      ref: doc(db, `users/${ownerId}/payments`, id),
      data: buildPaymentPayload(row),
    })
  }
  await commitBatch(db, paymentOps)
  stats.payments = paymentOps.length

  report('public_sites', 'Restoring public sites…')
  for (const row of parsed.publicSites) {
    const slug = row.slug
    const ownerId = row.ownerId
    if (!slug) {
      stats.skipped++
      continue
    }
    if (profile.role === 'admin' && ownerId !== profile.id) {
      stats.skipped++
      continue
    }
    try {
      await setDoc(doc(db, 'publicSites', slug), buildPublicSitePayload(row), { merge: true })
      stats.publicSites++
    } catch (err) {
      stats.errors.push(`Site ${slug}: ${err.message}`)
    }
  }

  report('done', 'Import complete')
  return stats
}

/** Summarize parsed backup for preview UI. */
export function summarizeBackup(parsed) {
  return {
    users: parsed.users.length,
    students: parsed.students.length,
    courses: parsed.courses.length,
    cohorts: parsed.cohorts.length,
    payments: parsed.payments.length,
    loginLogs: parsed.loginLogs.length,
    publicSites: parsed.publicSites.length,
  }
}
