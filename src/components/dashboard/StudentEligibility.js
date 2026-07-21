import React from 'react'
import { CBadge, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar } from '@coreui/icons'
import { CERTIFICATE_ELIGIBILITY_MESSAGE } from '../../utils/schoolCatalog'

export const StudentStatusBadge = ({ paid, eligible, className = '' }) => {
  if (eligible) {
    return (
      <CBadge color="info" className={`sms-eligibility-badge ${className}`.trim()}>
        <CIcon icon={cilStar} size="sm" className="me-1" />
        Certs & equipment
      </CBadge>
    )
  }

  return (
    <CBadge color={paid ? 'success' : 'warning'} className={className}>
      {paid ? 'Fully paid' : 'Balance pending'}
    </CBadge>
  )
}

export const StudentEligibilityBanner = ({ eligible, className = '' }) => {
  if (!eligible) return null

  return (
    <CAlert color="info" className={`sms-eligibility-banner mb-0 ${className}`.trim()}>
      <div className="d-flex align-items-start gap-2">
        <CIcon icon={cilStar} className="mt-1 flex-shrink-0" />
        <div>
          <strong>{CERTIFICATE_ELIGIBILITY_MESSAGE}</strong>
          <div className="small mb-0 opacity-90">
            All fees are cleared and the cohort intake has ended.
          </div>
        </div>
      </div>
    </CAlert>
  )
}

export default StudentStatusBadge
