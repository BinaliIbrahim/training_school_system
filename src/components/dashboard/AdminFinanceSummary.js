import React, { useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CButtonGroup,
  CCol,
  CFormSelect,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilChart,
  cilCheckCircle,
  cilMoney,
  cilPeople,
  cilWarning,
} from '@coreui/icons'

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount || 0)

const sumFinance = (rows) =>
  rows.reduce(
    (acc, r) => ({
      totalDue: acc.totalDue + r.totalDue,
      totalCollected: acc.totalCollected + r.totalCollected,
      totalBalance: acc.totalBalance + r.totalBalance,
      pendingStudents: acc.pendingStudents + r.pendingStudents,
      studentCount: acc.studentCount + r.studentCount,
      paymentCount: acc.paymentCount + r.paymentCount,
    }),
    {
      totalDue: 0,
      totalCollected: 0,
      totalBalance: 0,
      pendingStudents: 0,
      studentCount: 0,
      paymentCount: 0,
    },
  )

const withRate = (row) => ({
  ...row,
  collectionRate:
    row.totalDue > 0 ? Math.min(100, (row.totalCollected / row.totalDue) * 100) : row.studentCount ? 100 : 0,
})

const FinanceKpis = ({ data }) => {
  const rate = withRate(data).collectionRate
  return (
    <>
      <div className="sms-audit-stats mb-3">
        <div className="sms-audit-stat sms-audit-stat--blue">
          <span className="sms-audit-stat-val">{formatMK(data.totalDue)}</span>
          <span className="sms-audit-stat-lbl">Total Billed</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--green">
          <span className="sms-audit-stat-val">{formatMK(data.totalCollected)}</span>
          <span className="sms-audit-stat-lbl">Collected</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--red">
          <span className="sms-audit-stat-val">{formatMK(data.totalBalance)}</span>
          <span className="sms-audit-stat-lbl">Outstanding</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--purple">
          <span className="sms-audit-stat-val">{data.studentCount}</span>
          <span className="sms-audit-stat-lbl">Students</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--orange">
          <span className="sms-audit-stat-val">{data.pendingStudents}</span>
          <span className="sms-audit-stat-lbl">With Balance</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--cyan">
          <span className="sms-audit-stat-val">{data.paymentCount}</span>
          <span className="sms-audit-stat-lbl">Payments</span>
        </div>
      </div>
      <div className="sms-finance-flow-bar mb-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="small fw-semibold">Collection rate</span>
          <span className="small text-muted">{rate.toFixed(1)}%</span>
        </div>
        <CProgress
          color={rate >= 90 ? 'success' : rate >= 60 ? 'warning' : 'danger'}
          value={rate}
          className="sms-finance-collection-progress"
        />
      </div>
    </>
  )
}

const MemberFlowBars = ({ rows, teamAverageRate }) => (
  <div className="sms-finance-member-bars mt-3">
    <div className="small fw-semibold mb-2 text-muted">Collected vs outstanding by team member</div>
    {rows.map((row) => {
      const max = Math.max(row.totalDue, 1)
      const collectedPct = (row.totalCollected / max) * 100
      const balancePct = (Math.max(0, row.totalBalance) / max) * 100
      const vsAvg = row.collectionRate - teamAverageRate
      return (
        <div key={row.userId} className="sms-finance-member-bar">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="fw-semibold">{row.name}</span>
            <span className="small">
              {formatMK(row.totalCollected)}{' '}
              <span className="text-muted">/ {formatMK(row.totalDue)}</span>
              {rows.length > 1 && (
                <CBadge color={vsAvg >= 0 ? 'success' : 'warning'} className="ms-2">
                  {vsAvg >= 0 ? '+' : ''}
                  {vsAvg.toFixed(0)}% vs avg
                </CBadge>
              )}
            </span>
          </div>
          <div className="sms-finance-stacked-bar">
            <div className="sms-finance-stacked-collected" style={{ width: `${collectedPct}%` }} />
            <div className="sms-finance-stacked-balance" style={{ width: `${balancePct}%` }} />
          </div>
        </div>
      )
    })}
  </div>
)

const AdminFinanceSummary = ({ teamFinance = [] }) => {
  const [viewMode, setViewMode] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState('')

  const rows = useMemo(() => teamFinance.map(withRate), [teamFinance])

  const aggregate = useMemo(() => withRate(sumFinance(rows)), [rows])

  const teamAverageRate = useMemo(() => {
    if (!rows.length) return 0
    return rows.reduce((s, r) => s + r.collectionRate, 0) / rows.length
  }, [rows])

  const activeRow = useMemo(() => {
    if (viewMode === 'individual' && selectedUserId) {
      return rows.find((r) => r.userId === selectedUserId) || aggregate
    }
    return aggregate
  }, [viewMode, selectedUserId, rows, aggregate])

  if (!rows.length) return null

  return (
    <div className="sms-finance-hub mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h5 className="fw-bold mb-1">
            <CIcon icon={cilMoney} className="me-2" />
            Money flow
          </h5>
          <p className="text-muted small mb-0">
            Track collections, outstanding balances, and compare performance across your team.
          </p>
        </div>
        <CButtonGroup size="sm">
          <CButton
            color={viewMode === 'all' ? 'primary' : 'secondary'}
            variant={viewMode === 'all' ? undefined : 'outline'}
            onClick={() => setViewMode('all')}
          >
            All team
          </CButton>
          <CButton
            color={viewMode === 'compare' ? 'primary' : 'secondary'}
            variant={viewMode === 'compare' ? undefined : 'outline'}
            onClick={() => setViewMode('compare')}
          >
            <CIcon icon={cilChart} className="me-1" />
            Compare
          </CButton>
          <CButton
            color={viewMode === 'individual' ? 'primary' : 'secondary'}
            variant={viewMode === 'individual' ? undefined : 'outline'}
            onClick={() => {
              setViewMode('individual')
              if (!selectedUserId && rows[0]) setSelectedUserId(rows[0].userId)
            }}
          >
            By member
          </CButton>
        </CButtonGroup>
      </div>

      {viewMode === 'individual' && (
        <CRow className="mb-3">
          <CCol md={6} lg={4}>
            <CFormSelect
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              aria-label="Select team member"
            >
              {rows.map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>
      )}

      <FinanceKpis data={activeRow} />

      {viewMode === 'all' && rows.length > 0 && (
        <MemberFlowBars rows={rows} teamAverageRate={teamAverageRate} />
      )}

      {viewMode === 'compare' && (
        <div className="sms-finance-compare-table mt-3">
          <CTable responsive hover className="mb-0 align-middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Member</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Students</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Billed</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Collected</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Outstanding</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Rate</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rows.map((row) => (
                <CTableRow key={row.userId}>
                  <CTableDataCell>
                    <strong>{row.name}</strong>
                    <div className="small text-muted">{row.email}</div>
                  </CTableDataCell>
                  <CTableDataCell className="text-end">{row.studentCount}</CTableDataCell>
                  <CTableDataCell className="text-end">{formatMK(row.totalDue)}</CTableDataCell>
                  <CTableDataCell className="text-end text-success fw-semibold">
                    {formatMK(row.totalCollected)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-danger fw-semibold">
                    {formatMK(row.totalBalance)}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color={row.collectionRate >= 90 ? 'success' : row.collectionRate >= 60 ? 'warning' : 'danger'}>
                      {row.collectionRate.toFixed(0)}%
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {row.pendingStudents === 0 ? (
                      <CBadge color="success">
                        <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                        Clear
                      </CBadge>
                    ) : (
                      <CBadge color="warning">
                        <CIcon icon={cilWarning} size="sm" className="me-1" />
                        {row.pendingStudents} owing
                      </CBadge>
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
              {rows.length > 1 && (
                <CTableRow className="sms-finance-compare-total">
                  <CTableDataCell>
                    <strong>Team total</strong>
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-bold">{aggregate.studentCount}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold">{formatMK(aggregate.totalDue)}</CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-success">
                    {formatMK(aggregate.totalCollected)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end fw-bold text-danger">
                    {formatMK(aggregate.totalBalance)}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color="primary">{aggregate.collectionRate.toFixed(0)}%</CBadge>
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    <CBadge color={aggregate.pendingStudents ? 'warning' : 'success'}>
                      <CIcon icon={cilPeople} size="sm" className="me-1" />
                      {aggregate.pendingStudents} owing
                    </CBadge>
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>
      )}

      {viewMode === 'individual' && rows.length > 1 && (
        <div className="sms-finance-vs-team mt-3 small text-muted">
          vs team average collection:{' '}
          <strong className={activeRow.collectionRate >= teamAverageRate ? 'text-success' : 'text-warning'}>
            {activeRow.collectionRate >= teamAverageRate ? '+' : ''}
            {(activeRow.collectionRate - teamAverageRate).toFixed(1)}%
          </strong>{' '}
          ({teamAverageRate.toFixed(1)}% team avg)
        </div>
      )}
    </div>
  )
}

export default AdminFinanceSummary
