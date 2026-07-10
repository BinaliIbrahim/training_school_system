import React, { useMemo } from 'react'
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CAvatar,
  CTooltip,
} from '@coreui/react'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilMoney,
  cilChart,
  cilCalendar,
  cilCloudDownload,
  cilBuilding,
  cilBook,
  cilArrowTop,
} from '@coreui/icons'
import { format, eachMonthOfInterval, startOfYear, endOfYear, subMonths } from 'date-fns'

const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
}

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount)

const formatMKShort = (amount) => {
  if (amount >= 1_000_000) return `MK ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `MK ${(amount / 1_000).toFixed(0)}K`
  return formatMK(amount)
}

const SchoolOverviewPanel = ({
  userRole,
  canCreate,
  canEdit,
  canDelete,
  dateFilter,
  setDateFilter,
  totalCollected,
  totalBalance,
  totalDue,
  filteredStudents,
  allCohorts,
  allStudents,
  allCourses,
  getAllPaymentsWithInitial,
  userStatistics,
  getOwnerBadgeColor,
  getCohortStatus,
  openUserStatsModal,
  exportAllStudentsPDF,
  managedUsersCount,
  currentUserId,
}) => {
  const hasAnyWrite = canCreate || canEdit || canDelete
  const collectionRate = totalDue > 0 ? Math.min(100, (totalCollected / totalDue) * 100) : 0
  const activeCohorts = allCohorts.filter((c) => getCohortStatus(c).text === 'Active').length

  const businessHealth = useMemo(() => {
    if (collectionRate >= 80) return { label: 'Excellent', color: 'success', score: 95 }
    if (collectionRate >= 60) return { label: 'Good', color: 'info', score: 75 }
    if (collectionRate >= 40) return { label: 'Fair', color: 'warning', score: 55 }
    return { label: 'Needs Attention', color: 'danger', score: 35 }
  }, [collectionRate])

  const kpiCards = [
    {
      title: 'Total Students',
      value: filteredStudents.length,
      sub: `${allStudents.length} all time`,
      icon: cilPeople,
      gradient: 'sms-kpi-purple',
      trend: filteredStudents.length > 0 ? '+ active' : '—',
    },
    {
      title: 'Revenue Collected',
      value: formatMKShort(totalCollected),
      sub: formatMK(totalCollected),
      icon: cilMoney,
      gradient: 'sms-kpi-green',
      trend: `${collectionRate.toFixed(0)}% rate`,
    },
    {
      title: 'Outstanding',
      value: formatMKShort(totalBalance),
      sub: 'Pending balances',
      icon: cilChart,
      gradient: 'sms-kpi-orange',
      trend: totalBalance > 0 ? 'Follow up' : 'All clear',
    },
    {
      title: 'Active Cohorts',
      value: activeCohorts,
      sub: `${allCohorts.length} total`,
      icon: cilCalendar,
      gradient: 'sms-kpi-blue',
      trend: `${allCourses.length} courses`,
    },
  ]

  const revenueTrend = useMemo(() => {
    const now = new Date()
    const months = eachMonthOfInterval({
      start: subMonths(startOfYear(now), 0),
      end: endOfYear(now),
    }).slice(-6)

    const labels = months.map((m) => format(m, 'MMM'))
    const data = months.map((month) => {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
      return getAllPaymentsWithInitial.reduce((sum, p) => {
        const d = p.paymentDate?.toDate ? p.paymentDate.toDate() : null
        if (!d || d < monthStart || d > monthEnd) return sum
        return sum + (p.amount || 0)
      }, 0)
    })

    return {
      labels,
      datasets: [
        {
          label: 'Collections (MWK)',
          data,
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          borderColor: CHART_COLORS.primary,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: CHART_COLORS.primary,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    }
  }, [getAllPaymentsWithInitial])

  const topPerformers = useMemo(() => {
    const sorted = [...userStatistics]
      .sort((a, b) => b.totalCollected - a.totalCollected)
      .slice(0, 6)
    return {
      labels: sorted.map((u) => (u.fullName || u.email || 'User').split(' ')[0]),
      datasets: [
        {
          label: 'Collected',
          data: sorted.map((u) => u.totalCollected),
          backgroundColor: sorted.map((_, i) =>
            `rgba(99, 102, 241, ${0.9 - i * 0.12})`,
          ),
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    }
  }, [userStatistics])

  const enrollmentTrend = useMemo(() => {
    const now = new Date()
    const months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now,
    })
    return {
      labels: months.map((m) => format(m, 'MMM')),
      datasets: [
        {
          label: 'New Students',
          data: months.map((month) => {
            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
            return allStudents.filter((s) => {
              const d = s.registrationDate?.toDate ? s.registrationDate.toDate() : null
              return d && d >= monthStart && d <= monthEnd
            }).length
          }),
          borderColor: CHART_COLORS.info,
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }, [allStudents])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${formatMK(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          color: '#94a3b8',
          callback: (v) => formatMKShort(v),
        },
      },
    },
  }

  const enrollmentChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          callbacks: { label: (ctx) => ` ${ctx.raw} students` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
      },
    }),
    [],
  )

  const roleLabel =
    userRole === 'super-admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Teacher'

  return (
    <div className="sms-overview">
      {/* Hero header */}
      <div className="sms-overview-hero mb-4">
        <div>
          <div className="sms-overview-greeting">
            <CIcon icon={cilBuilding} className="me-2" />
            {roleLabel} Command Center
          </div>
          <h2 className="sms-overview-title mb-1">Business at a glance</h2>
          <p className="sms-overview-sub mb-0">
            Tracking {managedUsersCount} coordinator{managedUsersCount !== 1 ? 's' : ''} ·{' '}
            {filteredStudents.length} students · {getAllPaymentsWithInitial.length} payment records
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className={`sms-health-pill sms-health-pill--${businessHealth.color}`}>
            <span className={`sms-health-dot bg-${businessHealth.color}`} />
            Business Health: <strong>{businessHealth.label}</strong>
          </div>
          <CButtonGroup className="sms-filter-pills">
            {['Day', 'Week', 'Month', 'Year'].map((v) => (
              <CButton
                key={v}
                color={v === dateFilter ? 'primary' : 'secondary'}
                variant={v === dateFilter ? undefined : 'outline'}
                size="sm"
                onClick={() => setDateFilter(v)}
              >
                {v}
              </CButton>
            ))}
          </CButtonGroup>
          {canEdit && (
            <CButton color="primary" size="sm" className="sms-btn-glow" onClick={exportAllStudentsPDF}>
              <CIcon icon={cilCloudDownload} className="me-1" />
              Export
            </CButton>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <CRow className="g-3 mb-4">
        {kpiCards.map((kpi) => (
          <CCol sm={6} xl={3} key={kpi.title}>
            <CCard className={`sms-kpi-card ${kpi.gradient} border-0 h-100`}>
              <CCardBody className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="sms-kpi-label">{kpi.title}</div>
                  <div className="sms-kpi-value">{kpi.value}</div>
                  <div className="sms-kpi-sub">{kpi.sub}</div>
                  <CBadge className="sms-kpi-trend mt-2">
                    <CIcon icon={cilArrowTop} size="sm" className="me-1" />
                    {kpi.trend}
                  </CBadge>
                </div>
                <div className="sms-kpi-icon-wrap">
                  <CIcon icon={kpi.icon} size="xl" />
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Charts row */}
      <CRow className="g-3 mb-4">
        <CCol lg={8}>
          <CCard className="sms-chart-card border-0 h-100">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-0 fw-bold">Revenue Trend</h5>
                  <small className="text-muted">Monthly collections across all coordinators</small>
                </div>
                <CBadge color="primary" shape="rounded-pill">
                  Last 6 months
                </CBadge>
              </div>
              <div className="sms-chart-wrap">
                <CChartLine data={revenueTrend} options={chartOptions} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={4}>
          <CCard className="sms-chart-card border-0 h-100">
            <CCardBody className="text-center">
              <h5 className="fw-bold mb-1">Collection Rate</h5>
              <small className="text-muted d-block mb-3">How much you've recovered</small>
              <div className="sms-collection-ring mx-auto mb-3">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#smsGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${collectionRate * 3.27} 327`}
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="smsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="sms-collection-ring-label">
                  <span className="sms-collection-pct">{collectionRate.toFixed(0)}%</span>
                  <span className="sms-collection-sub">collected</span>
                </div>
              </div>
              <div className="sms-ring-stats row g-2 mt-2">
                <div className="col-6">
                  <div className="sms-ring-stat">
                    <span className="text-success fw-bold">{formatMKShort(totalCollected)}</span>
                    <small className="text-muted d-block">Collected</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="sms-ring-stat">
                    <span className="text-warning fw-bold">{formatMKShort(totalBalance)}</span>
                    <small className="text-muted d-block">Outstanding</small>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-4">
        <CCol md={6}>
          <CCard className="sms-chart-card border-0 h-100">
            <CCardBody>
              <h5 className="fw-bold mb-1">Top Performers</h5>
              <small className="text-muted d-block mb-3">Coordinators by revenue collected</small>
              <div className="sms-chart-wrap">
                <CChartBar data={topPerformers} options={chartOptions} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard className="sms-chart-card border-0 h-100">
            <CCardBody>
              <h5 className="fw-bold mb-1">Enrollment Growth</h5>
              <small className="text-muted d-block mb-3">New student registrations</small>
              <div className="sms-chart-wrap">
                <CChartLine data={enrollmentTrend} options={enrollmentChartOptions} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Users table — redesigned */}
      <CCard className="sms-users-table-card border-0">
        <div className="sms-users-table-header">
          <div>
            <CIcon icon={cilPeople} className="me-2" />
            {hasAnyWrite ? 'Team Performance' : 'Data Overview'}
          </div>
          <CBadge color="light" textColor="dark">
            {userStatistics.length} members
          </CBadge>
        </div>
        <CCardBody className="p-0">
          <div className="table-responsive">
            <CTable hover align="middle" className="sms-users-table mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Coordinator</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Students</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Progress</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Collected</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Balance</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {userStatistics.map((userStat) => {
                  const rate =
                    userStat.totalDue > 0
                      ? Math.min(100, (userStat.totalCollected / userStat.totalDue) * 100)
                      : 0
                  return (
                    <CTableRow key={userStat.id} className="sms-user-row">
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-3">
                          <CAvatar
                            className="sms-user-avatar-table"
                            color={getOwnerBadgeColor(userStat.userType)}
                          >
                            {(userStat.fullName || 'U').charAt(0).toUpperCase()}
                          </CAvatar>
                          <div>
                            <div className="fw-semibold">
                              {userStat.fullName || 'No Name'}
                              {userStat.id === currentUserId && (
                                <CBadge color="primary" className="ms-2" size="sm">
                                  You
                                </CBadge>
                              )}
                            </div>
                            <div className="small text-muted">{userStat.email}</div>
                            <CBadge
                              color={
                                userStat.role === 'super-admin'
                                  ? 'danger'
                                  : userStat.role === 'admin'
                                    ? 'warning'
                                    : 'secondary'
                              }
                              size="sm"
                            >
                              {userStat.role}
                            </CBadge>
                          </div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <span className="sms-metric-pill">{userStat.studentCount}</span>
                        <div className="small text-muted mt-1">
                          {userStat.courseCount} courses
                        </div>
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: 140 }}>
                        <div className="d-flex align-items-center gap-2">
                          <CProgress
                            thin
                            color={rate >= 70 ? 'success' : rate >= 40 ? 'warning' : 'danger'}
                            value={rate}
                            className="flex-grow-1 sms-progress-glow"
                          />
                          <span className="small fw-semibold">{rate.toFixed(0)}%</span>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <span className="text-success fw-bold">{formatMK(userStat.totalCollected)}</span>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <span
                          className={`fw-bold ${userStat.totalBalance > 0 ? 'text-danger' : 'text-success'}`}
                        >
                          {formatMK(userStat.totalBalance)}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CTooltip content="Detailed stats">
                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            className="sms-action-btn"
                            onClick={() => openUserStatsModal(userStat)}
                          >
                            <CIcon icon={cilChart} />
                          </CButton>
                        </CTooltip>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default SchoolOverviewPanel
