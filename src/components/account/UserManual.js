import React, { useEffect, useMemo, useState } from 'react'
import {
  CBadge,
  CAlert,
  CButton,
  CFormSelect,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBook, cilCloudDownload, cilLightbulb } from '@coreui/icons'
import { useAuth } from '../../hooks/useAuth'
import { getRoleBadgeColor, getRoleLabel } from '../../constants/roles'
import {
  canViewerPickManualRole,
  getDefaultManualViewRole,
  getManualRolesForViewer,
  getUserManualForViewer,
} from '../../utils/userManuals'
import { downloadUserManualPdf } from '../../utils/userManualPdf'

const ManualSection = ({ section, index }) => (
  <div className="sms-manual-section">
    <div className="sms-manual-section-head">
      <span className="sms-manual-section-num">{index + 1}</span>
      <h6 className="sms-manual-section-title mb-0">{section.title.replace(/^\d+\.\s*/, '')}</h6>
    </div>
    <ol className="sms-manual-steps mb-0">
      {section.steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  </div>
)

const UserManual = ({ compact = false, className = '' }) => {
  const { profile, role, loading } = useAuth()
  const allowedRoles = useMemo(() => getManualRolesForViewer(role), [role])
  const canPickRole = canViewerPickManualRole(role)
  const [viewRole, setViewRole] = useState(() => getDefaultManualViewRole(role))
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    setViewRole(getDefaultManualViewRole(role))
  }, [role])

  const activeRole = useMemo(() => {
    const allowed = allowedRoles.map((o) => o.value)
    if (!canPickRole) return getDefaultManualViewRole(role)
    return allowed.includes(viewRole) ? viewRole : getDefaultManualViewRole(role)
  }, [allowedRoles, canPickRole, role, viewRole])

  const manual = useMemo(
    () => getUserManualForViewer(role, activeRole),
    [role, activeRole],
  )

  const pickerHint =
    role === 'super-admin'
      ? 'Super admins can preview and download any role guide on the platform.'
      : 'Download team role guides to share with coordinators, accounts, procurement, and other roles.'

  const handleDownload = () => {
    setDownloadError('')
    setDownloading(true)
    try {
      downloadUserManualPdf(manual, {
        recipientName: profile?.fullName || profile?.email,
        recipientEmail: profile?.email,
      })
    } catch (err) {
      console.error('PDF download failed:', err)
      setDownloadError('Could not create the PDF. Please try again or use a different browser.')
    } finally {
      setTimeout(() => setDownloading(false), 600)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner color="primary" size="sm" />
      </div>
    )
  }

  return (
    <div className={`sms-user-manual ${compact ? 'sms-user-manual--compact' : ''} ${className}`.trim()}>
      <div className="sms-manual-hero">
        <div className="sms-manual-hero-icon">
          <CIcon icon={cilBook} size="xl" />
        </div>
        <div className="flex-grow-1">
          <div className="sms-manual-kicker">User guide</div>
          <h5 className="fw-bold mb-1">{manual.title}</h5>
          <p className="text-muted small mb-2">{manual.subtitle}</p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <CBadge color={getRoleBadgeColor(activeRole)}>{getRoleLabel(activeRole)}</CBadge>
            {!canPickRole && (
              <span className="small text-muted">Guide for your role only</span>
            )}
          </div>
        </div>
        <CButton
          color="primary"
          className="sms-btn-glow flex-shrink-0"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <CSpinner size="sm" />
          ) : (
            <>
              <CIcon icon={cilCloudDownload} className="me-2" />
              Download PDF
            </>
          )}
        </CButton>
      </div>

      {downloadError && (
        <CAlert color="danger" className="mb-3 py-2" dismissible onClose={() => setDownloadError('')}>
          {downloadError}
        </CAlert>
      )}

      {canPickRole && (
        <div className="sms-manual-role-picker mb-3">
          <label className="form-label small fw-semibold mb-1">Preview guide for role</label>
          <CFormSelect
            size="sm"
            value={activeRole}
            onChange={(e) => setViewRole(e.target.value)}
            className="sms-manual-role-select"
          >
            {allowedRoles.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </CFormSelect>
          <div className="form-text">{pickerHint}</div>
        </div>
      )}

      <p className="sms-manual-intro">{manual.intro}</p>

      <div className="sms-manual-sections">
        {manual.sections.map((section, index) => (
          <ManualSection key={section.title} section={section} index={index} />
        ))}
      </div>

      {manual.tips?.length > 0 && (
        <div className="sms-manual-tips">
          <div className="sms-manual-tips-head">
            <CIcon icon={cilLightbulb} className="me-2 text-success" />
            Quick tips
          </div>
          <ul className="mb-0">
            {manual.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default UserManual
