/**
 * Flexible search helpers — token-based, order-independent, partial-word matching.
 * Example: "nali him" matches "Ibrahim Binali" (each token hits part of a name).
 */

export function normalizeSearchText(value) {
  if (value == null || value === '') return ''
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s@._+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeSearch(query) {
  const normalized = normalizeSearchText(query)
  if (!normalized) return []
  return normalized.split(/\s+/).filter(Boolean)
}

function collectFieldValues(fields) {
  const values = []
  const visit = (val) => {
    if (val == null || val === '') return
    if (Array.isArray(val)) {
      val.forEach(visit)
      return
    }
    if (typeof val === 'object') {
      Object.values(val).forEach(visit)
      return
    }
    values.push(String(val))
  }
  fields.forEach(visit)
  return values
}

/**
 * Returns true when every search token appears somewhere in the combined fields
 * (substring match, any order). Empty query matches everything.
 */
export function matchesSearchQuery(query, ...fields) {
  const tokens = tokenizeSearch(query)
  if (tokens.length === 0) return true

  const haystack = normalizeSearchText(collectFieldValues(fields).join(' '))
  if (!haystack) return false

  const compact = haystack.replace(/\s+/g, '')
  const words = haystack.split(/\s+/).filter(Boolean)

  return tokens.every((token) => {
    if (haystack.includes(token)) return true
    if (compact.includes(token.replace(/\s+/g, ''))) return true
    return words.some((word) => word.includes(token) || token.includes(word))
  })
}

/** Filter a list; getFields(item) returns values to search (strings or arrays). */
export function filterBySearch(items, query, getFields) {
  if (!tokenizeSearch(query).length) return items
  return items.filter((item) => matchesSearchQuery(query, ...collectFieldValues([getFields(item)])))
}

export function hasSearchQuery(query) {
  return tokenizeSearch(query).length > 0
}
