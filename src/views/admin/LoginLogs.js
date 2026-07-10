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
import { formatLogTimestamp, roleBadgeColor } from '../../utils/loginLogs'

const LOG_LIMIT = 250

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const toDate = (value) => {
  if (!value) return null
  if (value.toDate) return value.toDate()
  if (value.seconds != null) return new Date(value.seconds * 1000)
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const LoginLogs = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const isSuperAdmin = profile?.role === 'super-admin'
  const isAdmin = profile?.role === 'admin'

  const loadLogs = useCallback(async (userProfile) => {
    setLoading(true)
    setError('')
    try {
      let snap

      if (userProfile.role === 'super-admin') {
        try {
          snap = await getDocs(
            query(collection(db, 'loginLogs'), orderBy('timestamp', 'desc'), limit(LOG_LIMIT)),
          )
        } catch (indexErr) {
          // Fallback: no index — load and sort client-side
          snap = await getDocs(query(collection(db, 'loginLogs'), limit(500)))
        }
      } else {
        // Admin: equality filter only (no composite index required)
        snap = await getDocs(
          query(collection(db, 'loginLogs'), where('scopeAdminId', '==', userProfile.id), limit(500)),
        )
      }

      let items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        timestampDate: toDate(d.data().timestamp),
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
      await loadLogs(userProfile)
    })

    return unsub
  }, [navigate, loadLogs])

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (roleFilter !== 'all' && log.role !== roleFilter) return false
      if (!q) return true
      return (
        log.fullName?.toLowerCase().includes(q) ||
        log.email?.toLowerCase().includes(q) ||
        log.role?.toLowerCase().includes(q) ||
        log.device?.browser?.toLowerCase().includes(q) ||
        log.device?.platform?.toLowerCase().includes(q)
      )
    })
  }, [logs, search, roleFilter])

  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const today = logs.filter((l) => l.timestampDate && isSameDay(l.timestampDate, now)).length
    const thisWeek = logs.filter((l) => l.timestampDate && l.timestampDate >= weekAgo)
    const uniqueUsers = new Set(thisWeek.map((l) => l.userId)).size
    return { today, weekTotal: thisWeek.length, uniqueUsers }
  }, [logs])

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
            Back to Control Center
          </CButton>
          <h2 className="fw-bold mb-1">
            <CIcon icon={cilList} className="me-2 text-primary" />
            Login Activity
          </h2>
          <p className="text-muted mb-0">
            {isSuperAdmin
              ? 'Track sign-ins across the entire SMS Pro platform.'
              : 'Sign-in history for your team members and your own account.'}
          </p>
        </div>
        <CButton color="primary" variant="outline" onClick={() => loadLogs(profile)} disabled={loading}>
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
        <CCol sm={4}>
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
        <CCol sm={4}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className="sms-stat-icon bg-success">
                <CIcon icon={cilList} size="lg" />
              </div>
              <div>
                <div className="sms-stat-value">{stats.weekTotal}</div>
                <div className="sms-stat-label">Last 7 days</div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={4}>
          <CCard className="sms-stat-card border-0 h-100">
            <CCardBody className="d-flex align-items-center gap-3">
              <div className="sms-stat-icon bg-info">
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

      <CCard className="sms-glass-card border-0 mb-4">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol md={6}>
              <label className="form-label small fw-semibold">Search</label>
              <div className="sms-search">
                <CIcon icon={cilSearch} className="sms-search-icon" />
                <CFormInput
                  className="sms-search-input"
                  placeholder="Name, email, browser, platform…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CCol>
            <CCol md={3}>
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
            <CCol md={3}>
              <div className="small text-muted">
                Showing {filteredLogs.length} of {logs.length} recent entries
                {isAdmin && ' · your team only'}
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
                      <CTableHeaderCell>User</CTableHeaderCell>
                      <CTableHeaderCell>Role</CTableHeaderCell>
                      <CTableHeaderCell>Device</CTableHeaderCell>
                      <CTableHeaderCell>Signed in</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {filteredLogs.map((log) => (
                      <CTableRow key={log.id}>
                        <CTableDataCell>
                          <strong>{log.fullName || '—'}</strong>
                          <div className="small text-muted">{log.email}</div>
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
                    ))}
                  </CTableBody>
                </CTable>
              </div>

              <div className="d-md-none p-3 d-flex flex-column gap-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="sms-login-log-card">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                      <div>
                        <strong>{log.fullName || log.email}</strong>
                        <div className="small text-muted">{log.email}</div>
                      </div>
                      <CBadge color={roleBadgeColor(log.role)}>{log.role}</CBadge>
                    </div>
                    <div className="small text-muted mb-1">
                      {log.device?.browser} · {log.device?.platform} ·{' '}
                      {log.device?.isMobile ? 'Mobile' : 'Desktop'}
                    </div>
                    <div className="small fw-semibold">{formatLogTimestamp(log.timestamp)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      <p className="small text-muted mt-3 mb-0">
        {isSuperAdmin
          ? `Platform-wide audit trail · last ${LOG_LIMIT} sign-ins · new entries recorded on each successful login.`
          : `Team audit trail · last ${LOG_LIMIT} sign-ins for users you manage · includes your own admin sign-ins.`}
      </p>
    </div>
  )
}

export default LoginLogs
