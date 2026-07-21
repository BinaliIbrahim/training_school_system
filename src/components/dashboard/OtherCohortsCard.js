import React from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFolderOpen, cilArrowRight } from '@coreui/icons'

const OtherCohortsCard = ({ count, onClick }) => {
  if (count <= 0) return null

  return (
    <div
      className="sms-cohort-card sms-cohort-card--secondary sms-other-cohorts-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="sms-other-cohorts-icon">
        <CIcon icon={cilFolderOpen} size="xl" />
      </div>
      <div className="sms-cohort-name">Other cohorts</div>
      <div className="sms-cohort-desc">
        {count} past or non-active intake{count !== 1 ? 's' : ''}
      </div>
      <CButton color="secondary" variant="outline" className="w-100 mt-3" onClick={(e) => { e.stopPropagation(); onClick() }}>
        View cohorts
        <CIcon icon={cilArrowRight} className="ms-1" />
      </CButton>
    </div>
  )
}

export default OtherCohortsCard
