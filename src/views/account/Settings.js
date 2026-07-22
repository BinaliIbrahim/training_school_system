import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  CRow,
  CCol,
  CButton,
  CFormSelect,
  CAlert,
  CSpinner,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSun,
  cilMoon,
  cilContrast,
  cilSettings,
  cilBell,
  cilCreditCard,
  cilPeople,
  cilLockLocked,
  cilCheckCircle,
  cilCloudDownload,
  cilDescription,
} from '@coreui/icons'
import { useAuth } from '../../hooks/useAuth'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import ProtectedRoute from '../../components/ProtectedRoute'
import PwaInstallBanner from '../../components/PwaInstallBanner'
import UserManual from '../../components/account/UserManual'
import BackupDownloadButton from '../../components/dashboard/BackupDownloadButton'
import BackupImportButton from '../../components/dashboard/BackupImportButton'
import { fetchSchoolBackupData } from '../../utils/csvBackup'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { getWorkspaceRouteForRole } from '../../constants/roles'

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: cilSun, desc: 'Bright and clean for daytime use' },
  { id: 'dark', label: 'Dark', icon: cilMoon, desc: 'Easy on the eyes — great at night' },
  { id: 'auto', label: 'Auto', icon: cilContrast, desc: 'Follows your device settings' },
]

const ToggleRow = ({ label, desc, checked, onChange, disabled }) => (
  <div className="sms-setting-row">
    <div>
      <div className="sms-setting-label">{label}</div>
      {desc && <div className="sms-setting-desc">{desc}</div>}
    </div>
    <label className="sms-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="sms-toggle-slider" />
    </label>
  </div>
)

const SettingsContent = () => {
  const { user, profile, role } = useAuth()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const dispatch = useDispatch()
  const sidebarShow = useSelector((s) => s.sidebarShow)
  const sidebarUnfoldable = useSelector((s) => s.sidebarUnfoldable)
  const { preferences, loading, saving, savePreference } = useUserPreferences(user?.uid)
  const [toast, setToast] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  const showToast = (msg, color = 'success') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePref = async (key, value) => {
    const ok = await savePreference(key, value)
    if (key === 'showWelcomeTips') {
      localStorage.setItem('sms-show-welcome-tips', value ? 'true' : 'false')
    }
    if (ok) showToast('Setting saved')
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      showToast('Password reset link sent to your email')
    } catch {
      showToast('Could not send reset email', 'danger')
    } finally {
      setResetLoading(false)
    }
  }

  const dashboardLink = getWorkspaceRouteForRole(role)

  const isSuperAdmin = role === 'super-admin'
  const isSchoolAdmin = role === 'admin' || isSuperAdmin
  const backupProfile = user?.uid ? { id: user.uid, ...profile, role } : null

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <div className="sms-settings-page">
      <div className="sms-page-hero mb-4">
        <div>
          <h2 className="mb-1 fw-bold">
            <CIcon icon={cilSettings} className="me-2" />
            Settings
          </h2>
          <p className="text-muted mb-0">Personalize SMS Pro — appearance, alerts, and account shortcuts.</p>
        </div>
        {saving && <CSpinner size="sm" color="primary" />}
      </div>

      {toast && (
        <CAlert color={toast.color} className="mb-4" dismissible onClose={() => setToast(null)}>
          {toast.msg}
        </CAlert>
      )}

      <PwaInstallBanner />

      <CRow className="g-4">
        <CCol lg={8}>
          {/* Appearance */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Appearance</h5>
            <p className="sms-settings-card-sub">Choose how SMS Pro looks on your screen.</p>
            <div className="sms-theme-grid">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`sms-theme-option ${colorMode === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setColorMode(t.id)
                    showToast(`${t.label} mode applied`)
                  }}
                >
                  <CIcon icon={t.icon} size="xl" className="mb-2" />
                  <span className="fw-bold">{t.label}</span>
                  <span className="sms-theme-option-desc">{t.desc}</span>
                  {colorMode === t.id && (
                    <CIcon icon={cilCheckCircle} className="sms-theme-check" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Layout</h5>
            <p className="sms-settings-card-sub">Control sidebar and navigation behaviour.</p>
            <ToggleRow
              label="Show sidebar"
              desc="Display the navigation panel on the left"
              checked={sidebarShow}
              onChange={(v) => {
                dispatch({ type: 'set', sidebarShow: v })
                showToast(v ? 'Sidebar visible' : 'Sidebar hidden')
              }}
            />
            <ToggleRow
              label="Compact sidebar"
              desc="Icons only — more room for your data"
              checked={sidebarUnfoldable}
              onChange={(v) => {
                dispatch({ type: 'set', sidebarUnfoldable: v })
                handlePref('sidebarCompact', v)
              }}
            />
            <ToggleRow
              label="Show welcome tips"
              desc="Helpful guides on dashboard sections"
              checked={preferences.showWelcomeTips}
              onChange={(v) => handlePref('showWelcomeTips', v)}
              disabled={saving}
            />
          </div>

          {/* Notifications */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">
              <CIcon icon={cilBell} className="me-2" />
              Notifications
            </h5>
            <p className="sms-settings-card-sub">Choose what updates you receive.</p>
            <ToggleRow
              label="Push notifications"
              desc="Browser alerts when you or your team perform actions (bell + native pop-ups)"
              checked={preferences.pushNotifications}
              onChange={(v) => handlePref('pushNotifications', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Email notifications"
              desc="Account and subscription updates via email"
              checked={preferences.emailNotifications}
              onChange={(v) => handlePref('emailNotifications', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Payment alerts"
              desc="Email + in-app reminders 14, 7, 3, and 1 day before your Admin subscription expires (MWK 120,000/mo)"
              checked={preferences.paymentAlerts}
              onChange={(v) => handlePref('paymentAlerts', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Weekly digest"
              desc="Summary of collections and enrollments every Monday"
              checked={preferences.weeklyDigest}
              onChange={(v) => handlePref('weeklyDigest', v)}
              disabled={saving}
            />
          </div>

          {/* User guide */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">
              <CIcon icon={cilDescription} className="me-2" />
              User guide
            </h5>
            <p className="sms-settings-card-sub">
              Step-by-step instructions for your role — download a PDF to share or print.
            </p>
            <UserManual compact />
            <CButton color="primary" variant="outline" size="sm" className="mt-3" as={NavLink} to="/help">
              Open full guide
            </CButton>
          </div>

          {isSchoolAdmin && backupProfile && (
            <div className="sms-settings-card mb-4 border-0 sms-backup-panel">
              <h5 className="sms-settings-card-title">
                <CIcon icon={cilCloudDownload} className="me-2" />
                Full system backup
              </h5>
              <p className="sms-settings-card-sub">
                {isSuperAdmin
                  ? 'Export or restore all platform data as CSV files in a ZIP — users, students, courses, cohorts, payments, and public sites.'
                  : 'Export or restore your school data as CSV files in a ZIP — team accounts, students, catalog, payments, and your public site.'}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <BackupDownloadButton
                  color={isSuperAdmin ? 'danger' : 'primary'}
                  variant="solid"
                  size="sm"
                  label="Download backup ZIP"
                  onBackup={() => fetchSchoolBackupData(db, backupProfile)}
                  onSuccess={(msg) => showToast(msg)}
                  onError={(msg) => showToast(msg, 'danger')}
                />
                <BackupImportButton
                  db={db}
                  profile={backupProfile}
                  color={isSuperAdmin ? 'danger' : 'primary'}
                  variant="outline"
                  size="sm"
                  label="Import backup ZIP"
                  onSuccess={(msg) => showToast(msg)}
                  onError={(msg) => showToast(msg, 'danger')}
                />
              </div>
            </div>
          )}

          {/* Regional */}
          <div className="sms-settings-card">
            <h5 className="sms-settings-card-title">Regional</h5>
            <p className="sms-settings-card-sub">Date and currency display for Malawi.</p>
            <div className="sms-setting-row">
              <div>
                <div className="sms-setting-label">Date format</div>
                <div className="sms-setting-desc">How dates appear across the app</div>
              </div>
              <CFormSelect
                size="sm"
                className="sms-setting-select"
                value={preferences.dateFormat}
                onChange={(e) => handlePref('dateFormat', e.target.value)}
                disabled={saving}
              >
                <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                <option value="MMM dd, yyyy">MMM DD, YYYY</option>
                <option value="yyyy-MM-dd">YYYY-MM-DD</option>
              </CFormSelect>
            </div>
            <div className="sms-setting-row mb-0">
              <div>
                <div className="sms-setting-label">Currency</div>
                <div className="sms-setting-desc">Malawian Kwacha (MWK)</div>
              </div>
              <span className="badge bg-primary-subtle text-primary fw-semibold">MK</span>
            </div>
          </div>
        </CCol>

        <CCol lg={4}>
          {/* Quick actions */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Quick actions</h5>
            <div className="d-grid gap-2">
              <CButton color="primary" as={NavLink} to="/profile" className="sms-btn-glow">
                Edit profile
              </CButton>
              <CButton color="primary" variant="outline" as={NavLink} to={dashboardLink}>
                Go to dashboard
              </CButton>
              <CButton color="primary" variant="outline" as={NavLink} to="/subscription">
                <CIcon icon={cilCreditCard} className="me-2" />
                Manage subscription
              </CButton>
              {(role === 'admin' || role === 'super-admin') && (
                <CButton color="primary" variant="outline" as={NavLink} to="/admin/users">
                  <CIcon icon={cilPeople} className="me-2" />
                  Manage team
                </CButton>
              )}
            </div>
          </div>

          {/* Security */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">
              <CIcon icon={cilLockLocked} className="me-2" />
              Security
            </h5>
            <p className="sms-settings-card-sub small">
              Signed in as <strong>{profile?.email || user?.email}</strong>
            </p>
            <CButton
              color="secondary"
              variant="outline"
              className="w-100"
              onClick={handleResetPassword}
              disabled={resetLoading}
            >
              {resetLoading ? <CSpinner size="sm" /> : 'Send password reset email'}
            </CButton>
          </div>

          {/* Account info */}
          <div className="sms-settings-card sms-settings-info">
            <div className="sms-info-row">
              <span>Role</span>
              <span className="badge bg-secondary">{role || 'user'}</span>
            </div>
            <div className="sms-info-row">
              <span>Account ID</span>
              <span className="small text-muted text-truncate" style={{ maxWidth: 140 }}>
                {user?.uid?.slice(0, 12)}…
              </span>
            </div>
          </div>
        </CCol>
      </CRow>
    </div>
  )
}

const Settings = () => (
  <ProtectedRoute>
    <SettingsContent />
  </ProtectedRoute>
)

export default Settings
