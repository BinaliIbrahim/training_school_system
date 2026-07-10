import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CRow,
  CCol,
  CButton,
  CFormInput,
  CFormLabel,
  CAlert,
  CSpinner,
  CAvatar,
  CImage,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilPencil,
  cilSettings,
  cilCreditCard,
  cilPeople,
  cilBook,
  cilCalendar,
  cilMoney,
  cilCheckCircle,
  cilLockLocked,
} from '@coreui/icons'
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { format } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'
import ProtectedRoute from '../../components/ProtectedRoute'
import { auth, db } from '../../firebase'
import {
  formatSubscriptionStatus,
  isSubscriptionActive,
  toJsDate,
} from '../../utils/subscription'

const ROLE_COLORS = {
  'super-admin': 'danger',
  admin: 'warning',
  teacher: 'info',
  student: 'secondary',
}

const ProfileContent = () => {
  const { user, profile, role, loading: authLoading } = useAuth()
  const { photoURL, uploading, error: photoError, openFilePicker, handleFileChange, fileInputRef, clearError } =
    useProfilePhoto()
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({ students: 0, courses: 0, cohorts: 0, payments: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (!user?.uid) return

    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const uid = user.uid
        const [students, courses, cohorts, payments] = await Promise.all(
          ['students', 'courses', 'cohorts', 'payments'].map(async (col) => {
            const snap = await getDocs(collection(db, 'users', uid, col))
            return snap.size
          }),
        )
        setStats({ students, courses, cohorts, payments })
      } catch (err) {
        console.error('Stats load error', err)
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [user?.uid])

  const showToast = (msg, color = 'success') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!user?.uid) return

    if (!form.fullName.trim()) {
      showToast('Full name is required', 'danger')
      return
    }

    if (form.phone && !form.phone.match(/^\+265(99|88)\d{7}$/)) {
      showToast('Use Malawi format: +26599XXXXXXX', 'danger')
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: form.fullName.trim(),
        phone: form.phone || null,
        profileComplete: true,
      })
      showToast('Profile updated successfully')
    } catch (err) {
      console.error(err)
      showToast('Failed to save profile', 'danger')
    } finally {
      setSaving(false)
    }
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

  const subActive = isSubscriptionActive(profile?.subscriptionenddate)
  const subStatus = formatSubscriptionStatus(profile)
  const memberSince = profile?.createdAt
    ? format(toJsDate(profile.createdAt) || new Date(), 'dd MMM yyyy')
    : '—'
  const lastLogin = profile?.lastLogin
    ? format(new Date(profile.lastLogin), 'dd MMM yyyy · HH:mm')
    : 'First session'

  const dashboardLink =
    role === 'super-admin'
      ? '/admin/control'
      : role === 'admin'
        ? '/admin/overview'
        : role === 'teacher'
          ? '/team'
          : '/dashboard'

  if (authLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const displayPhoto = photoURL || profile?.photoURL

  const onPhotoSelected = async (e) => {
    const result = await handleFileChange(e)
    if (result?.success) {
      showToast('Profile photo saved to your account')
    } else if (result?.error) {
      showToast(result.error, 'danger')
    }
  }

  const statCards = [
    { label: 'Students', value: stats.students, icon: cilPeople, tone: 'purple' },
    { label: 'Courses', value: stats.courses, icon: cilBook, tone: 'blue' },
    { label: 'Cohorts', value: stats.cohorts, icon: cilCalendar, tone: 'orange' },
    { label: 'Payments', value: stats.payments, icon: cilMoney, tone: 'green' },
  ]

  return (
    <div className="sms-profile-page">
      {toast && (
        <CAlert color={toast.color} className="mb-4" dismissible onClose={() => setToast(null)}>
          {toast.msg}
        </CAlert>
      )}

      {photoError && (
        <CAlert color="danger" className="mb-4" dismissible onClose={clearError}>
          {photoError}
        </CAlert>
      )}

      {/* Hero */}
      <div className="sms-profile-hero mb-4">
        <div className="sms-profile-hero-inner">
          <div className="position-relative d-inline-block">
            {uploading ? (
              <div className="sms-profile-avatar-wrap">
                <CSpinner color="light" />
              </div>
            ) : displayPhoto ? (
              <CAvatar size="xl" className="sms-profile-avatar sms-header-avatar--round">
                <CImage src={displayPhoto} alt="Profile" className="sms-header-avatar-img" />
              </CAvatar>
            ) : (
              <CAvatar color="primary" textColor="white" size="xl" className="sms-profile-avatar">
                {form.fullName?.[0]?.toUpperCase() || <CIcon icon={cilUser} />}
              </CAvatar>
            )}
            <button
              type="button"
              className="sms-profile-edit-photo"
              onClick={openFilePicker}
              disabled={uploading}
              aria-label="Change photo"
            >
              <CIcon icon={cilPencil} size="sm" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onPhotoSelected}
              hidden
            />
          </div>

          <div className="sms-profile-hero-text">
            <h2 className="mb-1 fw-bold">{form.fullName || 'Your Profile'}</h2>
            <p className="text-muted mb-2">{profile?.email || user?.email}</p>
            <div className="d-flex flex-wrap gap-2">
              <CBadge color={ROLE_COLORS[role] || 'secondary'}>{role || 'user'}</CBadge>
              <CBadge color={subActive ? 'success' : 'warning'}>
                {subActive ? 'Subscription active' : 'Subscription inactive'}
              </CBadge>
            </div>
          </div>

          <div className="sms-profile-hero-actions">
            <CButton color="primary" variant="outline" as={NavLink} to="/settings">
              <CIcon icon={cilSettings} className="me-1" /> Settings
            </CButton>
            <CButton color="primary" as={NavLink} to={dashboardLink} className="sms-btn-glow">
              Open dashboard
            </CButton>
          </div>
        </div>
      </div>

      <CRow className="g-4">
        <CCol lg={7}>
          {/* Personal info */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Personal information</h5>
            <p className="sms-settings-card-sub">Update your name and contact details.</p>
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <CFormLabel>Full name</CFormLabel>
                <CFormInput
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Email</CFormLabel>
                <CFormInput value={profile?.email || user?.email || ''} disabled readOnly />
                <div className="form-text">Email cannot be changed here. Contact support if needed.</div>
              </div>
              <div className="mb-4">
                <CFormLabel>Phone (Malawi)</CFormLabel>
                <CFormInput
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+26599XXXXXXX"
                />
              </div>
              <CButton color="primary" type="submit" disabled={saving}>
                {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilCheckCircle} className="me-2" />}
                Save changes
              </CButton>
            </form>
          </div>

          {/* Security */}
          <div className="sms-settings-card">
            <h5 className="sms-settings-card-title">
              <CIcon icon={cilLockLocked} className="me-2" />
              Security
            </h5>
            <p className="sms-settings-card-sub">Manage your password and account access.</p>
            <CButton color="secondary" variant="outline" onClick={handleResetPassword} disabled={resetLoading}>
              {resetLoading ? <CSpinner size="sm" /> : 'Send password reset email'}
            </CButton>
            <CButton
              color="danger"
              variant="ghost"
              className="ms-2"
              onClick={() => auth.signOut()}
            >
              Sign out
            </CButton>
          </div>
        </CCol>

        <CCol lg={5}>
          {/* Account overview */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">Account overview</h5>
            <div className="sms-info-row">
              <span>Member since</span>
              <strong>{memberSince}</strong>
            </div>
            <div className="sms-info-row">
              <span>Last login</span>
              <strong>{lastLogin}</strong>
            </div>
            <div className="sms-info-row">
              <span>Profile status</span>
              <CBadge color={profile?.profileComplete || displayPhoto ? 'success' : 'warning'}>
                {profile?.profileComplete || displayPhoto ? 'Complete' : 'Incomplete'}
              </CBadge>
            </div>
            <div className="sms-info-row mb-0">
              <span>User ID</span>
              <span className="small text-muted">{user?.uid?.slice(0, 16)}…</span>
            </div>
          </div>

          {/* Subscription */}
          <div className="sms-settings-card mb-4">
            <h5 className="sms-settings-card-title">
              <CIcon icon={cilCreditCard} className="me-2" />
              Subscription
            </h5>
            <p className="small mb-3">{subStatus}</p>
            <CButton color="primary" variant="outline" className="w-100" as={NavLink} to="/subscription">
              Manage subscription
            </CButton>
          </div>

          {/* School stats */}
          {(role === 'admin' || role === 'super-admin' || role === 'teacher' || stats.students > 0) && (
            <div className="sms-settings-card">
              <h5 className="sms-settings-card-title">Your school data</h5>
              {statsLoading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" />
                </div>
              ) : (
                <CRow className="g-2">
                  {statCards.map((s) => (
                    <CCol xs={6} key={s.label}>
                      <div className={`sms-stat-mini sms-stat-mini--${s.tone}`}>
                        <CIcon icon={s.icon} className="sms-stat-mini-icon" />
                        <div className="sms-stat-mini-val">{s.value}</div>
                        <div className="sms-stat-mini-lbl">{s.label}</div>
                      </div>
                    </CCol>
                  ))}
                </CRow>
              )}
            </div>
          )}
        </CCol>
      </CRow>
    </div>
  )
}

const Profile = () => (
  <ProtectedRoute>
    <ProfileContent />
  </ProtectedRoute>
)

export default Profile
