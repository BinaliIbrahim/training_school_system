import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { isAfter, isBefore, parseISO } from 'date-fns'

/** Shared school catalog — courses & cohorts owned by the school admin */

export const canManageCatalog = (role) => role === 'admin' || role === 'super-admin'

/** Admin uid whose users/{id}/courses and users/{id}/cohorts are the shared catalog */
export const getCatalogOwnerId = (profile, role, authUid) => {
  if (!profile) return null
  if (role === 'admin' || role === 'super-admin') {
    return authUid || profile.id || profile.uid || null
  }
  return profile.managedBy || profile.createdBy || null
}

/** Resolve admin catalog uid — falls back to querying who lists this user in managedUserIds */
export const resolveCatalogOwnerId = async (db, profile, role, authUid) => {
  const direct = getCatalogOwnerId(profile, role, authUid)
  if (direct) return direct
  if (!db || !authUid) return null

  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('managedUserIds', 'array-contains', authUid), limit(10)),
    )
    const adminDoc =
      snap.docs.find((d) => {
        const r = d.data().role
        return r === 'admin' || r === 'super-admin'
      }) || snap.docs[0]
    return adminDoc?.id || null
  } catch (err) {
    console.error('resolveCatalogOwnerId:', err)
    return null
  }
}

export const getStudentCatalogOwnerId = (student, defaultCatalogOwnerId) =>
  student?.catalogOwnerId || defaultCatalogOwnerId || student?.ownerId

export const mergeCatalogItems = (primary = [], secondary = []) => {
  const seen = new Set()
  const merged = []
  for (const item of [...primary, ...secondary]) {
    const key = `${item.ownerId || ''}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export const findCourseForStudent = (student, courses, defaultCatalogOwnerId) => {
  if (!student?.courseId && !student?.courseName) return null
  if (student?.courseId) {
    const catalogId = getStudentCatalogOwnerId(student, defaultCatalogOwnerId)
    const found =
      courses.find((c) => c.id === student.courseId && c.ownerId === catalogId) ||
      courses.find((c) => c.id === student.courseId && c.ownerId === student.ownerId) ||
      courses.find((c) => c.id === student.courseId)
    if (found) return found
  }
  if (student?.courseName || student?.trainingFee != null) {
    return {
      id: student.courseId || '',
      name: student.courseName || 'Course',
      fee: student.trainingFee ?? 0,
      ownerId: student.ownerId,
      legacySnapshot: true,
    }
  }
  return null
}

export const findCohortForStudent = (student, cohorts, defaultCatalogOwnerId) => {
  if (!student?.cohortId && !student?.cohortName) return null
  if (student?.cohortId) {
    const catalogId = getStudentCatalogOwnerId(student, defaultCatalogOwnerId)
    const found =
      cohorts.find((c) => c.id === student.cohortId && c.ownerId === catalogId) ||
      cohorts.find((c) => c.id === student.cohortId && c.ownerId === student.ownerId) ||
      cohorts.find((c) => c.id === student.cohortId)
    if (found) return found
  }
  if (student?.cohortName) {
    return {
      id: student.cohortId || '',
      name: student.cohortName,
      ownerId: student.ownerId,
      legacySnapshot: true,
    }
  }
  return null
}

export const studentMatchesCohort = (student, cohort, defaultCatalogOwnerId) => {
  if (!student || !cohort) return false

  if (student.cohortId && student.cohortId === cohort.id) {
    return true
  }

  if (student.cohortName && cohort.name) {
    const a = student.cohortName.trim().toLowerCase()
    const b = cohort.name.trim().toLowerCase()
    if (a === b) return true
  }

  const resolved = findCohortForStudent(student, [cohort], defaultCatalogOwnerId)
  return resolved?.id === cohort.id
}

export const studentMatchesCourse = (student, course, defaultCatalogOwnerId) => {
  if (!student || !course || student.courseId !== course.id) return false
  const catalogId = getStudentCatalogOwnerId(student, defaultCatalogOwnerId)
  if (catalogId === course.ownerId) return true
  if (!student.catalogOwnerId && student.ownerId === course.ownerId) return true
  return false
}

export const getCourseFeeForStudent = (student, courses, defaultCatalogOwnerId) => {
  const course = findCourseForStudent(student, courses, defaultCatalogOwnerId)
  if (course?.fee != null) return course.fee
  if (student?.trainingFee != null) return student.trainingFee
  return 0
}

/** Total due = catalog course fee + registration + boarding (training fee field is display-only) */
export const calcTotalDueForStudent = (student, courses, defaultCatalogOwnerId) => {
  return (
    getCourseFeeForStudent(student, courses, defaultCatalogOwnerId) +
    (student?.registrationFee ?? 0) +
    (student?.boardingFee ?? 0)
  )
}

export const calcBalanceForStudent = (student, courses, defaultCatalogOwnerId) =>
  calcTotalDueForStudent(student, courses, defaultCatalogOwnerId) - (student?.amountPaid ?? 0)

export const CERTIFICATE_ELIGIBILITY_MESSAGE =
  'Eligible to receive equipment and certificates'

export const getCohortTimelineStatus = (cohort) => {
  if (!cohort?.startDate || !cohort?.endDate) return 'unknown'
  const now = new Date()
  const start = parseISO(cohort.startDate)
  const end = parseISO(cohort.endDate)
  if (isBefore(now, start)) return 'upcoming'
  if (isAfter(now, end)) return 'completed'
  return 'active'
}

export const isCohortComplete = (cohort) => getCohortTimelineStatus(cohort) === 'completed'

export const isStudentFullyPaid = (student, courses, defaultCatalogOwnerId) =>
  calcBalanceForStudent(student, courses, defaultCatalogOwnerId) <= 0

/** Fully paid + cohort intake finished. */
export const isEligibleForEquipmentAndCertificates = (
  student,
  cohort,
  courses,
  defaultCatalogOwnerId,
) => {
  if (!student || !cohort) return false
  return (
    isStudentFullyPaid(student, courses, defaultCatalogOwnerId) && isCohortComplete(cohort)
  )
}

export const canModifyLegacyCatalogItem = (item, workspaceOwnerId, catalogOwnerId) => {
  if (!item || !workspaceOwnerId) return false
  return item.ownerId === workspaceOwnerId && workspaceOwnerId !== catalogOwnerId
}

export const filterCatalogItems = (items, catalogOwnerId) => {
  if (!catalogOwnerId) return items
  return items.filter((item) => item.ownerId === catalogOwnerId)
}
