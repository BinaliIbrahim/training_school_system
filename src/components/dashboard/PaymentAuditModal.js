import React, { useMemo, useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CBadge,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilList,
  cilSearch,
  cilPeople,
  cilMoney,
  cilCheckCircle,
  cilWarning,
  cilCloudDownload,
} from '@coreui/icons'
import { format } from 'date-fns'
import SmartPagination from '../ui/SmartPagination'

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount)

const PaymentAuditModal = ({
  visible,
  onClose,
  payments,
  filteredPayments,
  allStudents,
  allCourses,
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
  const [tab, setTab] = useState('payments')
  const [page, setPage] = useState(1)
  const [balancePage, setBalancePage] = useState(1)
  const perPage = 8

  const totals = useMemo(
    () => ({
      count: payments.length,
      amount: payments.reduce((s, p) => s + (p.amount || 0), 0),
      initial: payments.filter((p) => p.isInitialPayment).length,
      additional: payments.filter((p) => !p.isInitialPayment).length,
    }),
    [payments],
  )

  const studentBalances = useMemo(() => {
    return allStudents
      .map((s) => {
        const due = calcTotalDue(s)
        const paid = s.amountPaid ?? 0
        const balance = calcBalance(s)
        const rate = due > 0 ? Math.min(100, (paid / due) * 100) : 0
        return {
          ...s,
          totalDue: due,
          paid,
          balance,
          rate,
          status: balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        }
      })
      .sort((a, b) => b.balance - a.balance)
  }, [allStudents, calcTotalDue, calcBalance])

  const filteredBalances = useMemo(() => {
    const q = paymentSearchQuery.trim().toLowerCase()
    if (!q) return studentBalances
    return studentBalances.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.ownerName?.toLowerCase().includes(q),
    )
  }, [studentBalances, paymentSearchQuery])

  const totalPaymentPages = Math.ceil(filteredPayments.length / perPage)
  const totalBalancePages = Math.ceil(filteredBalances.length / perPage)

  const paginatedPayments = filteredPayments.slice((page - 1) * perPage, page * perPage)
  const paginatedBalances = filteredBalances.slice(
    (balancePage - 1) * perPage,
    balancePage * perPage,
  )

  const paidCount = studentBalances.filter((s) => s.status === 'paid').length
  const partialCount = studentBalances.filter((s) => s.status === 'partial').length
  const unpaidCount = studentBalances.filter((s) => s.status === 'unpaid').length

  return (
    <CModal size="xl" visible={visible} onClose={onClose} className="sms-audit-modal">
      <CModalHeader className="sms-modal-header">
        <CModalTitle>
          <CIcon icon={cilList} className="me-2" />
          Payment & Balance Center
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="sms-modal-body">
        <CNav variant="pills" className="sms-audit-tabs mb-4">
          <CNavItem>
            <CNavLink active={tab === 'payments'} onClick={() => { setTab('payments'); setPage(1) }}>
              <CIcon icon={cilMoney} className="me-1" />
              Payments ({filteredPayments.length})
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink active={tab === 'balances'} onClick={() => { setTab('balances'); setBalancePage(1) }}>
              <CIcon icon={cilPeople} className="me-1" />
              Student Balances ({filteredBalances.length})
            </CNavLink>
          </CNavItem>
        </CNav>

        <CRow className="g-2 mb-3">
          <CCol md={6}>
            <CInputGroup className="sms-input-group">
              <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
              <CFormInput
                placeholder="Search student or owner..."
                value={paymentSearchQuery}
                onChange={(e) => {
                  setPaymentSearchQuery(e.target.value)
                  setPage(1)
                  setBalancePage(1)
                }}
              />
            </CInputGroup>
          </CCol>
          <CCol md={6}>
            <CFormSelect
              className="sms-select"
              value={paymentDateFilter}
              onChange={(e) => {
                setPaymentDateFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </CFormSelect>
          </CCol>
        </CRow>

        <div className="sms-audit-stats mb-4">
          {tab === 'payments' ? (
            <>
              <div className="sms-audit-stat sms-audit-stat--blue">
                <span className="sms-audit-stat-val">{totals.count}</span>
                <span className="sms-audit-stat-lbl">Records</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--green">
                <span className="sms-audit-stat-val">{formatMK(totals.amount)}</span>
                <span className="sms-audit-stat-lbl">Total Collected</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--purple">
                <span className="sms-audit-stat-val">{totals.initial}</span>
                <span className="sms-audit-stat-lbl">Initial</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--cyan">
                <span className="sms-audit-stat-val">{totals.additional}</span>
                <span className="sms-audit-stat-lbl">Additional</span>
              </div>
            </>
          ) : (
            <>
              <div className="sms-audit-stat sms-audit-stat--green">
                <span className="sms-audit-stat-val">{paidCount}</span>
                <span className="sms-audit-stat-lbl">Fully Paid</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--orange">
                <span className="sms-audit-stat-val">{partialCount}</span>
                <span className="sms-audit-stat-lbl">Partial</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--red">
                <span className="sms-audit-stat-val">{unpaidCount}</span>
                <span className="sms-audit-stat-lbl">Unpaid</span>
              </div>
              <div className="sms-audit-stat sms-audit-stat--blue">
                <span className="sms-audit-stat-val">
                  {formatMK(studentBalances.reduce((s, x) => s + x.balance, 0))}
                </span>
                <span className="sms-audit-stat-lbl">Total Outstanding</span>
              </div>
            </>
          )}
        </div>

        {tab === 'payments' && (
          <>
            {paginatedPayments.length === 0 ? (
              <CAlert color="info" className="text-center">No payments found.</CAlert>
            ) : (
              <CRow className="g-3">
                {paginatedPayments.map((payment) => {
                  const paymentDate = payment.paymentDate?.toDate
                    ? format(payment.paymentDate.toDate(), 'dd MMM yyyy · HH:mm')
                    : '—'
                  const paymentType = payment.isInitialPayment ? 'Initial' : 'Additional'
                  const student = allStudents.find((s) => s.id === payment.studentId)
                  const balance = student ? calcBalance(student) : null

                  return (
                    <CCol md={6} key={payment.id}>
                      <div className={`sms-payment-card sms-payment-card--${payment.isInitialPayment ? 'initial' : 'additional'}`}>
                        <div className="sms-payment-card-top">
                          <div>
                            <div className="sms-payment-student">{payment.studentName || 'Unknown'}</div>
                            <div className="sms-payment-date">{paymentDate}</div>
                          </div>
                          <div className="sms-payment-amount">{formatMK(payment.amount || 0)}</div>
                        </div>
                        <div className="sms-payment-card-meta">
                          <CBadge color={getOwnerBadgeColor(payment.ownerType)}>
                            {payment.ownerName}
                          </CBadge>
                          <CBadge color={getPaymentMethodColor(payment.paymentMethod)}>
                            {payment.paymentMethod}
                          </CBadge>
                          <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                            {paymentType}
                          </CBadge>
                        </div>
                        {balance !== null && (
                          <div className="sms-payment-balance-row">
                            {balance <= 0 ? (
                              <span className="text-success small">
                                <CIcon icon={cilCheckCircle} className="me-1" />
                                Fully paid
                              </span>
                            ) : (
                              <span className="text-warning small">
                                <CIcon icon={cilWarning} className="me-1" />
                                Remaining: <strong>{formatMK(balance)}</strong>
                              </span>
                            )}
                          </div>
                        )}
                        {payment.referenceNumber && (
                          <div className="sms-payment-ref">Ref: {payment.referenceNumber}</div>
                        )}
                      </div>
                    </CCol>
                  )
                })}
              </CRow>
            )}
            <SmartPagination
              currentPage={page}
              totalPages={totalPaymentPages}
              onPageChange={setPage}
            />
          </>
        )}

        {tab === 'balances' && (
          <>
            {paginatedBalances.length === 0 ? (
              <CAlert color="info" className="text-center">No students found.</CAlert>
            ) : (
              <CRow className="g-3">
                {paginatedBalances.map((s) => (
                  <CCol md={6} lg={4} key={`${s.ownerId}-${s.id}`}>
                    <div className={`sms-balance-card sms-balance-card--${s.status}`}>
                      <div className="sms-balance-card-header">
                        <div className="sms-balance-avatar">
                          {(s.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">{s.name}</div>
                          <div className="small text-muted">{s.ownerName}</div>
                        </div>
                        <CBadge
                          color={
                            s.status === 'paid' ? 'success' : s.status === 'partial' ? 'warning' : 'danger'
                          }
                        >
                          {s.status === 'paid' ? 'Paid' : s.status === 'partial' ? 'Partial' : 'Unpaid'}
                        </CBadge>
                      </div>
                      <div className="sms-balance-amounts">
                        <div>
                          <span className="sms-balance-lbl">Paid</span>
                          <span className="sms-balance-val text-success">{formatMK(s.paid)}</span>
                        </div>
                        <div>
                          <span className="sms-balance-lbl">Due</span>
                          <span className="sms-balance-val">{formatMK(s.totalDue)}</span>
                        </div>
                        <div>
                          <span className="sms-balance-lbl">Balance</span>
                          <span className={`sms-balance-val ${s.balance > 0 ? 'text-danger' : 'text-success'}`}>
                            {formatMK(s.balance)}
                          </span>
                        </div>
                      </div>
                      <CProgress
                        className="sms-balance-progress mt-2"
                        color={s.rate >= 100 ? 'success' : s.rate >= 50 ? 'warning' : 'danger'}
                        value={s.rate}
                      />
                      <div className="small text-muted mt-1 text-end">{s.rate.toFixed(0)}% collected</div>
                    </div>
                  </CCol>
                ))}
              </CRow>
            )}
            <SmartPagination
              currentPage={balancePage}
              totalPages={totalBalancePages}
              onPageChange={setBalancePage}
            />
          </>
        )}
      </CModalBody>
      <CModalFooter className="sms-modal-footer">
        {onExportPdf && (
          <CButton color="primary" onClick={onExportPdf}>
            <CIcon icon={cilCloudDownload} className="me-1" />
            Export Full Audit PDF ({payments.length})
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
