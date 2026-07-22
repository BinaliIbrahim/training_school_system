import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilBook } from '@coreui/icons'
import ProtectedRoute from '../../components/ProtectedRoute'
import UserManual from '../../components/account/UserManual'

const UserGuideContent = () => (
  <div className="sms-settings-page">
    <div className="sms-page-hero mb-4">
      <div>
        <h2 className="mb-1 fw-bold">
          <CIcon icon={cilBook} className="me-2" />
          User guide
        </h2>
        <p className="text-muted mb-0">
          Simple step-by-step instructions for your role — read online or download as PDF.
        </p>
      </div>
    </div>

    <div className="sms-settings-card">
      <UserManual />
    </div>
  </div>
)

const UserGuide = () => (
  <ProtectedRoute>
    <UserGuideContent />
  </ProtectedRoute>
)

export default UserGuide
