import { parseISO } from 'date-fns'

export const cohortKey = (cohort) => `${cohort.ownerId || ''}-${cohort.id}`

/** Split cohorts into primary (active, optionally + latest) vs archived/other. */
export const partitionCohortsForDisplay = (cohorts, getCohortStatus, options = {}) => {
  const { includeLatest = true, activeOnly = false } = options
  if (!cohorts?.length) return { primary: [], other: [] }

  const withDates = cohorts.filter((c) => c.startDate)
  const latest = withDates.length
    ? [...withDates].sort((a, b) => parseISO(b.startDate) - parseISO(a.startDate))[0]
    : null
  const latestKey = latest ? cohortKey(latest) : null

  const primaryKeys = new Set()
  const primary = []

  cohorts.forEach((c) => {
    const key = cohortKey(c)
    const isActive = getCohortStatus(c).text === 'Active'
    const isLatest = key === latestKey
    const showPrimary = activeOnly ? isActive : isActive || (includeLatest && isLatest)

    if (showPrimary) {
      if (!primaryKeys.has(key)) {
        primaryKeys.add(key)
        primary.push(c)
      }
    }
  })

  const other = cohorts.filter((c) => !primaryKeys.has(cohortKey(c)))

  primary.sort((a, b) => {
    const aActive = getCohortStatus(a).text === 'Active' ? 1 : 0
    const bActive = getCohortStatus(b).text === 'Active' ? 1 : 0
    if (bActive !== aActive) return bActive - aActive
    if (a.startDate && b.startDate) return parseISO(b.startDate) - parseISO(a.startDate)
    return 0
  })

  other.sort((a, b) => {
    if (a.startDate && b.startDate) return parseISO(b.startDate) - parseISO(a.startDate)
    return 0
  })

  return { primary, other }
}
