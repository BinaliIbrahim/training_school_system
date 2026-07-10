import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CProgress,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChart, cilPeople, cilBook, cilCalendar, cilMoney } from '@coreui/icons'

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
  }).format(amount)

const UserStatsModal = ({ visible, onClose, user, getOwnerBadgeColor }) => {
  if (!user) return null

  const rate =
    user.totalDue > 0 ? Math.min(100, (user.totalCollected / user.totalDue) * 100) : 0

  const stats = [
    { label: 'Students', value: user.studentCount, icon: cilPeople, tone: 'purple' },
    { label: 'Courses', value: user.courseCount, icon: cilBook, tone: 'blue' },
    { label: 'Cohorts', value: user.cohortCount, icon: cilCalendar, tone: 'orange' },
    { label: 'Payments', value: user.paymentCount, icon: cilMoney, tone: 'green' },
  ]

  const finance = [
    { label: 'Total Due', value: formatMK(user.totalDue), tone: 'orange' },
    { label: 'Collected', value: formatMK(user.totalCollected), tone: 'green' },
    { label: 'Balance', value: formatMK(user.totalBalance), tone: user.totalBalance > 0 ? 'red' : 'green' },
  ]

  return (
    <CModal size="lg" visible={visible} onClose={onClose} className="sms-audit-modal">
      <CModalHeader className="sms-modal-header">
        <CModalTitle>
          <CIcon icon={cilChart} className="me-2" />
          {user.fullName || user.email}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="sms-modal-body">
        <CRow className="g-3 mb-4">
          {stats.map((s) => (
            <CCol sm={6} md={3} key={s.label}>
              <div className={`sms-stat-mini sms-stat-mini--${s.tone}`}>
                <CIcon icon={s.icon} className="sms-stat-mini-icon" />
                <div className="sms-stat-mini-val">{s.value}</div>
                <div className="sms-stat-mini-lbl">{s.label}</div>
              </div>
            </CCol>
          ))}
        </CRow>

        <div className="sms-finance-row mb-4">
          {finance.map((f) => (
            <div key={f.label} className={`sms-finance-pill sms-finance-pill--${f.tone}`}>
              <span className="sms-finance-lbl">{f.label}</span>
              <span className="sms-finance-val">{f.value}</span>
            </div>
          ))}
        </div>

        <CRow className="g-3">
          <CCol md={6}>
            <div className="sms-info-panel">
              <h6 className="sms-info-panel-title">Profile</h6>
              <div className="sms-info-row">
                <span>Name</span>
                <strong>{user.fullName || 'N/A'}</strong>
              </div>
              <div className="sms-info-row">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="sms-info-row">
                <span>Role</span>
                <CBadge
                  color={
                    user.role === 'super-admin'
                      ? 'danger'
                      : user.role === 'admin'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {user.role}
                </CBadge>
              </div>
              <div className="sms-info-row">
                <span>Type</span>
                <CBadge color={getOwnerBadgeColor(user.userType)}>{user.userType}</CBadge>
              </div>
            </div>
          </CCol>
          <CCol md={6}>
            <div className="sms-info-panel">
              <h6 className="sms-info-panel-title">Collection performance</h6>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Collection rate</span>
                <strong>{rate.toFixed(1)}%</strong>
              </div>
              <CProgress className="sms-balance-progress mb-3" color="success" value={rate} />
              <div className="sms-info-row">
                <span>Avg per student</span>
                <strong>
                  {user.studentCount > 0
                    ? formatMK(user.totalDue / user.studentCount)
                    : formatMK(0)}
                </strong>
              </div>
            </div>
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter className="sms-modal-footer">
        <CButton color="secondary" variant="ghost" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default UserStatsModal
