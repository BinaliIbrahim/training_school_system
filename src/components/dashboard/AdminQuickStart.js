import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowRight,
  cilCalendar,
  cilChartPie,
  cilCheckCircle,
  cilCloudUpload,
  cilMoney,
  cilPeople,
  cilShieldAlt,
  cilSpeedometer,
  cilX,
} from '@coreui/icons'
import { dismissQuickStart, isQuickStartVisible } from '../../utils/onboarding'

const StepCard = ({ step, icon, title, detail, to, state, color = 'primary', onNavigate }) => (
  <CCol md={6} xl={3}>
    <button
      type="button"
      className={`sms-quickstart-step sms-quickstart-step--${color}`}
      onClick={() => onNavigate(to, state)}
    >
      <span className="sms-quickstart-num">{step}</span>
      <span className="sms-quickstart-icon">
        <CIcon icon={icon} />
      </span>
      <span className="sms-quickstart-title">{title}</span>
      <span className="sms-quickstart-detail">{detail}</span>
      <span className="sms-quickstart-go">
        Go <CIcon icon={cilArrowRight} size="sm" />
      </span>
    </button>
  </CCol>
)

const ADMIN_STEPS = [
  {
    icon: cilPeople,
    title: 'Add your team',
    detail: 'Create coordinators and set who can add, edit, or delete records.',
    to: '/admin/users',
    color: 'cyan',
  },
  {
    icon: cilCalendar,
    title: 'Create cohorts',
    detail: 'Open My School → Cohorts. Add an intake period, then add courses to it.',
    to: '/admin/overview',
    state: { activeSection: 'cohorts' },
    color: 'indigo',
  },
  {
    icon: cilMoney,
    title: 'Students & payments',
    detail: 'Open a cohort → Students tab. Add students and record fees from Actions.',
    to: '/admin/overview',
    state: { activeSection: 'cohorts' },
    color: 'green',
  },
  {
    icon: cilChartPie,
    title: 'Track collections',
    detail: 'Use Payment Audit or Analytics to see who paid and who still owes.',
    to: '/admin/overview',
    state: { openPayments: true },
    color: 'orange',
  },
]

const SUPER_ADMIN_STEPS = [
  {
    icon: cilShieldAlt,
    title: 'Approve users',
    detail: 'Review coordinators and admins waiting for platform approval.',
    to: '/admin/users',
    color: 'orange',
  },
  {
    icon: cilSpeedometer,
    title: 'School operations',
    detail: 'Open My School for cohorts, students, courses, and payments.',
    to: '/admin/overview',
    state: { activeSection: 'cohorts' },
    color: 'indigo',
  },
  {
    icon: cilCloudUpload,
    title: 'Backup data',
    detail: 'Download or restore a full ZIP backup in Settings.',
    to: '/settings',
    color: 'cyan',
  },
  {
    icon: cilCheckCircle,
    title: 'Audit sign-ins',
    detail: 'See who logged in, when, and from which device.',
    to: '/admin/logs',
    color: 'green',
  },
]

const AdminQuickStart = ({ role = 'admin', compact = false }) => {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(() => isQuickStartVisible())

  if (!visible || !['admin', 'super-admin'].includes(role)) return null

  const steps = role === 'super-admin' ? SUPER_ADMIN_STEPS : ADMIN_STEPS

  const handleNavigate = (to, state) => {
    navigate(to, state ? { state } : undefined)
  }

  const handleDismiss = () => {
    dismissQuickStart()
    setVisible(false)
  }

  return (
    <div className={`sms-quickstart ${compact ? 'sms-quickstart--compact mb-3' : 'mb-4'}`}>
      <div className="sms-quickstart-head">
        <div>
          <div className="sms-quickstart-kicker">Start here</div>
          <h5 className="fw-bold mb-1">Your school in 4 steps</h5>
          {!compact && (
            <p className="text-muted small mb-0">
              Follow this path once — daily work lives under <strong>My School</strong>.
            </p>
          )}
        </div>
        <CButton color="link" className="sms-quickstart-dismiss p-0" onClick={handleDismiss}>
          <CIcon icon={cilX} /> Dismiss
        </CButton>
      </div>
      <CRow className="g-3 mt-1">
        {steps.map((step, index) => (
          <StepCard
            key={step.title}
            step={index + 1}
            {...step}
            onNavigate={handleNavigate}
          />
        ))}
      </CRow>
    </div>
  )
}

export default AdminQuickStart
