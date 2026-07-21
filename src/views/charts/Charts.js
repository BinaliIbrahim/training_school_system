import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CButtonGroup,
  CCol,
  CFormSelect,
  CProgress,
  CRow,
  CSpinner,
} from '@coreui/react'
import { CChartBar, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChart, cilMoney, cilPeople } from '@coreui/icons'
import { collection, getDoc, doc, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../firebase'
import {
  calcTotalDueForStudent,
  calcBalanceForStudent,
  mergeCatalogItems,
  resolveCatalogOwnerId,
} from '../../utils/schoolCatalog'
import { modernChartOptions, lineChartDataset, barChartDataset, formatMK as fmtMK } from '../../utils/chartTheme'

const formatMK = fmtMK

const Charts = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [managedUsers, setManagedUsers] = useState([])
  const [catalogOwnerId, setCatalogOwnerId] = useState(null)
  const [subscriptionOk, setSubscriptionOk] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [viewMode, setViewMode] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [allStudents, setAllStudents] = useState([])
  const [allCourses, setAllCourses] = useState([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthLoading(false)
        navigate('/login')
        return
      }

      setUser(firebaseUser)
      const userRef = doc(db, 'users', firebaseUser.uid)

      try {
        const snap = await getDoc(userRef)
        if (!snap.exists()) {
          navigate('/login')
          return
        }

        const data = snap.data()
        const profile = { id: firebaseUser.uid, ...data }
        setUserProfile(profile)
        setUserRole(data.role || 'student')

        if (data.role === 'student') {
          if (!data.subscriptionenddate) {
            navigate('/subscription')
            return
          }
          const endDate = data.subscriptionenddate?.toDate
            ? data.subscriptionenddate.toDate()
            : new Date(data.subscriptionenddate)
          if (isNaN(endDate.getTime()) || endDate < new Date()) {
            navigate('/subscription')
            return
          }
          setSubscriptionOk(true)
          const catalogId = await resolveCatalogOwnerId(db, profile, data.role, firebaseUser.uid)
          setCatalogOwnerId(catalogId)
          await loadCoordinatorData(firebaseUser.uid, catalogId)
        } else if (['admin', 'super-admin'].includes(data.role)) {
          await loadManagedUsers(data.role, firebaseUser.uid, data.managedUserIds)
        }
      } catch (err) {
        console.error('Auth error:', err)
        navigate('/login')
      } finally {
        setAuthLoading(false)
      }
    })

    return () => unsub()
  }, [navigate])

  const loadManagedUsers = async (role, userId, managedUserIds = []) => {
    let userList = []

    if (role === 'super-admin') {
      const snapshot = await getDocs(collection(db, 'users'))
      userList = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), userType: 'direct' }))
    } else {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        userList = [{ id: userId, ...userDoc.data(), userType: 'self' }]
      }
      if (managedUserIds?.length) {
        const managed = await Promise.all(
          managedUserIds.map(async (id) => {
            const d = await getDoc(doc(db, 'users', id))
            return d.exists() ? { id, ...d.data(), userType: 'managed' } : null
          }),
        )
        userList.push(...managed.filter(Boolean))
      }
    }

    setManagedUsers(userList)
    setCatalogOwnerId(userId)
    setSubscriptionOk(true)
    await loadTeamData(userList, userId)
  }

  const loadCoordinatorData = async (uid, catalogId) => {
    setDataLoading(true)
    try {
      let courses = []
      let cohorts = []

      if (catalogId) {
        const [cSnap, hSnap] = await Promise.all([
          getDocs(collection(db, `users/${catalogId}/courses`)),
          getDocs(collection(db, `users/${catalogId}/cohorts`)),
        ])
        courses = cSnap.docs.map((d) => ({ id: d.id, ...d.data(), ownerId: catalogId }))
        cohorts = hSnap.docs.map((d) => ({ id: d.id, ...d.data(), ownerId: catalogId }))
      }

      if (!catalogId || catalogId !== uid) {
        const [lc, lh] = await Promise.all([
          getDocs(collection(db, `users/${uid}/courses`)),
          getDocs(collection(db, `users/${uid}/cohorts`)),
        ])
        courses.push(...lc.docs.map((d) => ({ id: d.id, ...d.data(), ownerId: uid, legacy: true })))
        cohorts.push(...lh.docs.map((d) => ({ id: d.id, ...d.data(), ownerId: uid, legacy: true })))
      }

      const sSnap = await getDocs(collection(db, `users/${uid}/students`))
      setAllStudents(
        sSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: uid,
          ownerName: 'You',
        })),
      )
      setAllCourses(mergeCatalogItems(courses, []))
    } finally {
      setDataLoading(false)
    }
  }

  const loadTeamData = async (userList, adminCatalogId) => {
    setDataLoading(true)
    try {
      let students = []
      let courses = []
      const catalogId = adminCatalogId

      if (catalogId) {
        const cSnap = await getDocs(collection(db, `users/${catalogId}/courses`))
        courses = cSnap.docs.map((d) => ({ id: d.id, ...d.data(), ownerId: catalogId }))
      }

      for (const member of userList) {
        const ownerName = member.fullName || member.email || 'Team member'
        const sSnap = await getDocs(collection(db, `users/${member.id}/students`))
        students.push(
          ...sSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            ownerId: member.id,
            ownerName,
            ownerType: member.userType,
          })),
        )

        if (member.id !== catalogId) {
          const lc = await getDocs(collection(db, `users/${member.id}/courses`))
          courses.push(
            ...lc.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              ownerId: member.id,
              ownerName,
              legacy: true,
            })),
          )
        }
      }

      setAllStudents(students)
      setAllCourses(mergeCatalogItems(courses, []))
    } finally {
      setDataLoading(false)
    }
  }

  const teamMembers = useMemo(
    () => managedUsers.filter((u) => u.userType === 'managed'),
    [managedUsers],
  )

  const scopedStudents = useMemo(() => {
    if (viewMode === 'member' && selectedUserId) {
      return allStudents.filter((s) => s.ownerId === selectedUserId)
    }
    if (userRole === 'student') return allStudents
    return allStudents
  }, [allStudents, viewMode, selectedUserId, userRole])

  const finance = useMemo(() => {
    const calcStudent = (s) => ({
      due: calcTotalDueForStudent(s, allCourses, catalogOwnerId),
      paid: s.amountPaid ?? 0,
      balance: Math.max(0, calcBalanceForStudent(s, allCourses, catalogOwnerId)),
    })

    const totals = scopedStudents.reduce(
      (acc, s) => {
        const { due, paid, balance } = calcStudent(s)
        acc.totalDue += due
        acc.collected += paid
        acc.outstanding += balance
        if (balance > 0) acc.owing += 1
        return acc
      },
      { totalDue: 0, collected: 0, outstanding: 0, owing: 0 },
    )

    totals.rate = totals.totalDue > 0 ? Math.min(100, (totals.collected / totals.totalDue) * 100) : 0

    const byMember = teamMembers.map((m) => {
      const memberStudents = allStudents.filter((s) => s.ownerId === m.id)
      let totalDue = 0
      let collected = 0
      let outstanding = 0
      let owing = 0
      memberStudents.forEach((s) => {
        const { due, paid, balance } = calcStudent(s)
        totalDue += due
        collected += paid
        outstanding += balance
        if (balance > 0) owing += 1
      })
      return {
        id: m.id,
        name: m.fullName || m.email,
        totalDue,
        collected,
        outstanding,
        owing,
        rate: totalDue > 0 ? Math.min(100, (collected / totalDue) * 100) : 0,
      }
    })

    const monthMap = {}
    scopedStudents.forEach((s) => {
      if (!s.registrationDate) return
      const date = s.registrationDate?.toDate ? s.registrationDate.toDate() : new Date(s.registrationDate)
      if (isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + (s.amountPaid ?? 0)
    })

    const sortedMonths = Object.keys(monthMap).sort().slice(-6)
    const monthLabels = sortedMonths.map((m) => {
      const [y, mo] = m.split('-')
      return new Date(`${y}-${mo}-01`).toLocaleString('default', { month: 'short', year: '2-digit' })
    })
    const monthValues = sortedMonths.map((k) => monthMap[k])

    return { totals, byMember, monthLabels, monthValues }
  }, [scopedStudents, allStudents, allCourses, catalogOwnerId, teamMembers])

  const isAdmin = ['admin', 'super-admin'].includes(userRole)

  if (authLoading || dataLoading) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CSpinner color="primary" />
          <p className="text-muted mt-2 mb-0">Loading analytics…</p>
        </CCol>
      </CRow>
    )
  }

  if (!subscriptionOk) return null

  return (
    <div className="sms-analytics-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Money analytics</h4>
          <p className="text-muted small mb-0">
            {viewMode === 'member' && selectedUserId
              ? `Financial view for ${teamMembers.find((m) => m.id === selectedUserId)?.fullName || 'team member'}`
              : isAdmin
                ? `All team · ${teamMembers.length} coordinator${teamMembers.length !== 1 ? 's' : ''}`
                : 'Your collections and balances'}
          </p>
        </div>
        {isAdmin && teamMembers.length > 0 && (
          <CButtonGroup size="sm">
            <CButton
              color={viewMode === 'all' ? 'primary' : 'secondary'}
              variant={viewMode === 'all' ? undefined : 'outline'}
              onClick={() => {
                setViewMode('all')
                setSelectedUserId('')
              }}
            >
              All team
            </CButton>
            <CButton
              color={viewMode === 'compare' ? 'primary' : 'secondary'}
              variant={viewMode === 'compare' ? undefined : 'outline'}
              onClick={() => setViewMode('compare')}
            >
              <CIcon icon={cilChart} className="me-1" />
              Compare
            </CButton>
            <CButton
              color={viewMode === 'member' ? 'primary' : 'secondary'}
              variant={viewMode === 'member' ? undefined : 'outline'}
              onClick={() => {
                setViewMode('member')
                if (!selectedUserId && teamMembers[0]) setSelectedUserId(teamMembers[0].id)
              }}
            >
              <CIcon icon={cilPeople} className="me-1" />
              By member
            </CButton>
          </CButtonGroup>
        )}
      </div>

      {viewMode === 'member' && isAdmin && (
        <CRow className="mb-3">
          <CCol md={4}>
            <CFormSelect
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName || m.email}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>
      )}

      <div className="sms-audit-stats mb-4">
        <div className="sms-audit-stat sms-audit-stat--blue">
          <span className="sms-audit-stat-val">{formatMK(finance.totals.totalDue)}</span>
          <span className="sms-audit-stat-lbl">Total billed</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--green">
          <span className="sms-audit-stat-val">{formatMK(finance.totals.collected)}</span>
          <span className="sms-audit-stat-lbl">Collected</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--red">
          <span className="sms-audit-stat-val">{formatMK(finance.totals.outstanding)}</span>
          <span className="sms-audit-stat-lbl">Outstanding</span>
        </div>
        <div className="sms-audit-stat sms-audit-stat--orange">
          <span className="sms-audit-stat-val">{finance.totals.owing}</span>
          <span className="sms-audit-stat-lbl">Students owing</span>
        </div>
      </div>

      <div className="sms-finance-flow-bar mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="small fw-semibold">Collection rate</span>
          <span className="small text-muted">{finance.totals.rate.toFixed(1)}%</span>
        </div>
        <CProgress
          color={finance.totals.rate >= 90 ? 'success' : finance.totals.rate >= 60 ? 'warning' : 'danger'}
          value={finance.totals.rate}
          className="sms-finance-collection-progress"
        />
      </div>

      <CRow className="g-4">
        <CCol lg={viewMode === 'compare' && isAdmin ? 12 : 7}>
          <div className="sms-chart-card p-3 h-100">
            <div className="mb-3">
              <strong>
                <CIcon icon={cilMoney} className="me-2" />
                Collections over time
              </strong>
              <div className="small text-muted">Registration-month payments (last 6 months)</div>
            </div>
            {finance.monthLabels.length > 0 ? (
              <div className="sms-chart-wrap">
                <CChartLine
                  data={{
                    labels: finance.monthLabels,
                    datasets: [lineChartDataset('Collected', finance.monthValues, '#10b981')],
                  }}
                  options={{
                    ...modernChartOptions,
                    plugins: {
                      ...modernChartOptions.plugins,
                      legend: { display: false },
                      tooltip: {
                        ...modernChartOptions.plugins.tooltip,
                        callbacks: { label: (ctx) => formatMK(ctx.parsed.y) },
                      },
                    },
                    scales: {
                      ...modernChartOptions.scales,
                      y: {
                        ...modernChartOptions.scales.y,
                        ticks: {
                          ...modernChartOptions.scales.y.ticks,
                          callback: (v) => formatMK(v),
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <p className="text-muted text-center py-5 mb-0">No payment history yet.</p>
            )}
          </div>
        </CCol>

        {viewMode !== 'compare' && (
          <CCol lg={5}>
            <div className="sms-chart-card p-3 h-100">
              <div className="mb-3">
                <strong>Collected vs outstanding</strong>
                <div className="small text-muted">Current financial split</div>
              </div>
              {finance.totals.collected > 0 || finance.totals.outstanding > 0 ? (
                <div className="sms-chart-wrap sms-chart-wrap--compact">
                  <CChartDoughnut
                    data={{
                      labels: ['Collected', 'Outstanding'],
                      datasets: [
                        {
                          data: [finance.totals.collected, finance.totals.outstanding],
                          backgroundColor: ['#10b981', '#ef4444'],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      ...modernChartOptions,
                      plugins: {
                        ...modernChartOptions.plugins,
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: { label: (ctx) => `${ctx.label}: ${formatMK(ctx.parsed)}` },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-muted text-center py-5 mb-0">No financial data yet.</p>
              )}
            </div>
          </CCol>
        )}

        {viewMode === 'compare' && isAdmin && finance.byMember.length > 0 && (
          <CCol lg={12}>
            <div className="sms-chart-card p-3">
              <div className="mb-3">
                <strong>Compare team members</strong>
                <div className="small text-muted">Collected (green) vs outstanding (red) by coordinator</div>
              </div>
              <div className="sms-chart-wrap">
                <CChartBar
                  data={{
                    labels: finance.byMember.map((m) => m.name?.split(' ')[0] || m.name),
                    datasets: [
                      barChartDataset('Collected', finance.byMember.map((m) => m.collected), '#10b981'),
                      barChartDataset('Outstanding', finance.byMember.map((m) => m.outstanding), '#ef4444'),
                    ],
                  }}
                  options={{
                    ...modernChartOptions,
                    plugins: {
                      ...modernChartOptions.plugins,
                      tooltip: {
                        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMK(ctx.parsed.y)}` },
                      },
                    },
                    scales: {
                      ...modernChartOptions.scales,
                      y: {
                        ...modernChartOptions.scales.y,
                        ticks: {
                          ...modernChartOptions.scales.y.ticks,
                          callback: (v) => formatMK(v),
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </CCol>
        )}
      </CRow>
    </div>
  )
}

export default Charts
