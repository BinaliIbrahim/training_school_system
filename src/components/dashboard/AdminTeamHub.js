import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilArrowRight,
  cilCalendar,
  cilMoney,
  cilPeople,
  cilUser,
  cilWarning,
} from '@coreui/icons'
import { collection, getDocs, query } from 'firebase/firestore'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import { db } from '../../firebase'
import AdminFinanceSummary from './AdminFinanceSummary'
import OtherCohortsCard from './OtherCohortsCard'
import {
  calcTotalDueForStudent,
  calcBalanceForStudent,
  studentMatchesCohort,
  findCourseForStudent,
  mergeCatalogItems,
} from '../../utils/schoolCatalog'
import { partitionCohortsForDisplay } from '../../utils/cohortDisplay'
import { APPROVAL, approvalLabel, permissionsSummary } from '../../utils/permissions'

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount || 0)

const getCohortStatus = (cohort) => {
  if (!cohort?.startDate || !cohort?.endDate) return { text: 'Unknown', color: 'secondary' }
  const now = new Date()
  const start = parseISO(cohort.startDate)
  const end = parseISO(cohort.endDate)
  if (isBefore(now, start)) return { text: 'Upcoming', color: 'warning' }
  if (isAfter(now, end)) return { text: 'Completed', color: 'secondary' }
  return { text: 'Active', color: 'success' }
}

const getCohortProgress = (cohort) => {
  if (!cohort?.startDate || !cohort?.endDate) return 0
  const now = new Date()
  const start = parseISO(cohort.startDate)
  const end = parseISO(cohort.endDate)
  if (now < start) return 0
  if (now > end) return 100
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
}

const buildPaymentsWithInitial = (students, payments) => {
  const combined = [...payments]
  students.forEach((student) => {
    if ((student.amountPaid ?? 0) > 0) {
      combined.push({
        id: `initial-${student.ownerId}-${student.id}`,
        amount: student.amountPaid,
        paymentMethod: student.modeOfPayment || 'initial',
        referenceNumber: student.transId || 'INITIAL',
        notes: 'Initial payment at registration',
        studentId: student.id,
        studentName: student.name,
        ownerId: student.ownerId,
        isInitialPayment: true,
      })
    }
  })
  return combined
}

const AdminTeamHub = ({ teamUsers = [], catalogOwnerId = null }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedCohort, setSelectedCohort] = useState(null)
  const [showOtherCohorts, setShowOtherCohorts] = useState(false)

  useEffect(() => {
    setShowOtherCohorts(false)
  }, [selectedUser?.id])

  const loadTeamData = useCallback(async () => {
    if (!teamUsers.length) {
      setStudents([])
      setCourses([])
      setCohorts([])
      setPayments([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let allStudents = []
      let allCourses = []
      let allCohorts = []
      let allPayments = []

      if (catalogOwnerId) {
        const [coursesSnap, cohortsSnap] = await Promise.all([
          getDocs(query(collection(db, `users/${catalogOwnerId}/courses`))),
          getDocs(query(collection(db, `users/${catalogOwnerId}/cohorts`))),
        ])
        allCourses = coursesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: catalogOwnerId,
        }))
        allCohorts = cohortsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          ownerId: catalogOwnerId,
        }))
      }

      for (const user of teamUsers) {
        const ownerName = user.fullName || user.email || 'Team member'
        const attachOwner = (docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          ownerId: user.id,
          ownerName,
        })

        const [studentsSnap, paymentsSnap, legacyCoursesSnap, legacyCohortsSnap] = await Promise.all([
          getDocs(query(collection(db, `users/${user.id}/students`))),
          getDocs(query(collection(db, `users/${user.id}/payments`))),
          getDocs(query(collection(db, `users/${user.id}/courses`))),
          getDocs(query(collection(db, `users/${user.id}/cohorts`))),
        ])

        allStudents.push(...studentsSnap.docs.map(attachOwner))
        allPayments.push(...paymentsSnap.docs.map(attachOwner))
        allCourses.push(
          ...legacyCoursesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            ownerId: user.id,
            ownerName,
            legacy: true,
          })),
        )
        allCohorts.push(
          ...legacyCohortsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            ownerId: user.id,
            ownerName,
            legacy: true,
          })),
        )
      }

      setStudents(allStudents)
      setCourses(mergeCatalogItems(allCourses, []))
      setCohorts(mergeCatalogItems(allCohorts, []))
      setPayments(allPayments)
    } catch (err) {
      console.error('Failed to load team data:', err)
    } finally {
      setLoading(false)
    }
  }, [teamUsers, catalogOwnerId])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  const userStats = useMemo(() => {
    return teamUsers.map((user) => {
      const userStudents = students.filter((s) => s.ownerId === user.id)
      const cohortKeys = new Set()
      cohorts.forEach((c) => {
        if (c.ownerId === catalogOwnerId || c.ownerId === user.id) {
          cohortKeys.add(`${c.ownerId}:${c.id}`)
        }
      })
      let totalCollected = 0
      let totalBalance = 0
      let pendingStudents = 0

      userStudents.forEach((s) => {
        const paid = s.amountPaid ?? 0
        const balance = calcBalanceForStudent(s, courses, catalogOwnerId)
        totalCollected += paid
        totalBalance += balance
        if (balance > 0) pendingStudents += 1
      })

      return {
        ...user,
        studentCount: userStudents.length,
        cohortCount: cohortKeys.size,
        totalCollected,
        totalBalance,
        pendingStudents,
      }
    })
  }, [teamUsers, students, cohorts, courses, catalogOwnerId])

  const teamFinance = useMemo(() => {
    return teamUsers.map((user) => {
      const userStudents = students.filter((s) => s.ownerId === user.id)
      let totalDue = 0
      let totalCollected = 0
      let totalBalance = 0
      let pendingStudents = 0

      userStudents.forEach((s) => {
        const due = calcTotalDueForStudent(s, courses, catalogOwnerId)
        const paid = s.amountPaid ?? 0
        const balance = calcBalanceForStudent(s, courses, catalogOwnerId)
        totalDue += due
        totalCollected += paid
        totalBalance += Math.max(0, balance)
        if (balance > 0) pendingStudents += 1
      })

      return {
        userId: user.id,
        name: user.fullName || user.email,
        email: user.email,
        studentCount: userStudents.length,
        totalDue,
        totalCollected,
        totalBalance,
        pendingStudents,
        paymentCount: payments.filter((p) => p.ownerId === user.id).length,
      }
    })
  }, [teamUsers, students, courses, payments, catalogOwnerId])

  const userCohorts = useMemo(() => {
    if (!selectedUser) return []
    return cohorts
      .filter(
        (c) =>
          c.ownerId === catalogOwnerId ||
          c.ownerId === selectedUser.id ||
          !catalogOwnerId,
      )
      .map((cohort) => {
        const cohortStudents = students.filter(
          (s) => s.ownerId === selectedUser.id && studentMatchesCohort(s, cohort, catalogOwnerId),
        )
        let totalBalance = 0
        let pendingStudents = 0
        cohortStudents.forEach((s) => {
          const balance = calcBalanceForStudent(s, courses, catalogOwnerId)
          totalBalance += balance
          if (balance > 0) pendingStudents += 1
        })
        return {
          ...cohort,
          studentCount: cohortStudents.length,
          totalBalance,
          pendingStudents,
        }
      })
      .sort((a, b) => (b.startDate ? parseISO(b.startDate).getTime() : 0) - (a.startDate ? parseISO(a.startDate).getTime() : 0))
  }, [selectedUser, cohorts, students, courses, catalogOwnerId])

  const { primary: primaryCohorts, other: otherCohorts } = useMemo(
    () => partitionCohortsForDisplay(userCohorts, getCohortStatus),
    [userCohorts],
  )

  const visibleCohorts = showOtherCohorts ? otherCohorts : primaryCohorts

  const renderTeamCohortCard = (cohort) => {
    const status = getCohortStatus(cohort)
    const progress = getCohortProgress(cohort)
    return (
      <CCol xs={12} md={6} xl={4} key={`${cohort.ownerId}-${cohort.id}`}>
        <div
          className={`sms-cohort-card sms-cohort-card--${status.color} ${cohort.totalBalance > 0 ? 'sms-cohort-card--balance' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setSelectedCohort(cohort)}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedCohort(cohort)}
        >
          <div className="sms-cohort-card-top">
            <div>
              <div className="sms-cohort-name">{cohort.name}</div>
              <div className="sms-cohort-desc">{cohort.description || 'No description'}</div>
            </div>
            <CBadge color={status.color}>{status.text}</CBadge>
          </div>

          {cohort.startDate && (
            <div className="sms-cohort-dates">
              <CIcon icon={cilCalendar} className="me-1" />
              {format(parseISO(cohort.startDate), 'dd MMM yyyy')} →{' '}
              {format(parseISO(cohort.endDate), 'dd MMM yyyy')}
            </div>
          )}

          <CProgress className="sms-cohort-progress mt-2 mb-3" color={status.color} value={progress} />

          <div className="sms-cohort-metrics">
            <div>
              <span className="sms-cohort-metric-val">{cohort.studentCount}</span>
              <span className="sms-cohort-metric-lbl">Students</span>
            </div>
            <div>
              <span className={`sms-cohort-metric-val ${cohort.pendingStudents > 0 ? 'text-warning' : 'text-success'}`}>
                {cohort.pendingStudents}
              </span>
              <span className="sms-cohort-metric-lbl">Owing</span>
            </div>
            <div>
              <span className={`sms-cohort-metric-val ${cohort.totalBalance > 0 ? 'text-danger' : 'text-success'}`}>
                {formatMK(cohort.totalBalance)}
              </span>
              <span className="sms-cohort-metric-lbl">Balance</span>
            </div>
          </div>

          <CButton
            color="primary"
            className="w-100 mt-3 sms-btn-glow"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedCohort(cohort)
            }}
          >
            View details
            <CIcon icon={cilArrowRight} className="ms-1" />
          </CButton>
        </div>
      </CCol>
    )
  }

  const cohortDetail = useMemo(() => {
    if (!selectedCohort) return null
    const cohortStudents = students.filter(
      (s) =>
        (!selectedUser || s.ownerId === selectedUser.id) &&
        studentMatchesCohort(s, selectedCohort, catalogOwnerId),
    )
    const allPayments = buildPaymentsWithInitial(students, payments)
    const cohortPayments = allPayments
      .filter((p) => cohortStudents.some((s) => s.id === p.studentId && s.ownerId === p.ownerId))
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))

    let totalDue = 0
    let totalCollected = 0
    const studentsWithBalance = cohortStudents
      .map((s) => {
        const balance = calcBalanceForStudent(s, courses, catalogOwnerId)
        const due = calcTotalDueForStudent(s, courses, catalogOwnerId)
        totalDue += due
        totalCollected += s.amountPaid ?? 0
        const course = findCourseForStudent(s, courses, catalogOwnerId)
        return { ...s, balance, due, courseName: course?.name || 'No course' }
      })
      .sort((a, b) => b.balance - a.balance)

    const pendingStudents = studentsWithBalance.filter((s) => s.balance > 0)

    return {
      totalDue,
      totalCollected,
      totalBalance: totalDue - totalCollected,
      studentsWithBalance,
      pendingStudents,
      cohortPayments,
    }
  }, [selectedCohort, selectedUser, students, courses, payments, catalogOwnerId])

  const resetToUsers = () => {
    setSelectedUser(null)
    setSelectedCohort(null)
    setShowOtherCohorts(false)
  }

  const backToCohorts = () => {
    setSelectedCohort(null)
    setShowOtherCohorts(false)
  }

  const handleHubBack = () => {
    if (selectedCohort) backToCohorts()
    else if (showOtherCohorts) setShowOtherCohorts(false)
    else resetToUsers()
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="text-muted mt-2 mb-0">Loading your team data…</p>
      </div>
    )
  }

  if (!teamUsers.length) {
    return (
      <CAlert color="info" className="mb-0">
        <strong>No team members assigned yet.</strong> Add coordinators from{' '}
        <CButton color="link" className="p-0 align-baseline" onClick={() => navigate('/admin/users')}>
          My Users
        </CButton>{' '}
        — their cohorts and payment activity will appear here.
      </CAlert>
    )
  }

  return (
    <div className="sms-team-hub mb-4">
      <AdminFinanceSummary teamFinance={teamFinance} />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h5 className="fw-bold mb-1">
            {selectedCohort
              ? selectedCohort.name
              : showOtherCohorts && selectedUser
                ? 'Other cohorts'
                : selectedUser
                  ? `${selectedUser.fullName || selectedUser.email}'s cohorts`
                  : 'Your team'}
          </h5>
          <p className="text-muted small mb-0">
            {selectedCohort
              ? 'Payments, balances, and student status for this cohort.'
              : showOtherCohorts && selectedUser
                ? 'Past and upcoming intakes outside the current active period.'
                : selectedUser
                  ? 'Active and latest intakes shown first — open Other cohorts for the rest.'
                  : 'Assigned users — click a card to drill into cohorts and payments.'}
          </p>
        </div>
        <div className="d-flex gap-2">
          {selectedUser && (
            <CButton color="secondary" variant="outline" size="sm" onClick={handleHubBack}>
              <CIcon icon={cilArrowLeft} className="me-1" />
              {selectedCohort ? 'Back to cohorts' : showOtherCohorts ? 'Back to main cohorts' : 'Back to team'}
            </CButton>
          )}
          <CButton color="primary" variant="outline" size="sm" onClick={() => navigate('/admin/overview')}>
            Open full workspace
          </CButton>
        </div>
      </div>

      {!selectedUser && (
        <CRow className="g-3">
          {userStats.map((user) => {
            const approval = approvalLabel(user.approvalStatus || APPROVAL.APPROVED)
            return (
              <CCol xs={12} md={6} xl={4} key={user.id}>
                <div
                  className={`sms-user-card ${user.totalBalance > 0 ? 'sms-user-card--alert' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedUser(user)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedUser(user)}
                >
                  <div className="sms-user-card-head">
                    <div className="sms-user-avatar">
                      <CIcon icon={cilUser} size="lg" />
                    </div>
                    <div className="flex-grow-1">
                      <div className="sms-user-name">{user.fullName || user.email}</div>
                      <div className="sms-user-meta">{user.role} · {user.email}</div>
                    </div>
                    {user.approvalStatus === APPROVAL.PENDING ? (
                      <CBadge color="warning">Pending</CBadge>
                    ) : (
                      <CBadge color={approval.color}>{permissionsSummary(user)}</CBadge>
                    )}
                  </div>

                  <div className="sms-user-metrics">
                    <div>
                      <span className="val">{user.cohortCount}</span>
                      <span className="lbl">Cohorts</span>
                    </div>
                    <div>
                      <span className="val">{user.studentCount}</span>
                      <span className="lbl">Students</span>
                    </div>
                    <div>
                      <span className={`val ${user.pendingStudents > 0 ? 'text-warning' : 'text-success'}`}>
                        {user.pendingStudents}
                      </span>
                      <span className="lbl">With balance</span>
                    </div>
                  </div>

                  <div className="sms-user-finance">
                    <div>
                      <span className="lbl">Collected</span>
                      <span className="val text-success">{formatMK(user.totalCollected)}</span>
                    </div>
                    <div>
                      <span className="lbl">Outstanding</span>
                      <span className={`val ${user.totalBalance > 0 ? 'text-danger fw-bold' : 'text-success'}`}>
                        {formatMK(user.totalBalance)}
                      </span>
                    </div>
                  </div>

                  {user.totalBalance > 0 && (
                    <div className="sms-user-alert">
                      <CIcon icon={cilWarning} className="me-1" />
                      {user.pendingStudents} student{user.pendingStudents !== 1 ? 's' : ''} still owe fees
                    </div>
                  )}

                  <CButton
                    color="primary"
                    className="w-100 mt-3 sms-btn-glow"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedUser(user)
                    }}
                  >
                    View cohorts
                    <CIcon icon={cilArrowRight} className="ms-1" />
                  </CButton>
                </div>
              </CCol>
            )
          })}
        </CRow>
      )}

      {selectedUser && !selectedCohort && (
        <>
          {userCohorts.length === 0 ? (
            <CAlert color="info">No cohorts yet for this team member.</CAlert>
          ) : visibleCohorts.length === 0 && !showOtherCohorts ? (
            <CAlert color="info">No active or latest cohorts. Check Other cohorts for past intakes.</CAlert>
          ) : (
            <CRow className="g-3">
              {visibleCohorts.map(renderTeamCohortCard)}
              {!showOtherCohorts && otherCohorts.length > 0 && (
                <CCol xs={12} md={6} xl={4}>
                  <OtherCohortsCard count={otherCohorts.length} onClick={() => setShowOtherCohorts(true)} />
                </CCol>
              )}
            </CRow>
          )}
        </>
      )}

      {selectedCohort && cohortDetail && (
        <>
          <CRow className="g-3 mb-4">
            <CCol md={4}>
              <div className="sms-finance-pill sms-finance-pill--orange sms-finance-pill--block">
                <span className="sms-finance-lbl">Total Due</span>
                <span className="sms-finance-val">{formatMK(cohortDetail.totalDue)}</span>
              </div>
            </CCol>
            <CCol md={4}>
              <div className="sms-finance-pill sms-finance-pill--green sms-finance-pill--block">
                <span className="sms-finance-lbl">Collected</span>
                <span className="sms-finance-val">{formatMK(cohortDetail.totalCollected)}</span>
              </div>
            </CCol>
            <CCol md={4}>
              <div
                className={`sms-finance-pill sms-finance-pill--${cohortDetail.totalBalance > 0 ? 'red' : 'green'} sms-finance-pill--block`}
              >
                <span className="sms-finance-lbl">Outstanding</span>
                <span className="sms-finance-val">{formatMK(cohortDetail.totalBalance)}</span>
              </div>
            </CCol>
          </CRow>

          <div className="sms-info-panel mb-4">
            <h6 className="sms-info-panel-title">
              <CIcon icon={cilWarning} className="me-2 text-warning" />
              Students with balance ({cohortDetail.pendingStudents.length})
            </h6>
            {cohortDetail.pendingStudents.length === 0 ? (
              <CAlert color="success" className="mb-0">All students in this cohort are fully paid.</CAlert>
            ) : (
              <CRow className="g-3">
                {cohortDetail.pendingStudents.map((s) => (
                  <CCol md={6} xl={4} key={`${s.ownerId}-${s.id}`}>
                    <div className="sms-student-card sms-student-card--pending">
                      <div className="sms-student-card-head">
                        <div>
                          <div className="sms-student-name">{s.name}</div>
                          <div className="sms-student-meta">{s.courseName}</div>
                        </div>
                        <CBadge color="warning">Pending</CBadge>
                      </div>
                      <div className="sms-student-amounts">
                        <div>
                          <span className="lbl">Paid</span>
                          <span className="val text-success">{formatMK(s.amountPaid || 0)}</span>
                        </div>
                        <div>
                          <span className="lbl">Balance</span>
                          <span className="val text-danger">{formatMK(s.balance)}</span>
                        </div>
                      </div>
                      {s.phoneNumber && <div className="small text-muted mt-2">{s.phoneNumber}</div>}
                    </div>
                  </CCol>
                ))}
              </CRow>
            )}
          </div>

          <div className="sms-info-panel mb-4">
            <h6 className="sms-info-panel-title">
              <CIcon icon={cilPeople} className="me-2" />
              All students ({cohortDetail.studentsWithBalance.length})
            </h6>
            <CRow className="g-3">
              {cohortDetail.studentsWithBalance.map((s) => (
                <CCol md={6} xl={4} key={`all-${s.ownerId}-${s.id}`}>
                  <div className={`sms-student-card ${s.balance <= 0 ? 'sms-student-card--paid' : 'sms-student-card--pending'}`}>
                    <div className="sms-student-card-head">
                      <div>
                        <div className="sms-student-name">{s.name}</div>
                        <div className="sms-student-meta">{s.courseName}</div>
                      </div>
                      <CBadge color={s.balance <= 0 ? 'success' : 'warning'}>
                        {s.balance <= 0 ? 'Paid' : 'Balance due'}
                      </CBadge>
                    </div>
                    <div className="sms-student-amounts">
                      <div>
                        <span className="lbl">Paid</span>
                        <span className="val text-success">{formatMK(s.amountPaid || 0)}</span>
                      </div>
                      <div>
                        <span className="lbl">Balance</span>
                        <span className={`val ${s.balance > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatMK(s.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CCol>
              ))}
            </CRow>
          </div>

          <div className="sms-info-panel">
            <h6 className="sms-info-panel-title">
              <CIcon icon={cilMoney} className="me-2" />
              Payments ({cohortDetail.cohortPayments.length})
            </h6>
            {cohortDetail.cohortPayments.length === 0 ? (
              <CAlert color="info" className="mb-0">No payment records for this cohort yet.</CAlert>
            ) : (
              <CTable responsive hover className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Student</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Method</CTableHeaderCell>
                    <CTableHeaderCell>Reference</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {cohortDetail.cohortPayments.slice(0, 20).map((p) => (
                    <CTableRow key={p.id}>
                      <CTableDataCell>{p.studentName || '—'}</CTableDataCell>
                      <CTableDataCell className="fw-bold text-success">{formatMK(p.amount)}</CTableDataCell>
                      <CTableDataCell>{p.paymentMethod || '—'}</CTableDataCell>
                      <CTableDataCell>{p.referenceNumber || '—'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AdminTeamHub
