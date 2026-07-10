import React, { useState } from 'react'
import {
  CRow,
  CCol,
  CButton,
  CProgress,
  CBadge,
  CAlert,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilPeople,
  cilBook,
  cilMoney,
  cilChart,
  cilUser,
  cilPencil,
  cilList,
  cilFile,
  cilOptions,
  cilTrash,
} from '@coreui/icons'
import { format, parseISO } from 'date-fns'
import SectionGuide from './SectionGuide'

const TABS = [
  { id: 'summary', label: 'Summary', icon: cilChart },
  { id: 'students', label: 'Students', icon: cilPeople },
  { id: 'courses', label: 'Courses', icon: cilBook },
  { id: 'payments', label: 'Payments', icon: cilMoney },
]

const CohortDetailPanel = ({
  selectedCohortDetails,
  cohortStats,
  cohortStudents,
  cohortCourses,
  cohortPayments,
  allCourses,
  getAllPaymentsWithInitial,
  canCreate,
  canEdit,
  canDelete,
  formatMK,
  calcBalance,
  getCohortStatus,
  getCohortProgress,
  getCohortDuration,
  getOwnerBadgeColor,
  getPaymentMethodColor,
  getPaymentTypeColor,
  backToCohorts,
  openStudentDetailModal,
  openEditStudent,
  openPaymentModal,
  openPaymentHistory,
  generateStudentReceipt,
  openEditCourse,
  openDeleteConfirm,
  openAllPaymentsModal,
}) => {
  const [tab, setTab] = useState('summary')

  if (!selectedCohortDetails) return null

  const status = getCohortStatus(selectedCohortDetails)
  const progress = getCohortProgress(selectedCohortDetails)
  const paidCount = cohortStudents.filter((s) => calcBalance(s) <= 0).length
  const pendingCount = cohortStudents.length - paidCount
  const collectionRate =
    cohortStats.totalDue > 0
      ? Math.min(100, (cohortStats.totalCollected / cohortStats.totalDue) * 100)
      : 0

  return (
    <div className="sms-cohort-detail">
      <SectionGuide section="cohortDetails" />

      <div className="sms-cohort-hero mb-4">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <CButton color="link" className="sms-back-btn p-0 mb-2" onClick={backToCohorts}>
              <CIcon icon={cilArrowLeft} className="me-1" /> Back to cohorts
            </CButton>
            <h4 className="mb-1 fw-bold">{selectedCohortDetails.name}</h4>
            <p className="text-muted mb-2">{selectedCohortDetails.description || 'Cohort workspace'}</p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <CBadge color={status.color}>{status.text}</CBadge>
              <CBadge color={getOwnerBadgeColor(selectedCohortDetails.ownerType)}>
                {selectedCohortDetails.ownerName}
              </CBadge>
              {selectedCohortDetails.startDate && (
                <span className="small text-muted">
                  {format(parseISO(selectedCohortDetails.startDate), 'dd MMM yyyy')} –{' '}
                  {format(parseISO(selectedCohortDetails.endDate), 'dd MMM yyyy')} ·{' '}
                  {getCohortDuration(selectedCohortDetails)}
                </span>
              )}
            </div>
          </div>
          <div className="sms-cohort-hero-stats">
            <div className="sms-hero-stat">
              <span className="sms-hero-stat-val">{cohortStudents.length}</span>
              <span className="sms-hero-stat-lbl">Students</span>
            </div>
            <div className="sms-hero-stat sms-hero-stat--green">
              <span className="sms-hero-stat-val">{paidCount}</span>
              <span className="sms-hero-stat-lbl">Paid</span>
            </div>
            <div className="sms-hero-stat sms-hero-stat--orange">
              <span className="sms-hero-stat-val">{pendingCount}</span>
              <span className="sms-hero-stat-lbl">Pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sms-sub-tabs mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`sms-sub-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <CIcon icon={t.icon} className="me-1" />
            {t.label}
            {t.id === 'students' && ` (${cohortStudents.length})`}
            {t.id === 'courses' && ` (${cohortCourses.length})`}
            {t.id === 'payments' && ` (${cohortPayments.length})`}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="sms-tab-content">
          <CRow className="g-3 mb-4">
            <CCol md={3}>
              <div className="sms-finance-pill sms-finance-pill--orange sms-finance-pill--block">
                <span className="sms-finance-lbl">Total Due</span>
                <span className="sms-finance-val">{formatMK(cohortStats.totalDue)}</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div className="sms-finance-pill sms-finance-pill--green sms-finance-pill--block">
                <span className="sms-finance-lbl">Collected</span>
                <span className="sms-finance-val">{formatMK(cohortStats.totalCollected)}</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div
                className={`sms-finance-pill sms-finance-pill--${cohortStats.totalBalance > 0 ? 'red' : 'green'} sms-finance-pill--block`}
              >
                <span className="sms-finance-lbl">Balance</span>
                <span className="sms-finance-val">{formatMK(cohortStats.totalBalance)}</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div className="sms-finance-pill sms-finance-pill--blue sms-finance-pill--block">
                <span className="sms-finance-lbl">Payments</span>
                <span className="sms-finance-val">{cohortStats.totalPayments}</span>
              </div>
            </CCol>
          </CRow>

          <div className="sms-info-panel mb-4">
            <h6 className="sms-info-panel-title">Timeline & collection</h6>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted small">Cohort progress</span>
              <strong>{Math.round(progress)}%</strong>
            </div>
            <CProgress className="sms-balance-progress mb-3" color={status.color} value={progress} />
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted small">Payment collection</span>
              <strong>{collectionRate.toFixed(1)}%</strong>
            </div>
            <CProgress className="sms-balance-progress" color="success" value={collectionRate} />
          </div>

          <div className="sms-quick-nav">
            <span className="text-muted small me-2">Jump to:</span>
            <CButton color="primary" size="sm" variant="outline" onClick={() => setTab('students')}>
              View students
            </CButton>
            <CButton color="primary" size="sm" variant="outline" onClick={() => setTab('courses')}>
              View courses
            </CButton>
            <CButton color="primary" size="sm" variant="outline" onClick={() => setTab('payments')}>
              View payments
            </CButton>
          </div>
        </div>
      )}

      {tab === 'students' && (
        <div className="sms-tab-content">
          {cohortStudents.length === 0 ? (
            <CAlert color="info">No students in this cohort yet.</CAlert>
          ) : (
            <CRow className="g-3">
              {cohortStudents.map((s) => {
                const course = allCourses.find((c) => c.id === s.courseId && c.ownerId === s.ownerId)
                const balance = calcBalance(s)
                const isPaid = balance <= 0
                const studentPayments = getAllPaymentsWithInitial.filter(
                  (p) => p.studentId === s.id && p.ownerId === s.ownerId,
                )

                return (
                  <CCol md={6} xl={4} key={`${s.ownerId}-${s.id}`}>
                    <div className={`sms-student-card ${isPaid ? 'sms-student-card--paid' : 'sms-student-card--pending'}`}>
                      <div className="sms-student-card-head">
                        <div>
                          <div className="sms-student-name">{s.name}</div>
                          <div className="sms-student-meta">
                            {s.age || '—'} · {s.gender || '—'}
                          </div>
                        </div>
                        <CBadge color={isPaid ? 'success' : 'warning'}>{isPaid ? 'Paid' : 'Pending'}</CBadge>
                      </div>
                      <div className="sms-student-course">{course?.name || 'No course'}</div>
                      <div className="sms-student-amounts">
                        <div>
                          <span className="lbl">Paid</span>
                          <span className="val text-success">{formatMK(s.amountPaid || 0)}</span>
                        </div>
                        <div>
                          <span className="lbl">Balance</span>
                          <span className={`val ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                            {formatMK(balance)}
                          </span>
                        </div>
                      </div>
                      {s.transId && (
                        <CBadge color="info" className="mb-2">
                          Ref: {s.transId}
                        </CBadge>
                      )}
                      {studentPayments.length > 0 && (
                        <div className="small text-muted mb-2">{studentPayments.length} payment(s)</div>
                      )}
                      <CDropdown className="w-100">
                        <CDropdownToggle color="secondary" variant="outline" size="sm" className="w-100">
                          <CIcon icon={cilOptions} className="me-1" /> Actions
                        </CDropdownToggle>
                        <CDropdownMenu>
                          <CDropdownItem onClick={() => openStudentDetailModal(s)}>
                            <CIcon icon={cilUser} className="me-2" /> View details
                          </CDropdownItem>
                          {canEdit && (
                              <CDropdownItem onClick={() => openEditStudent(s)}>
                                <CIcon icon={cilPencil} className="me-2" /> Edit
                              </CDropdownItem>
                          )}
                          {canCreate && (
                              <CDropdownItem onClick={() => openPaymentModal(s)}>
                                <CIcon icon={cilMoney} className="me-2" /> Record payment
                              </CDropdownItem>
                          )}
                          <CDropdownItem onClick={() => openPaymentHistory(s)}>
                            <CIcon icon={cilList} className="me-2" /> Payment history
                          </CDropdownItem>
                          <CDropdownItem onClick={() => generateStudentReceipt(s)}>
                            <CIcon icon={cilFile} className="me-2" /> Receipt
                          </CDropdownItem>
                        </CDropdownMenu>
                      </CDropdown>
                    </div>
                  </CCol>
                )
              })}
            </CRow>
          )}
        </div>
      )}

      {tab === 'courses' && (
        <div className="sms-tab-content">
          {cohortCourses.length === 0 ? (
            <CAlert color="info">No courses linked to this cohort.</CAlert>
          ) : (
            <CRow className="g-3">
              {cohortCourses.map((c) => {
                const enrolled = cohortStudents.filter((s) => s.courseId === c.id).length
                return (
                  <CCol md={6} xl={4} key={`${c.ownerId}-${c.id}`}>
                    <div className="sms-course-card">
                      <div className="sms-course-card-head">
                        <div className="sms-course-name">{c.name}</div>
                        <CBadge color={c.type === 'weekly' ? 'info' : 'warning'}>{c.type}</CBadge>
                      </div>
                      <div className="sms-course-fee">{formatMK(c.fee)}</div>
                      <div className="sms-course-meta">
                        <span>{c.duration}</span>
                        <span>{enrolled} enrolled</span>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="sms-course-actions">
                          {canEdit && (
                            <CButton color="warning" variant="outline" size="sm" onClick={() => openEditCourse(c)}>
                              <CIcon icon={cilPencil} className="me-1" /> Edit
                            </CButton>
                          )}
                          {canDelete && (
                            <CButton color="danger" variant="outline" size="sm" onClick={() => openDeleteConfirm(c, 'course')}>
                              <CIcon icon={cilTrash} className="me-1" /> Delete
                            </CButton>
                          )}
                        </div>
                      )}
                    </div>
                  </CCol>
                )
              })}
            </CRow>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="sms-tab-content">
          {cohortPayments.length === 0 ? (
            <CAlert color="info">No payments recorded for this cohort.</CAlert>
          ) : (
            <>
              <div className="sms-payment-list">
                {cohortPayments.slice(0, 15).map((p) => {
                  const paymentDate = p.paymentDate?.toDate
                    ? format(p.paymentDate.toDate(), 'dd MMM yyyy · HH:mm')
                    : '—'
                  const paymentType = p.isInitialPayment ? 'Initial' : p.transactionType || 'Additional'
                  return (
                    <div key={p.id} className="sms-payment-row">
                      <div>
                        <div className="fw-semibold">{p.studentName || '—'}</div>
                        <div className="small text-muted">{paymentDate}</div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">{formatMK(p.amount || 0)}</div>
                        <div className="d-flex gap-1 justify-content-end mt-1">
                          <CBadge color={getPaymentMethodColor(p.paymentMethod)}>{p.paymentMethod}</CBadge>
                          <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>{paymentType}</CBadge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {cohortPayments.length > 15 && (
                <div className="text-center mt-3">
                  <CButton color="primary" variant="outline" onClick={openAllPaymentsModal}>
                    View all {cohortPayments.length} payments
                  </CButton>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CohortDetailPanel
