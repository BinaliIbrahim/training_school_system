import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CListGroup,
  CListGroupItem,
  CProgress,
  CRow,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilChartPie,
  cilSettings,
  cilShieldAlt,
  cilCheckCircle,
  cilXCircle,
  cilCreditCard,
  cilUser,
  cilLockUnlocked,
  cilArrowRight,
  cilBell,
  cilLibrary,
  cilWarning,
  cilList,
} from '@coreui/icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import {
  APPROVAL,
  approvalLabel,
  getUserPermissions,
  isUserApproved,
  permissionsSummary,
} from '../../utils/permissions'
import {
  ADMIN_SUBSCRIPTION_AMOUNT,
  formatMK,
  formatSubscriptionStatus,
  isSubscriptionActive,
  toJsDate,
} from '../../utils/subscription'
import PwaInstallBanner from '../../components/PwaInstallBanner'
import DailyMomentum from '../../components/engagement/DailyMomentum'
import AnimatedNumber from '../../components/engagement/AnimatedNumber'

const toDate = (value) => toJsDate(value)

const daysUntil = (endDate) => {
  const end = toDate(endDate)
  if (!end) return null
  return Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24))
}

const ActionCard = ({ icon, title, description, to, color = 'primary', badge }) => {
  const navigate = useNavigate()
  return (
    <CCard
      className="sms-control-action border-0 h-100"
      role="button"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(to)}
    >
      <CCardBody className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className={`sms-control-action-icon bg-${color}`}>
            <CIcon icon={icon} size="lg" />
          </div>
          {badge && <CBadge color={badge.color}>{badge.text}</CBadge>}
        </div>
        <h6 className="fw-bold mb-1">{title}</h6>
        <p className="text-muted small flex-grow-1 mb-3">{description}</p>
        <CButton color={color} variant="ghost" size="sm" className="align-self-start p-0">
          Open <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
        </CButton>
      </CCardBody>
    </CCard>
  )
}

const StatCard = ({ label, value, sub, icon, color = 'primary' }) => (
  <CCard className="sms-stat-card border-0 h-100">
    <CCardBody className="d-flex align-items-center gap-3">
      <div className={`sms-stat-icon bg-${color}`}>
        <CIcon icon={icon} size="lg" />
      </div>
      <div>
        <div className="sms-stat-value">
          <AnimatedNumber value={value} />
        </div>
        <div className="sms-stat-label">{label}</div>
        {sub && <div className="small text-muted">{sub}</div>}
      </div>
    </CCardBody>
  </CCard>
)

const ControlCenter = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])

  const isSuperAdmin = profile?.role === 'super-admin'
  const isAdmin = profile?.role === 'admin'

  const loadData = useCallback(async (userProfile) => {
    setLoading(true)
    try {
      if (userProfile.role === 'super-admin') {
        const snap = await getDocs(collection(db, 'users'))
        setUsers(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            subscriptionenddate: toDate(d.data().subscriptionenddate),
          })),
        )
      } else if (userProfile.role === 'admin') {
        const list = [{ id: userProfile.id, ...userProfile, isSelf: true }]
        for (const uid of userProfile.managedUserIds || []) {
          const snap = await getDoc(doc(db, 'users', uid))
          if (snap.exists()) {
            list.push({
              id: snap.id,
              ...snap.data(),
              subscriptionenddate: toDate(snap.data().subscriptionenddate),
            })
          }
        }
        setUsers(list)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/login')
        return
      }
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (!snap.exists()) {
        navigate('/login')
        return
      }
      const data = { id: firebaseUser.uid, ...snap.data() }
      if (!['admin', 'super-admin'].includes(data.role)) {
        navigate('/dashboard')
        return
      }
      setProfile(data)
      await loadData(data)
    })
    return unsub
  }, [navigate, loadData])

  const metrics = useMemo(() => {
    if (!profile) return null

    if (isSuperAdmin) {
      const byRole = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1
        return acc
      }, {})
      const pending = users.filter((u) => u.approvalStatus === APPROVAL.PENDING)
      const admins = users.filter((u) => u.role === 'admin')
      const expiringAdmins = admins.filter((u) => {
        const d = daysUntil(u.subscriptionenddate)
        return d != null && d >= 0 && d <= 14
      })
      const inactiveSubs = admins.filter((u) => !isSubscriptionActive(u.subscriptionenddate))

      return {
        totalUsers: users.length,
        pendingCount: pending.length,
        pending,
        adminCount: admins.length,
        expiringAdmins,
        inactiveSubs,
        byRole,
        activeUsers: users.filter((u) => u.active !== false && isUserApproved(u)).length,
      }
    }

    const team = users.filter((u) => !u.isSelf)
    return {
      teamSize: team.length,
      activeTeam: team.filter((u) => u.active !== false && isUserApproved(u)).length,
      withPermissions: team.filter((u) => {
        const p = getUserPermissions(u)
        return p.create || p.edit || p.delete
      }).length,
      subscriptionActive: isSubscriptionActive(profile.subscriptionenddate),
      subscriptionDays: daysUntil(profile.subscriptionenddate),
      subscriptionText: formatSubscriptionStatus(profile),
      team,
    }
  }, [profile, users, isSuperAdmin])

  const superAdminActions = [
    {
      icon: cilShieldAlt,
      title: 'Pending Approvals',
      description: 'Review and approve users created by school admins before they can sign in.',
      to: '/admin/users',
      color: 'warning',
      badge: metrics?.pendingCount ? { color: 'warning', text: `${metrics.pendingCount} pending` } : null,
    },
    {
      icon: cilSettings,
      title: 'Platform Control',
      description: 'Manage all platform users, roles, subscriptions, and permissions.',
      to: '/admin/users',
      color: 'danger',
    },
    {
      icon: cilPeople,
      title: 'All Users',
      description: 'Browse every account, set granular create/edit/delete permissions, and manage access.',
      to: '/admin/users',
      color: 'primary',
    },
    {
      icon: cilList,
      title: 'Login Activity',
      description: 'Audit who signed in across the platform — user, role, device, and timestamp.',
      to: '/admin/logs',
      color: 'dark',
    },
    {
      icon: cilSpeedometer,
      title: 'School Overview',
      description: 'Monitor cohorts, students, courses, and payments across the entire platform.',
      to: '/admin/overview',
      color: 'info',
    },
    {
      icon: cilChartPie,
      title: 'Analytics',
      description: 'Charts and trends for enrollment, revenue, and team performance.',
      to: '/charts',
      color: 'success',
    },
    {
      icon: cilSettings,
      title: 'Settings',
      description: 'Theme, notifications, and account preferences for your super-admin account.',
      to: '/settings',
      color: 'secondary',
    },
  ]

  const adminActions = [
    {
      icon: cilSpeedometer,
      title: 'School Overview',
      description: 'Your live workspace — students, cohorts, courses, and payments for your team.',
      to: '/admin/overview',
      color: 'primary',
      badge: { color: 'success', text: 'Live' },
    },
    {
      icon: cilPeople,
      title: 'My Users',
      description: 'Create team members, assign create/edit/delete permissions, fire or transfer data.',
      to: '/admin/users',
      color: 'info',
    },
    {
      icon: cilList,
      title: 'Login Activity',
      description: 'See when your team members and coordinators last signed in to the system.',
      to: '/admin/logs',
      color: 'dark',
    },
    {
      icon: cilChartPie,
      title: 'Analytics',
      description: 'Track collection rates and team performance across your managed accounts.',
      to: '/charts',
      color: 'success',
    },
    {
      icon: cilCreditCard,
      title: 'Subscription',
      description: `Manage your admin plan (${formatMK(ADMIN_SUBSCRIPTION_AMOUNT)}/month). Required for system access.`,
      to: '/subscription',
      color: metrics?.subscriptionActive ? 'success' : 'warning',
      badge: metrics?.subscriptionActive
        ? { color: 'success', text: 'Active' }
        : { color: 'warning', text: 'Action needed' },
    },
    {
      icon: cilLockUnlocked,
      title: 'Permissions Guide',
      description: 'Grant create, edit, or delete separately per user from the Edit User dialog.',
      to: '/admin/users',
      color: 'secondary',
    },
    {
      icon: cilSettings,
      title: 'Settings',
      description: 'Notification preferences, theme, and profile shortcuts.',
      to: '/settings',
      color: 'secondary',
    },
  ]

  if (loading && !profile) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="text-muted mt-3">Loading control center…</p>
      </div>
    )
  }

  return (
    <div className="sms-control-center">
      <div className="sms-control-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <CBadge color={isSuperAdmin ? 'danger' : 'primary'} className="mb-2">
              {isSuperAdmin ? 'Super Admin' : 'School Admin'}
            </CBadge>
            <h2 className="fw-bold mb-1">Control Center</h2>
            <p className="text-muted mb-0">
              {isSuperAdmin
                ? 'Platform-wide governance — approvals, users, subscriptions, and school data.'
                : 'Your command hub — team, permissions, subscription, and school operations.'}
            </p>
          </div>
          <PwaInstallBanner compact />
        </div>
      </div>

      <PwaInstallBanner />

      <DailyMomentum />

      {isAdmin && metrics && !metrics.subscriptionActive && (
        <CAlert color="warning" className="mb-4">
          <CIcon icon={cilWarning} className="me-2" />
          {metrics.subscriptionText}{' '}
          <CButton color="warning" size="sm" className="ms-2" onClick={() => navigate('/subscription')}>
            Subscribe now
          </CButton>
        </CAlert>
      )}

      {isSuperAdmin && metrics?.pendingCount > 0 && (
        <CAlert color="warning" className="mb-4">
          <CIcon icon={cilBell} className="me-2" />
          <strong>{metrics.pendingCount}</strong> user{metrics.pendingCount !== 1 ? 's' : ''} awaiting your approval.{' '}
          <CButton color="warning" size="sm" variant="outline" className="ms-2" onClick={() => navigate('/admin/users')}>
            Review queue
          </CButton>
        </CAlert>
      )}

      <CRow className="g-3 mb-4">
        {isSuperAdmin && metrics && (
          <>
            <CCol xs={6} xl={3}>
              <StatCard label="Platform Users" value={metrics.totalUsers} icon={cilPeople} color="primary" />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard
                label="Pending Approval"
                value={metrics.pendingCount}
                icon={cilShieldAlt}
                color="warning"
                sub={metrics.pendingCount ? 'Needs review' : 'All clear'}
              />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard label="School Admins" value={metrics.adminCount} icon={cilUser} color="info" />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard
                label="Active Accounts"
                value={metrics.activeUsers}
                icon={cilCheckCircle}
                color="success"
              />
            </CCol>
          </>
        )}
        {isAdmin && metrics && (
          <>
            <CCol xs={6} xl={3}>
              <StatCard label="Team Members" value={metrics.teamSize} icon={cilPeople} color="primary" />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard label="Active" value={metrics.activeTeam} icon={cilCheckCircle} color="success" />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard
                label="With Permissions"
                value={metrics.withPermissions}
                icon={cilLockUnlocked}
                color="info"
              />
            </CCol>
            <CCol xs={6} xl={3}>
              <StatCard
                label="Subscription"
                value={metrics.subscriptionActive ? 'Active' : 'Expired'}
                icon={cilCreditCard}
                color={metrics.subscriptionActive ? 'success' : 'warning'}
                sub={
                  metrics.subscriptionDays != null && metrics.subscriptionActive
                    ? `${metrics.subscriptionDays} days left`
                    : undefined
                }
              />
            </CCol>
          </>
        )}
      </CRow>

      <h5 className="fw-bold mb-3">Quick Actions</h5>
      <CRow className="g-3 mb-4 sms-control-actions">
        {(isSuperAdmin ? superAdminActions : adminActions).map((action) => (
          <CCol xs={12} sm={6} xl={4} key={action.title}>
            <ActionCard {...action} />
          </CCol>
        ))}
      </CRow>

      <CRow className="g-4">
        <CCol lg={7}>
          <CCard className="sms-glass-card border-0 h-100">
            <CCardBody>
              <h6 className="fw-bold mb-3">
                <CIcon icon={isSuperAdmin ? cilShieldAlt : cilPeople} className="me-2" />
                {isSuperAdmin ? 'Your Responsibilities' : 'Team Snapshot'}
              </h6>
              {isSuperAdmin ? (
                <CListGroup flush>
                  <CListGroupItem className="bg-transparent border-0 px-0">
                    <CIcon icon={cilCheckCircle} className="text-success me-2" />
                    Approve or reject users created by school admins
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0">
                    <CIcon icon={cilCheckCircle} className="text-success me-2" />
                    Set subscription end dates for admin accounts
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0">
                    <CIcon icon={cilCheckCircle} className="text-success me-2" />
                    Full platform user management and role assignment
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0">
                    <CIcon icon={cilCheckCircle} className="text-success me-2" />
                    View all school data across every admin workspace
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0">
                    <CIcon icon={cilXCircle} className="text-muted me-2" />
                    School admins manage their own teams and day-to-day CRUD permissions
                  </CListGroupItem>
                </CListGroup>
              ) : (
                <>
                  {metrics?.team?.length === 0 ? (
                    <CAlert color="info" className="mb-0">
                      No team members yet. Add users from <strong>My Users</strong> — they will need super-admin
                      approval before signing in.
                    </CAlert>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {metrics.team.slice(0, 6).map((u) => {
                        const approval = approvalLabel(u.approvalStatus || APPROVAL.APPROVED)
                        return (
                          <div
                            key={u.id}
                            className="sms-control-team-row d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <strong>{u.fullName || u.email}</strong>
                              <div className="small text-muted">{u.role}</div>
                            </div>
                            <div className="d-flex gap-1 flex-wrap justify-content-end">
                              {u.approvalStatus === APPROVAL.PENDING ? (
                                <CBadge color="warning">Pending approval</CBadge>
                              ) : (
                                <CBadge color={approval.color}>{permissionsSummary(u)}</CBadge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {metrics.team.length > 6 && (
                        <CButton color="link" size="sm" onClick={() => navigate('/admin/users')}>
                          View all {metrics.team.length} members
                        </CButton>
                      )}
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={5}>
          <CCard className="sms-glass-card border-0 mb-4">
            <CCardBody>
              <h6 className="fw-bold mb-3">
                <CIcon icon={cilBell} className="me-2" />
                {isSuperAdmin ? 'Attention Required' : 'Admin Checklist'}
              </h6>
              {isSuperAdmin && metrics ? (
                <>
                  {metrics.pending.length > 0 ? (
                    metrics.pending.slice(0, 5).map((u) => (
                      <div key={u.id} className="sms-control-alert-row mb-2">
                        <strong>{u.fullName}</strong>
                        <div className="small text-muted">
                          Created by admin · {u.role}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted small mb-0">No pending approvals.</p>
                  )}
                  {metrics.expiringAdmins?.length > 0 && (
                    <>
                      <hr />
                      <p className="small fw-semibold mb-2">Admin subscriptions expiring within 14 days</p>
                      {metrics.expiringAdmins.map((u) => (
                        <div key={u.id} className="sms-control-alert-row mb-2">
                          <strong>{u.fullName}</strong>
                          <CProgress
                            thin
                            color="warning"
                            value={Math.max(0, Math.min(100, ((14 - daysUntil(u.subscriptionenddate)) / 14) * 100))}
                            className="mt-1"
                          />
                          <div className="small text-muted">{daysUntil(u.subscriptionenddate)} days left</div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <CListGroup flush>
                  <CListGroupItem className="bg-transparent border-0 px-0 d-flex gap-2">
                    {metrics?.subscriptionActive ? (
                      <CIcon icon={cilCheckCircle} className="text-success mt-1" />
                    ) : (
                      <CIcon icon={cilXCircle} className="text-danger mt-1" />
                    )}
                    <span className="small">Keep your subscription active ({formatMK(ADMIN_SUBSCRIPTION_AMOUNT)}/mo)</span>
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0 d-flex gap-2">
                    <CIcon icon={cilCheckCircle} className="text-success mt-1" />
                    <span className="small">Create team members and wait for super-admin approval</span>
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0 d-flex gap-2">
                    <CIcon icon={cilCheckCircle} className="text-success mt-1" />
                    <span className="small">Grant create, edit, or delete permissions per user as needed</span>
                  </CListGroupItem>
                  <CListGroupItem className="bg-transparent border-0 px-0 d-flex gap-2">
                    <CIcon icon={cilCheckCircle} className="text-success mt-1" />
                    <span className="small">Use School Overview for daily student and payment operations</span>
                  </CListGroupItem>
                </CListGroup>
              )}
            </CCardBody>
          </CCard>

          <CCard className="sms-glass-card border-0">
            <CCardBody>
              <h6 className="fw-bold mb-2">
                <CIcon icon={cilLibrary} className="me-2" />
                Install as App
              </h6>
              <p className="small text-muted mb-3">
                SMS Pro works as a Progressive Web App — install on desktop (Chrome/Edge) or mobile (Add to Home
                Screen) for a native app experience.
              </p>
              <PwaInstallBanner compact />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default ControlCenter
