import React, { useMemo, useState } from 'react'
import { CBadge, CButton, CCol, CFormInput, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilWarning } from '@coreui/icons'
import { matchesSearchQuery } from '../../utils/search'

const OutstandingBalancesPanel = ({
  students = [],
  formatMK,
  calcTotalDue,
  title = 'Outstanding balances',
  emptyMessage = 'All students are fully paid.',
}) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!students.length) return []
    return students.filter((s) =>
      matchesSearchQuery(search, s.name, s.phone, s.courseName, s.cohortName),
    )
  }, [students, search])

  const totalOutstanding = useMemo(
    () => filtered.reduce((sum, s) => sum + (s.balance || 0), 0),
    [filtered],
  )

  if (!students.length) return null

  return (
    <div className="sms-balance-panel mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <CIcon icon={cilWarning} className="text-warning" />
            {title}
          </h6>
          <small className="text-muted">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} · {formatMK(totalOutstanding)} total
          </small>
        </div>
        {students.length > 6 && (
          <div className="sms-search sms-search--compact" style={{ minWidth: 220 }}>
            <CIcon icon={cilSearch} className="sms-search-icon" />
            <CFormInput
              className="sms-search-input"
              placeholder="Search owing students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted small mb-0">{search ? 'No matches for your search.' : emptyMessage}</p>
      ) : (
        <CRow className="g-2 sms-balance-cards-grid">
          {filtered.map((s) => {
            const due = calcTotalDue ? calcTotalDue(s) : null
            const paid = due != null ? due - (s.balance || 0) : null
            const rate = due > 0 && paid != null ? Math.min(100, (paid / due) * 100) : null

            return (
              <CCol xs={12} sm={6} md={4} lg={3} key={s.id}>
                <div className="sms-balance-card">
                  <div className="sms-balance-card-top">
                    <strong className="sms-balance-card-name">{s.name || 'Student'}</strong>
                    <CBadge color="danger" className="sms-balance-card-badge">
                      Owing
                    </CBadge>
                  </div>
                  <div className="sms-balance-card-amount">{formatMK(s.balance)}</div>
                  {due != null && (
                    <div className="sms-balance-card-meta">
                      <span>Paid {formatMK(paid)}</span>
                      <span className="text-muted">of {formatMK(due)}</span>
                    </div>
                  )}
                  {rate != null && (
                    <div className="sms-balance-card-progress">
                      <div className="sms-balance-card-progress-bar" style={{ width: `${rate}%` }} />
                    </div>
                  )}
                </div>
              </CCol>
            )
          })}
        </CRow>
      )}

      {students.length > 12 && filtered.length > 0 && (
        <div className="text-center mt-2">
          <CButton color="link" size="sm" className="text-muted" onClick={() => setSearch('')}>
            Clear search
          </CButton>
        </div>
      )}
    </div>
  )
}

export default OutstandingBalancesPanel
