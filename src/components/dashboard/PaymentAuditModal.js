import React, { useMemo, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CButtonGroup,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilChart,
  cilCheckCircle,
  cilCloudDownload,
  cilList,
  cilPeople,
  cilSearch,
  cilWarning,
} from '@coreui/icons'
import { format } from 'date-fns'
import SmartPagination from '../ui/SmartPagination'

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount || 0)

const PaymentAuditModal = ({
  visible,
  onClose,
  payments,
  filteredPayments,
  allStudents,
  paymentSearchQuery,
  setPaymentSearchQuery,
  paymentDateFilter,
  setPaymentDateFilter,
  getOwnerBadgeColor,
  getPaymentMethodColor,
  getPaymentTypeColor,
  calcTotalDue,
  calcBalance,
  onExportPdf,
}) => {
  const [viewMode, setViewMode] = useState('all')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const memberSummaries = useMemo(() => {
    const map = new Map()

    const ensure = (ownerId, ownerName, ownerType) => {
      if (!map.has(ownerId)) {
        map.set(ownerId, {
          ownerId,
          ownerName: ownerName || 'Unknown',
          ownerType,
          paymentCount: 0,
          totalCollected: 0,
          studentCount: 0,
          totalDue: 0,
          outstanding: 0,
          pendingStudents: 0,
        })
      }
      return map.get(ownerId)
    }

    payments.forEach((p) => {
      const row = ensure(p.ownerId, p.ownerName, p.ownerType)
      row.paymentCount += 1
      row.totalCollected += p.amount || 0
    })

    allStudents.forEach((s) => {
      const row = ensure(s.ownerId, s.ownerName, s.ownerType)
      row.studentCount += 1
      const due = calcTotalDue(s)
      const balance = calcBalance(s)
      row.totalDue += due
      if (balance > 0) {
        row.outstanding += balance
        row.pendingStudents += 1
      }
    })

    return [...map.values()].sort((a, b) => b.totalCollected - a.totalCollected)
  }, [payments, allStudents, calcTotalDue, calcBalance])

  const scopedPayments = useMemo(() => {
    if (viewMode === 'member' && selectedOwnerId) {
      return filteredPayments.filter((p) => p.ownerId === selectedOwnerId)
    }
    return filteredPayments
  }, [filteredPayments, viewMode, selectedOwnerId])

  const scopeStats = useMemo(() => {
    const list = scopedPayments
    const outstanding = allStudents
      .filter((s) => {
        if (viewMode === 'member' && selectedOwnerId && s.ownerId !== selectedOwnerId) return false
        return calcBalance(s) > 0
      })
      .reduce((sum, s) => sum + calcBalance(s), 0)

    const pendingStudents = allStudents.filter((s) => {
      if (viewMode === 'member' && selectedOwnerId && s.ownerId !== selectedOwnerId) return false
      return calcBalance(s) > 0
    }).length

    return {
      count: list.length,
      amount: list.reduce((s, p) => s + (p.amount || 0), 0),
      initial: list.filter((p) => p.isInitialPayment).length,
      additional: list.filter((p) => !p.isInitialPayment).length,
      outstanding,
      pendingStudents,
    }
  }, [scopedPayments, allStudents, viewMode, selectedOwnerId, calcBalance])

  const totalPages = Math.ceil(scopedPayments.length / perPage) || 1
  const paginatedPayments = scopedPayments.slice((page - 1) * perPage, page * perPage)

  const switchView = (mode) => {
    setViewMode(mode)
    setPage(1)
    if (mode === 'member' && !selectedOwnerId && memberSummaries[0]) {
      setSelectedOwnerId(memberSummaries[0].ownerId)
    }
  }

  return (
    <CModal size="xl" visible={visible} onClose={onClose} className="sms-audit-modal">
      <CModalHeader className="sms-modal-header">
        <CModalTitle>
          <CIcon icon={cilList} className="me-2" />
          Payment analysis
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="sms-modal-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <p className="text-muted small mb-0">
            Start with all payments, then drill into a team member or compare coordinators.
          </p>
          <CButtonGroup size="sm">
            <CButton
              color={viewMode === 'all' ? 'primary' : 'secondary'}
              variant={viewMode === 'all' ? undefined : 'outline'}
              onClick={() => switchView('all')}
            >
              All payments
            </CButton>
            <CButton
              color={viewMode === 'compare' ? 'primary' : 'secondary'}
              variant={viewMode === 'compare' ? undefined : 'outline'}
              onClick={() => switchView('compare')}
            >
              <CIcon icon={cilChart} className="me-1" />
              Compare
            </CButton>
            <CButton
              color={viewMode === 'member' ? 'primary' : 'secondary'}
              variant={viewMode === 'member' ? undefined : 'outline'}
              onClick={() => switchView('member')}
            >
              <CIcon icon={cilPeople} className="me-1" />
              By member
            </CButton>
          </CButtonGroup>
        </div>

        <CRow className="g-2 mb-3">
          <CCol md={viewMode === 'member' ? 4 : 6}>
            <CInputGroup>
              <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
              <CFormInput
                placeholder="Search student, owner, reference… (any word order)"
                value={paymentSearchQuery}
                onChange={(e) => {
                  setPaymentSearchQuery(e.target.value)
                  setPage(1)
                }}
              />
            </CInputGroup>
          </CCol>
          {viewMode === 'member' && (
            <CCol md={4}>
              <CFormSelect
                value={selectedOwnerId}
                onChange={(e) => {
                  setSelectedOwnerId(e.target.value)
                  setPage(1)
                }}
              >
                {memberSummaries.map((m) => (
                  <option key={m.ownerId} value={m.ownerId}>
                    {m.ownerName}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          )}
          <CCol md={viewMode === 'member' ? 4 : 6}>
            <CFormSelect
              value={paymentDateFilter}
              onChange={(e) => {
                setPaymentDateFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </CFormSelect>
          </CCol>
        </CRow>

        <div className="sms-audit-stats mb-4">
          <div className="sms-audit-stat sms-audit-stat--blue">
            <span className="sms-audit-stat-val">{scopeStats.count}</span>
            <span className="sms-audit-stat-lbl">Payments</span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--green">
            <span className="sms-audit-stat-val">{formatMK(scopeStats.amount)}</span>
            <span className="sms-audit-stat-lbl">Collected</span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--red">
            <span className="sms-audit-stat-val">{formatMK(scopeStats.outstanding)}</span>
            <span className="sms-audit-stat-lbl">Outstanding</span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--orange">
            <span className="sms-audit-stat-val">{scopeStats.pendingStudents}</span>
            <span className="sms-audit-stat-lbl">Students owing</span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--purple">
            <span className="sms-audit-stat-val">{scopeStats.initial}</span>
            <span className="sms-audit-stat-lbl">Initial</span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--cyan">
            <span className="sms-audit-stat-val">{scopeStats.additional}</span>
            <span className="sms-audit-stat-lbl">Additional</span>
          </div>
        </div>

        {viewMode === 'compare' ? (
          <div className="sms-finance-compare-table">
            <CTable responsive hover className="mb-0 align-middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Team member</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Payments</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Collected</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Students</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Outstanding</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {memberSummaries.map((m) => (
                  <CTableRow key={m.ownerId}>
                    <CTableDataCell>
                      <CBadge color={getOwnerBadgeColor(m.ownerType)} className="me-2">
                        {m.ownerName?.split(' ')[0]}
                      </CBadge>
                      <strong>{m.ownerName}</strong>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{m.paymentCount}</CTableDataCell>
                    <CTableDataCell className="text-end text-success fw-semibold">
                      {formatMK(m.totalCollected)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{m.studentCount}</CTableDataCell>
                    <CTableDataCell className="text-end text-danger fw-semibold">
                      {formatMK(m.outstanding)}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      {m.pendingStudents === 0 ? (
                        <CBadge color="success">
                          <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                          Clear
                        </CBadge>
                      ) : (
                        <CBadge color="warning">
                          <CIcon icon={cilWarning} size="sm" className="me-1" />
                          {m.pendingStudents} owing
                        </CBadge>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {memberSummaries.length > 1 && (
                  <CTableRow className="sms-finance-compare-total">
                    <CTableDataCell><strong>All team</strong></CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">
                      {memberSummaries.reduce((s, m) => s + m.paymentCount, 0)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold text-success">
                      {formatMK(memberSummaries.reduce((s, m) => s + m.totalCollected, 0))}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">
                      {memberSummaries.reduce((s, m) => s + m.studentCount, 0)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold text-danger">
                      {formatMK(memberSummaries.reduce((s, m) => s + m.outstanding, 0))}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color="primary">
                        {memberSummaries.reduce((s, m) => s + m.pendingStudents, 0)} owing
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <CAlert color="info" className="text-center mb-0">No payments match your filters.</CAlert>
        ) : (
          <>
            <CTable responsive hover className="sms-audit-payments-table mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Student</CTableHeaderCell>
                  {viewMode === 'all' && <CTableHeaderCell>Owner</CTableHeaderCell>}
                  <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  <CTableHeaderCell>Method</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Type</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Balance</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedPayments.map((payment) => {
                  const paymentDate = payment.paymentDate?.toDate
                    ? format(payment.paymentDate.toDate(), 'dd MMM yyyy HH:mm')
                    : '—'
                  const paymentType = payment.isInitialPayment ? 'Initial' : 'Additional'
                  const student = allStudents.find((s) => s.id === payment.studentId && s.ownerId === payment.ownerId)
                  const balance = student ? calcBalance(student) : null

                  return (
                    <CTableRow key={payment.id}>
                      <CTableDataCell className="text-nowrap">{paymentDate}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{payment.studentName || '—'}</strong>
                        {payment.referenceNumber && (
                          <div className="small text-muted">Ref: {payment.referenceNumber}</div>
                        )}
                      </CTableDataCell>
                      {viewMode === 'all' && (
                        <CTableDataCell>
                          <CBadge color={getOwnerBadgeColor(payment.ownerType)}>
                            {payment.ownerName}
                          </CBadge>
                        </CTableDataCell>
                      )}
                      <CTableDataCell className="text-end fw-bold text-success">
                        {formatMK(payment.amount)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getPaymentMethodColor(payment.paymentMethod)}>
                          {payment.paymentMethod}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                          {paymentType}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {balance === null ? (
                          '—'
                        ) : balance <= 0 ? (
                          <CBadge color="success">Paid</CBadge>
                        ) : (
                          <span className="text-danger fw-semibold">{formatMK(balance)}</span>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
            <SmartPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </CModalBody>
      <CModalFooter className="sms-modal-footer">
        {onExportPdf && (
          <CButton color="primary" onClick={onExportPdf}>
            <CIcon icon={cilCloudDownload} className="me-1" />
            Export PDF
          </CButton>
        )}
        <CButton color="secondary" variant="ghost" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PaymentAuditModal
