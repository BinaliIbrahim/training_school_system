import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
  CSpinner,
  CAlert,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilList,
  cilSearch,
  cilPeople,
  cilClock,
  cilPhone,
  cilArrowLeft,
  cilReload,
  cilUser,
} from '@coreui/icons'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { auth, db } from '../../firebase'
import {
  formatLogTimestamp,
  formatLastSeen,
  isUserActive,
  roleBadgeColor,
  toPresenceDate,
} from '../../utils/loginLogs'
import { matchesSearchQuery } from '../../utils/search'

const LOG_LIMIT = 250
const REFRESH_MS = 60_000

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const toDate = (value) => toPresenceDate(value)

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const initials = (name, email) => {
  const src = (name || email || '?').trim()
  const parts = src.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

const PresenceDot = ({ active, size = 'md' }) => (
  <span className={`sms-presence-dot sms-presence-dot--${size} ${active ? 'is-online' : 'is-offline'}`} />
)

const LoginLogs = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tick, setTick] = useState(0)

  const isSuperAdmin = profile?.role === 'super-admin'
  const isAdmin = profile?.role === 'admin'

  const loadTeamMembers = useCallback(async (userProfile) => {
    if (userProfile.role === 'super-admin') {
      setTeamMembers([])
      return
    }

    const ids = [userProfile.id, ...(userProfile.managedUserIds || [])]
    const uniqueIds = [...new Set(ids)]

    const members = await Promise.all(
      uniqueIds.map(async (id) => {
        const snap = await getDoc(doc(db, 'users', id))
        if (!snap.exists()) return null
        const data = snap.data()
        return {
          id,
          fullName: data.fullName || '',
          email: data.email || '',
          role: data.role || 'student',
          lastLogin: data.lastLogin || null,
          lastActiveAt: data.lastActiveAt || data.lastLogin || null,
          isSelf: id === userProfile.id,
        }
      }),
    )

    setTeamMembers(
      members
        .filter(Boolean)
        .sort((a, b) => {
          if (a.isSelf) return -1
          if (b.isSelf) return 1
          return (a.fullName || a.email).localeCompare(b.fullName || b.email)
        }),
    )
  }, [])

  const loadLogs = useCallback(async (userProfile) => {
    setLoading(true)
    setError('')
    try {
      const logMap = new Map()

      if (userProfile.role === 'super-admin') {
        let snap
        try {
          snap = await getDocs(
            query(collection(db, 'loginLogs'), orderBy('timestamp', 'desc'), limit(LOG_LIMIT)),
          )
        } catch {
          snap = await getDocs(query(collection(db, 'loginLogs'), limit(500)))
        }
        snap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))
      } else {
        const teamIds = [...new Set([userProfile.id, ...(userProfile.managedUserIds || [])])]

        const scopeSnap = await getDocs(
          query(collection(db, 'loginLogs'), where('scopeAdminId', '==', userProfile.id), limit(500)),
        )
        scopeSnap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))

        for (const batch of chunk(teamIds, 10)) {
          const userSnap = await getDocs(
            query(collection(db, 'loginLogs'), where('userId', 'in', batch), limit(300)),
          )
          userSnap.docs.forEach((d) => logMap.set(d.id, { id: d.id, ...d.data() }))
        }
      }

      let items = [...logMap.values()].map((item) => ({
        ...item,
        timestampDate: toDate(item.timestamp),
      }))

      items.sort((a, b) => (b.timestampDate?.getTime() || 0) - (a.timestampDate?.getTime() || 0))
      if (userProfile.role !== 'super-admin') {
        items = items.slice(0, LOG_LIMIT)
      }

      setLogs(items)
    } catch (err) {
      setError('Failed to load login logs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAll = useCallback(
    async (userProfile) => {
      if (!userProfile) return
      await Promise.all([loadTeamMembers(userProfile), loadLogs(userProfile)])
    },
    [loadLogs, loadTeamMembers],
  )

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
        return
      }

      const snap = await getDoc(doc(db, 'users', user.uid))
      if (!snap.exists()) {
        navigate('/login')
        return
      }

      const data = snap.data()
      if (!['admin', 'super-admin'].includes(data.role)) {
        navigate('/dashboard')
        return
      }

      const userProfile = { id: user.uid, ...data }
      setProfile(userProfile)
      await refreshAll(userProfile)
    })

    return unsub
  }, [navigate, refreshAll])

  useEffect(() => {
    if (!profile) return undefined
    const id = setInterval(() => {
      setTick((t) => t + 1)
      loadTeamMembers(profile)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [profile, loadTeamMembers])

  const presenceByUserId = useMemo(() => {
    const map = {}
    teamMembers.forEach((m) => {
      map[m.id] = {
        active: isUserActive(m.lastActiveAt),
        lastSeen: formatLastSeen(m.lastActiveAt, m.lastLogin),
      }
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMembers, tick])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== 'all' && log.role !== roleFilter) return false

      const active = presenceByUserId[log.userId]?.active
      if (statusFilter === 'active' && !active) return false
      if (statusFilter === 'offline' && active) return false

      return matchesSearchQuery(
        search,
        log.fullName,
        log.email,
        log.role,
        log.device?.browser,
        log.device?.platform,
        log.device?.isMobile ? 'mobile' : 'desktop',
      )
    })
  }, [logs, search, roleFilter, statusFilter, presenceByUserId])

  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const today = logs.filter((l) => l.timestampDate && isSameDay(l.timestampDate, now)).length
    const thisWeek = logs.filter((l) => l.timestampDate && l.timestampDate >= weekAgo)
    const uniqueUsers = new Set(thisWeek.map((l) => l.userId)).size
    const activeNow = teamMembers.filter((m) => isUserActive(m.lastActiveAt)).length
    return { today, weekTotal: thisWeek.length, uniqueUsers, activeNow }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, teamMembers, tick])

  const roleOptions = useMemo(() => {
    const roles = [...new Set(logs.map((l) => l.role).filter(Boolean))]
    return roles.sort()
  }, [logs])

  if (!profile && loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="text-muted mt-3">Loading login logs…</p>
      </div>
    )
  }

  return (
    <div className="sms-login-logs">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <CButton color="link" className="p-0 mb-2 text-decoration-none" onClick={() => navigate('/admin/control')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Home
          </CButton>
          <h2 className="fw-bold mb-1">
            <CIcon icon={cilList} className="me-2 text-primary" />
            Login Activity
          </h2>
          <p className="text-muted mb-0">
            {isSuperAdmin
              ? 'Track sign-ins across the entire SMS Pro platform.'
              : 'Live team status and sign-in history for you and your coordinators.'}
          </p>
        </div>
        <CButton color="primary" variant="outline" onClick={() => refreshAll(profile)} disabled={loading}>
          <CIcon icon={cilReload} className="me-1" />
          Refresh
        </CButton>
      </div>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      <CRow className="g-3 mb-4">
        <CCol sm={6} lg={3}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className={`sms-stat-icon ${stats.activeNow > 0 ? 'bg-success' : 'bg-secondary'}`}>
                <PresenceDot active={stats.activeNow > 0} size="lg" />
              </div>
              <div>
                <div className="sms-stat-value">{stats.activeNow}</div>
                <div className="sms-stat-label">Active now</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className="sms-stat-icon bg-primary">
                <CIcon icon={cilClock} size="lg" />
              </div>
              <div>
                <div className="sms-stat-value">{stats.today}</div>
                <div className="sms-stat-label">Logins today</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className="sms-stat-icon bg-info">
                <CIcon icon={cilList} size="lg" />
              </div>
              <div>
                <div className="sms-stat-value">{stats.weekTotal}</div>
                <div className="sms-stat-label">Last 7 days</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={3}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className="sms-stat-icon bg-warning">
                <CIcon icon={cilPeople} size="lg" />
              </div>
              <div>
                <div className="sms-stat-value">{stats.uniqueUsers}</div>
                <div className="sms-stat-label">Unique users (7d)</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {isAdmin && teamMembers.length > 0 && (
        <CCard className="sms-glass-card border-0 mb-4">
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0">Your team</h6>
                <small className="text-muted">Green = active in the last 5 minutes</small>
              </div>
              <CBadge color={stats.activeNow > 0 ? 'success' : 'secondary'} className="sms-presence-live-badge">
                <PresenceDot active={stats.activeNow > 0} size="sm" /> {stats.activeNow} online
              </CBadge>
            </div>
            <div className="sms-team-presence-grid">
              {teamMembers.map((member) => {
                const presence = presenceByUserId[member.id]
                const active = presence?.active
                return (
                  <div
                    key={member.id}
                    className={`sms-presence-card ${active ? 'is-active' : ''}`}
                  >
                    <div className="sms-presence-avatar">
                      <span className="sms-presence-avatar-text">{initials(member.fullName, member.email)}</span>
                      <PresenceDot active={active} />
                    </div>
                    <div className="sms-presence-info">
                      <strong>{member.fullName || member.email}</strong>
                      <div className="small text-muted">{member.email}</div>
                      <div className={`small ${active ? 'text-success fw-semibold' : 'text-muted'}`}>
                        {presence?.lastSeen}
                      </div>
                    </div>
                    <CBadge color={roleBadgeColor(member.role)}>
                      {member.isSelf ? 'You' : member.role}
                    </CBadge>
                  </div>
                )
              })}
            </div>
          </CCardBody>
        </CCard>
      )}

      <CCard className="sms-glass-card border-0 mb-4">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol md={5}>
              <label className="form-label small fw-semibold">Search</label>
              <div className="sms-search">
                <CIcon icon={cilSearch} className="sms-search-icon" />
                <CFormInput
                  className="sms-search-input"
                  placeholder="Name, email, browser… (any word order)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CCol>
            <CCol md={2}>
              <label className="form-label small fw-semibold">Role</label>
              <CFormSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <label className="form-label small fw-semibold">Status</label>
              <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active now</option>
                <option value="offline">Offline</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <div className="small text-muted">
                Showing {filteredLogs.length} of {logs.length} entries
                {isAdmin && ' · your team'}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="sms-glass-card border-0">
        <CCardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <CAlert color="info" className="m-3 mb-0">
              {logs.length === 0
                ? 'No login activity recorded yet. Logs appear when users sign in after this feature is enabled.'
                : 'No entries match your filters.'}
            </CAlert>
          ) : (
            <>
              <div className="table-responsive d-none d-md-block">
                <CTable hover responsive className="mb-0 sms-login-logs-table">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>User</CTableHeaderCell>
                      <CTableHeaderCell>Role</CTableHeaderCell>
                      <CTableHeaderCell>Device</CTableHeaderCell>
                      <CTableHeaderCell>Signed in</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {filteredLogs.map((log) => {
                      const active = presenceByUserId[log.userId]?.active
                      return (
                        <CTableRow key={log.id}>
                          <CTableDataCell>
                            <div className={`sms-log-status ${active ? 'is-online' : ''}`}>
                              <PresenceDot active={active} />
                              <span className="small">{active ? 'Active' : 'Offline'}</span>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-center gap-2">
                              <div className="sms-log-user-avatar">
                                <CIcon icon={cilUser} />
                              </div>
                              <div>
                                <strong>{log.fullName || '—'}</strong>
                                <div className="small text-muted">{log.email}</div>
                              </div>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={roleBadgeColor(log.role)}>{log.role}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-center gap-2">
                              <CIcon icon={cilPhone} className="text-muted" />
                              <div>
                                <div className="small">
                                  {log.device?.browser || '—'} · {log.device?.platform || '—'}
                                </div>
                                <div className="small text-muted">
                                  {log.device?.isMobile ? 'Mobile' : 'Desktop'}
                                  {log.device?.screen ? ` · ${log.device.screen}` : ''}
                                </div>
                              </div>
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="text-nowrap">{formatLogTimestamp(log.timestamp)}</span>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>

              <div className="d-md-none p-3 d-flex flex-column gap-2">
                {filteredLogs.map((log) => {
                  const active = presenceByUserId[log.userId]?.active
                  return (
                    <div key={log.id} className="sms-login-log-card">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <PresenceDot active={active} />
                          <div>
                            <strong>{log.fullName || log.email}</strong>
                            <div className="small text-muted">{log.email}</div>
                          </div>
                        </div>
                        <CBadge color={roleBadgeColor(log.role)}>{log.role}</CBadge>
                      </div>
                      <div className="small text-muted mb-1">
                        {log.device?.browser} · {log.device?.platform} ·{' '}
                        {log.device?.isMobile ? 'Mobile' : 'Desktop'}
                      </div>
                      <div className="small fw-semibold">{formatLogTimestamp(log.timestamp)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      <p className="small text-muted mt-3 mb-0">
        {isSuperAdmin
          ? `Platform-wide audit trail · last ${LOG_LIMIT} sign-ins · new entries recorded on each successful login.`
          : `Team audit trail · includes your sign-ins and all coordinators you manage · active = seen in last 5 minutes.`}
      </p>
    </div>
  )
}

export default LoginLogs
