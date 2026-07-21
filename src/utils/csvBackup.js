import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { format } from 'date-fns'
import { mergeCatalogItems } from './schoolCatalog'

const BACKUP_LOG_LIMIT = 5000

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Escape a value for CSV (RFC-style). */
export const escapeCsvCell = (value) => {
  if (value == null) return ''
  const str =
    typeof value === 'object' && value !== null && !(value instanceof Date)
      ? JSON.stringify(value)
      : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export const flattenBackupValue = (value) => {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return ''
    }
  }
  if (value?.seconds != null) return new Date(value.seconds * 1000).toISOString()
  if (typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export const objectsToCsv = (rows, columns) => {
  if (!rows.length) {
    return `${columns.join(',')}\n`
  }
  const header = columns.map(escapeCsvCell).join(',')
  const body = rows
    .map((row) =>
      columns.map((col) => escapeCsvCell(flattenBackupValue(row[col]))).join(','),
    )
    .join('\n')
  return `${header}\n${body}\n`
}

const USER_COLUMNS = [
  'id',
  'email',
  'fullName',
  'role',
  'approvalStatus',
  'active',
  'managedBy',
  'createdBy',
  'managedUserIds',
  'schoolName',
  'siteSlug',
  'subscriptionenddate',
  'permissions_create',
  'permissions_edit',
  'permissions_delete',
]

const STUDENT_COLUMNS = [
  'id',
  'ownerId',
  'ownerName',
  'name',
  'phoneNumber',
  'age',
  'gender',
  'courseId',
  'cohortId',
  'catalogOwnerId',
  'registrationFee',
  'boardingFee',
  'amountPaid',
  'modeOfPayment',
  'transId',
  'registrationDate',
  'createdAt',
  'updatedAt',
]

const COURSE_COLUMNS = [
  'id',
  'ownerId',
  'ownerName',
  'name',
  'fee',
  'type',
  'weeksOrMonths',
  'cohortId',
  'duration',
  'legacy',
]

const COHORT_COLUMNS = [
  'id',
  'ownerId',
  'ownerName',
  'name',
  'startDate',
  'endDate',
  'description',
  'status',
  'legacy',
]

const PAYMENT_COLUMNS = [
  'id',
  'ownerId',
  'ownerName',
  'studentId',
  'studentName',
  'amount',
  'paymentMethod',
  'referenceNumber',
  'notes',
  'paymentDate',
  'transactionType',
  'courseId',
  'cohortId',
]

const LOGIN_COLUMNS = [
  'id',
  'userId',
  'email',
  'fullName',
  'role',
  'scopeAdminId',
  'managedBy',
  'event',
  'success',
  'timestamp',
  'device_browser',
  'device_platform',
  'device_isMobile',
]

const SITE_COLUMNS = [
  'slug',
  'ownerId',
  'ownerName',
  'published',
  'tagline',
  'about',
  'contactEmail',
  'contactPhone',
  'updatedAt',
]

const mapUserRow = (u) => ({
  id: u.id,
  email: u.email || '',
  fullName: u.fullName || '',
  role: u.role || '',
  approvalStatus: u.approvalStatus || '',
  active: u.active !== false,
  managedBy: u.managedBy || '',
  createdBy: u.createdBy || '',
  managedUserIds: Array.isArray(u.managedUserIds) ? u.managedUserIds.join(';') : '',
  schoolName: u.schoolName || '',
  siteSlug: u.siteSlug || '',
  subscriptionenddate: flattenBackupValue(u.subscriptionenddate),
  permissions_create: u.permissions?.create ?? '',
  permissions_edit: u.permissions?.edit ?? '',
  permissions_delete: u.permissions?.delete ?? '',
})

const mapLoginRow = (log) => ({
  id: log.id,
  userId: log.userId || '',
  email: log.email || '',
  fullName: log.fullName || '',
  role: log.role || '',
  scopeAdminId: log.scopeAdminId || '',
  managedBy: log.managedBy || '',
  event: log.event || '',
  success: log.success ?? '',
  timestamp: flattenBackupValue(log.timestamp),
  device_browser: log.device?.browser || '',
  device_platform: log.device?.platform || '',
  device_isMobile: log.device?.isMobile ?? '',
})

const mapSiteRow = (slug, data) => ({
  slug,
  ownerId: data.ownerId || '',
  ownerName: data.ownerName || '',
  published: data.published ?? '',
  tagline: data.tagline || '',
  about: data.about || '',
  contactEmail: data.contactEmail || '',
  contactPhone: data.contactPhone || '',
  updatedAt: flattenBackupValue(data.updatedAt),
})

async function loadLoginLogs(db, profile) {
  const logMap = new Map()

  if (profile.role === 'super-admin') {
    try {
      const snap = await getDocs(
        query(collection(db, 'loginLogs'), orderBy('timestamp', 'desc'), limit(BACKUP_LOG_LIMIT)),
      )
      snap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))
    } catch {
      const snap = await getDocs(query(collection(db, 'loginLogs'), limit(BACKUP_LOG_LIMIT)))
      snap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))
    }
  } else {
    const teamIds = [...new Set([profile.id, ...(profile.managedUserIds || [])])]
    const scopeSnap = await getDocs(
      query(collection(db, 'loginLogs'), where('scopeAdminId', '==', profile.id), limit(BACKUP_LOG_LIMIT)),
    )
    scopeSnap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))

    for (const batch of chunk(teamIds, 10)) {
      const userSnap = await getDocs(
        query(collection(db, 'loginLogs'), where('userId', 'in', batch), limit(500)),
      )
      userSnap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))
    }
  }

  return [...logMap.values()]
}

async function loadPublicSites(db, profile, userList) {
  const sites = []

  if (profile.role === 'super-admin') {
    try {
      const snap = await getDocs(collection(db, 'publicSites'))
      snap.docs.forEach((d) => sites.push(mapSiteRow(d.id, d.data())))
    } catch (err) {
      console.warn('Backup: could not load public sites', err)
    }
    return sites
  }

  const slugs = [...new Set(userList.map((u) => u.siteSlug).filter(Boolean))]
  for (const slug of slugs) {
    try {
      const snap = await getDoc(doc(db, 'publicSites', slug))
      if (snap.exists()) sites.push(mapSiteRow(slug, snap.data()))
    } catch (err) {
      console.warn(`Backup: could not load site ${slug}`, err)
    }
  }
  return sites
}

async function resolveUserList(db, profile) {
  if (profile.role === 'super-admin') {
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), userType: 'direct' }))
  }

  if (profile.role === 'admin') {
    const list = [{ id: profile.id, ...profile, userType: 'self' }]
    const managedIds = profile.managedUserIds || []
    for (const managedId of managedIds) {
      const userDoc = await getDoc(doc(db, 'users', managedId))
      if (userDoc.exists()) {
        list.push({ id: managedId, ...userDoc.data(), userType: 'managed' })
      }
    }
    return list
  }

  return [{ id: profile.id, ...profile, userType: 'self' }]
}

function resolveCatalogOwnerIds(profile, userList) {
  if (profile.role === 'super-admin') {
    return [
      ...new Set(
        userList.filter((u) => u.role === 'admin' || u.role === 'super-admin').map((u) => u.id),
      ),
    ]
  }
  if (profile.role === 'admin') return [profile.id]
  return []
}

async function loadOperationalData(db, userList, catalogOwnerIds) {
  let students = []
  let payments = []
  let courses = []
  let cohorts = []

  for (const userData of userList) {
    const userId = userData.id
    const ownerName = userData.fullName || userData.email || `User ${userId.slice(0, 8)}`

    try {
      const snap = await getDocs(collection(db, `users/${userId}/students`))
      students.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: userId,
          ownerName,
          ownerType: userData.userType,
        })),
      )
    } catch (err) {
      console.warn(`Backup: students for ${userId}`, err)
    }

    try {
      const snap = await getDocs(collection(db, `users/${userId}/payments`))
      payments.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: userId,
          ownerName,
          ownerType: userData.userType,
        })),
      )
    } catch (err) {
      console.warn(`Backup: payments for ${userId}`, err)
    }

    try {
      const snap = await getDocs(collection(db, `users/${userId}/courses`))
      courses.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: userId,
          ownerName,
          ownerType: userData.userType,
          legacy: true,
        })),
      )
    } catch (err) {
      console.warn(`Backup: legacy courses for ${userId}`, err)
    }

    try {
      const snap = await getDocs(collection(db, `users/${userId}/cohorts`))
      cohorts.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: userId,
          ownerName,
          ownerType: userData.userType,
          legacy: true,
        })),
      )
    } catch (err) {
      console.warn(`Backup: legacy cohorts for ${userId}`, err)
    }
  }

  for (const catalogId of catalogOwnerIds) {
    let catalogUser = userList.find((u) => u.id === catalogId)
    if (!catalogUser) {
      const catalogSnap = await getDoc(doc(db, 'users', catalogId))
      if (catalogSnap.exists()) {
        catalogUser = { id: catalogId, ...catalogSnap.data() }
      }
    }
    const catalogName =
      catalogUser?.fullName || catalogUser?.email || `Admin ${catalogId.slice(0, 8)}`

    try {
      const snap = await getDocs(collection(db, `users/${catalogId}/courses`))
      courses.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: catalogId,
          ownerName: catalogName,
          ownerType: 'catalog',
        })),
      )
    } catch (err) {
      console.warn(`Backup: catalog courses for ${catalogId}`, err)
    }

    try {
      const snap = await getDocs(collection(db, `users/${catalogId}/cohorts`))
      cohorts.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: catalogId,
          ownerName: catalogName,
          ownerType: 'catalog',
        })),
      )
    } catch (err) {
      console.warn(`Backup: catalog cohorts for ${catalogId}`, err)
    }
  }

  return {
    students,
    payments,
    courses: mergeCatalogItems(courses, []),
    cohorts: mergeCatalogItems(cohorts, []),
  }
}

/** Fetch all backup data for admin / super-admin scope. */
export async function fetchSchoolBackupData(db, profile) {
  if (!profile?.id || !['admin', 'super-admin'].includes(profile.role)) {
    throw new Error('Only admins can export system backups.')
  }

  const userList = await resolveUserList(db, profile)
  const catalogOwnerIds = resolveCatalogOwnerIds(profile, userList)
  const [operational, loginLogs, publicSites] = await Promise.all([
    loadOperationalData(db, userList, catalogOwnerIds),
    loadLoginLogs(db, profile),
    loadPublicSites(db, profile, userList),
  ])

  return {
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: profile.email || profile.id,
      exportedByName: profile.fullName || '',
      role: profile.role,
      schoolName: profile.schoolName || profile.fullName || 'Training School',
      userCount: userList.length,
      studentCount: operational.students.length,
      courseCount: operational.courses.length,
      cohortCount: operational.cohorts.length,
      paymentCount: operational.payments.length,
      loginLogCount: loginLogs.length,
      publicSiteCount: publicSites.length,
    },
    users: userList.map(mapUserRow),
    students: operational.students,
    courses: operational.courses,
    cohorts: operational.cohorts,
    payments: operational.payments,
    loginLogs: loginLogs.map(mapLoginRow),
    publicSites,
  }
}

/** Build backup from data already loaded in School Overview (skips re-fetch). */
export function buildBackupFromLoadedData({
  profile,
  managedUsers = [],
  students = [],
  courses = [],
  cohorts = [],
  payments = [],
  loginLogs = [],
  publicSites = [],
}) {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: profile?.email || profile?.id || '',
      exportedByName: profile?.fullName || '',
      role: profile?.role || '',
      schoolName: profile?.schoolName || profile?.fullName || 'Training School',
      userCount: managedUsers.length,
      studentCount: students.length,
      courseCount: courses.length,
      cohortCount: cohorts.length,
      paymentCount: payments.length,
      loginLogCount: loginLogs.length,
      publicSiteCount: publicSites.length,
    },
    users: managedUsers.map(mapUserRow),
    students,
    courses,
    cohorts,
    payments,
    loginLogs: loginLogs.map(mapLoginRow),
    publicSites,
  }
}

function buildReadme(meta) {
  return [
    'IBRATECH TRAINING SCHOOL — DATA BACKUP',
    '=====================================',
    '',
    `Exported: ${meta.exportedAt}`,
    `Exported by: ${meta.exportedByName || meta.exportedBy} (${meta.role})`,
    `School: ${meta.schoolName}`,
    '',
    'Contents:',
    `  users.csv         — ${meta.userCount} account(s)`,
    `  students.csv      — ${meta.studentCount} student record(s)`,
    `  courses.csv       — ${meta.courseCount} course(s)`,
    `  cohorts.csv       — ${meta.cohortCount} cohort(s)`,
    `  payments.csv      — ${meta.paymentCount} payment(s)`,
    `  login_logs.csv    — ${meta.loginLogCount} login event(s)`,
    `  public_sites.csv  — ${meta.publicSiteCount} public site(s)`,
    '',
    'Restore note: use Import backup ZIP in Control Center or School Overview to merge this data back.',
    '',
  ].join('\n')
}

// ── Minimal ZIP (store only, no compression) ──────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function u16(n) {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0, true)
  return b
}

function concatBytes(...parts) {
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function createZipBlob(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = encoder.encode(file.content)
    const crc = crc32(dataBytes)
    const size = dataBytes.length

    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    )

    localParts.push(localHeader, dataBytes)

    const centralHeader = concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    )

    centralParts.push(centralHeader)
    offset += localHeader.length + dataBytes.length
  }

  const centralDirectory = concatBytes(...centralParts)
  const endRecord = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  )

  return new Blob([...localParts, centralDirectory, endRecord], { type: 'application/zip' })
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Package backup datasets into a ZIP of CSV files and download. */
export function downloadSchoolBackupZip(backupData, options = {}) {
  const { meta } = backupData
  const stamp = format(new Date(meta.exportedAt), 'yyyy-MM-dd_HHmm')
  const slug = (meta.schoolName || 'school')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)

  const files = [
    { name: 'README.txt', content: buildReadme(meta) },
    { name: 'users.csv', content: objectsToCsv(backupData.users, USER_COLUMNS) },
    { name: 'students.csv', content: objectsToCsv(backupData.students, STUDENT_COLUMNS) },
    { name: 'courses.csv', content: objectsToCsv(backupData.courses, COURSE_COLUMNS) },
    { name: 'cohorts.csv', content: objectsToCsv(backupData.cohorts, COHORT_COLUMNS) },
    { name: 'payments.csv', content: objectsToCsv(backupData.payments, PAYMENT_COLUMNS) },
    { name: 'login_logs.csv', content: objectsToCsv(backupData.loginLogs, LOGIN_COLUMNS) },
    { name: 'public_sites.csv', content: objectsToCsv(backupData.publicSites, SITE_COLUMNS) },
  ]

  const blob = createZipBlob(files)
  const filename = options.filename || `${slug}-backup-${stamp}.zip`
  triggerDownload(blob, filename)
  return { filename, meta }
}
