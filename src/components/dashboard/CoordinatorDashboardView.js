import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CFormSelect,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilChart,
  cilCloudDownload,
  cilFile,
  cilHome,
  cilList,
  cilMoney,
  cilPeople,
  cilBook,
  cilPlus,
  cilSearch,
  cilOptions,
  cilPencil,
  cilTrash,
  cilArrowLeft,
  cilArrowRight,
  cilUser,
} from '@coreui/icons'
import { format, parseISO } from 'date-fns'
import MainChart from '../../views/dashboard/MainChart'
import SectionGuide from './SectionGuide'
import OtherCohortsCard from './OtherCohortsCard'
import CohortDetailPanel from './CohortDetailPanel'
import { canModifyLegacyCatalogItem, studentMatchesCohort, isCohortComplete } from '../../utils/schoolCatalog'
import { partitionCohortsForDisplay } from '../../utils/cohortDisplay'
import DailyMomentum from '../engagement/DailyMomentum'
import { StudentStatusBadge } from './StudentEligibility'

const formatMKShort = (amount) => {
  if (amount >= 1_000_000) return `MK ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `MK ${(amount / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount)
}

const StudentCard = ({
  student,
  course,
  cohort,
  balance,
  totalDue,
  paymentCount,
  formatMK,
  openPaymentModal,
  openPaymentHistory,
  generateDetailedReceipt,
  openStudentDetailModal,
  openEditStudent,
  openDeleteConfirm,
  canCreate,
  canEdit,
  canDelete,
}) => {
  const paid = balance <= 0
  const eligible = paid && cohort && isCohortComplete(cohort)
  const cardClass = eligible
    ? 'sms-student-card--eligible'
    : paid
      ? 'sms-student-card--paid'
      : 'sms-student-card--pending'
  return (
    <CCol md={6} xl={4} key={student.id}>
      <div className={`sms-student-card ${cardClass}`}>
        <div className="sms-student-card-head">
          <div>
            <div className="sms-student-name">{student.name}</div>
            <div className="sms-student-meta">{student.phoneNumber || 'No phone'}</div>
          </div>
          <StudentStatusBadge paid={paid} eligible={eligible} />
        </div>
        <div className="sms-student-course">
          {course?.name || 'No course'} · {cohort?.name || 'No cohort'}
          {(student.boardingFee || 0) > 0 && (
            <CBadge color="info" className="ms-2">
              <CIcon icon={cilHome} size="sm" className="me-1" />
              Boarding
            </CBadge>
          )}
        </div>
        <div className="sms-student-amounts">
          <div>
            <span className="lbl">Due</span>
            <span className="val">{formatMK(totalDue)}</span>
          </div>
          <div>
            <span className="lbl">Paid</span>
            <span className="val text-success">{formatMK(student.amountPaid || 0)}</span>
          </div>
          <div>
            <span className="lbl">Balance</span>
            <span className={`val ${balance > 0 ? 'text-danger' : 'text-success'}`}>
              {formatMK(balance)}
            </span>
          </div>
        </div>
        {paymentCount > 0 && (
          <div className="small text-muted mb-2">{paymentCount} payment(s) on record</div>
        )}
        <CDropdown className="w-100">
          <CDropdownToggle color="secondary" variant="outline" size="sm" className="w-100">
            <CIcon icon={cilOptions} className="me-1" /> Actions
          </CDropdownToggle>
          <CDropdownMenu>
            <CDropdownItem onClick={() => openStudentDetailModal(student)}>
              <CIcon icon={cilUser} className="me-2" /> View details
            </CDropdownItem>
            {canCreate && (
              <CDropdownItem onClick={() => openPaymentModal(student)}>
                <CIcon icon={cilMoney} className="me-2" /> Record payment
              </CDropdownItem>
            )}
            {!canCreate && (
              <CDropdownItem disabled className="small text-muted">
                Record payment requires &quot;Allow create&quot;
              </CDropdownItem>
            )}
            {canEdit && (
              <CDropdownItem onClick={() => openEditStudent(student)}>
                <CIcon icon={cilPencil} className="me-2" /> Edit student
              </CDropdownItem>
            )}
            {canDelete && (
              <CDropdownItem
                className="text-danger"
                onClick={() => openDeleteConfirm(student, 'student')}
              >
                <CIcon icon={cilTrash} className="me-2" /> Delete student
              </CDropdownItem>
            )}
            {(canEdit || canDelete) && <CDropdownDivider />}
            <CDropdownItem onClick={() => openPaymentHistory(student)}>
              <CIcon icon={cilList} className="me-2" /> Payment history
            </CDropdownItem>
            <CDropdownItem onClick={() => generateDetailedReceipt(student)}>
              <CIcon icon={cilFile} className="me-2" /> Receipt
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>
      </div>
    </CCol>
  )
}

const CoordinatorDashboardView = ({
  activeSection,
  setActiveSection,
  searchQuery,
  setSearchQuery,
  filterCourse,
  setFilterCourse,
  filterCohort,
  setFilterCohort,
  dateFilter,
  setDateFilter,
  filteredCohorts,
  filteredCourses,
  filteredStudents,
  allStudents = filteredStudents,
  courses,
  cohorts,
  totalCollected,
  totalBalance,
  courseEnrollment,
  getAllPaymentsWithInitial,
  getCohortStatus,
  getCohortProgress,
  getCohortDuration,
  calcBalance,
  calcTotalDue,
  resolveCourse,
  resolveCohort,
  formatMK,
  getPaymentMethodColor,
  getPaymentTypeColor,
  openStudentModal,
  openStudentDetailModal,
  openEditStudent,
  openCourseModal,
  openEditCourse,
  openCohortModal,
  openEditCohort,
  openDeleteConfirm,
  openAllPaymentsModal,
  canManageCatalog = false,
  catalogOwnerId = null,
  catalogLoading = false,
  workspaceOwnerId = null,
  exportMyStatementPDF,
  openPaymentModal,
  openPaymentHistory,
  generateDetailedReceipt,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  accessSummary = '',
  permissionBlock = '',
  operatingDistrict = '',
}) => {
  const [showOtherCohorts, setShowOtherCohorts] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState(null)

  useEffect(() => {
    if (activeSection !== 'cohorts') {
      setSelectedCohort(null)
      setShowOtherCohorts(false)
    }
  }, [activeSection])

  const { primary: primaryCohorts, other: otherCohorts } = useMemo(
    () => partitionCohortsForDisplay(filteredCohorts, getCohortStatus, { activeOnly: true }),
    [filteredCohorts, getCohortStatus],
  )

  const visibleCohorts = showOtherCohorts ? otherCohorts : primaryCohorts

  const cohortStudents = useMemo(() => {
    if (!selectedCohort) return []
    return allStudents.filter((s) => studentMatchesCohort(s, selectedCohort, catalogOwnerId))
  }, [selectedCohort, allStudents, catalogOwnerId])

  const cohortCourses = useMemo(() => {
    if (!selectedCohort) return []
    return courses.filter((c) => c.cohortId === selectedCohort.id)
  }, [selectedCohort, courses])

  const cohortPayments = useMemo(() => {
    if (!selectedCohort || !cohortStudents.length) return []
    const studentKeys = new Set(cohortStudents.map((s) => s.id))
    return getAllPaymentsWithInitial.filter((p) => studentKeys.has(p.studentId))
  }, [selectedCohort, cohortStudents, getAllPaymentsWithInitial])

  const cohortStats = useMemo(() => {
    if (!selectedCohort) return null
    const totalCollected = cohortStudents.reduce((sum, s) => sum + (s.amountPaid || 0), 0)
    const totalDue = cohortStudents.reduce((sum, s) => sum + calcTotalDue(s), 0)
    const paidStudents = cohortStudents.filter((s) => calcBalance(s) <= 0).length
    return {
      totalStudents: cohortStudents.length,
      totalCourses: cohortCourses.length,
      totalPayments: cohortPayments.length,
      totalCollected,
      totalDue,
      totalBalance: totalDue - totalCollected,
      paidStudents,
      pendingStudents: cohortStudents.length - paidStudents,
      completionRate: cohortStudents.length > 0 ? Math.round((paidStudents / cohortStudents.length) * 100) : 0,
    }
  }, [selectedCohort, cohortStudents, cohortCourses, cohortPayments, calcTotalDue, calcBalance])

  const openCohortWorkspace = (cohort) => {
    setSelectedCohort(cohort)
    setShowOtherCohorts(false)
  }

  const backToCohortList = () => setSelectedCohort(null)

  const getOwnerBadgeColor = () => 'info'

  const totalDue = filteredStudents.reduce((sum, s) => sum + calcTotalDue(s), 0)
  const collectionRate = totalDue > 0 ? Math.min(100, (totalCollected / totalDue) * 100) : 0
  const paidCount = filteredStudents.filter((s) => calcBalance(s) <= 0).length

  const kpiCards = [
    {
      title: 'Students',
      value: filteredStudents.length,
      sub: `${paidCount} fully paid`,
      gradient: 'sms-kpi-purple',
      icon: cilPeople,
    },
    {
      title: 'Collected',
      value: formatMKShort(totalCollected),
      sub: formatMK(totalCollected),
      gradient: 'sms-kpi-green',
      icon: cilMoney,
    },
    {
      title: 'Outstanding',
      value: formatMKShort(totalBalance),
      sub: `${Math.round(collectionRate)}% collected`,
      gradient: 'sms-kpi-orange',
      icon: cilChart,
    },
    {
      title: 'Cohorts',
      value: filteredCohorts.length,
      sub: `${filteredCourses.length} courses`,
      gradient: 'sms-kpi-blue',
      icon: cilCalendar,
    },
  ]

  const renderStudents = (list, emptyMsg) =>
    list.length === 0 ? (
      <CAlert color="info">{emptyMsg}</CAlert>
    ) : (
      <CRow className="g-3">
        {list.map((s) => {
          const course = resolveCourse ? resolveCourse(s) : courses.find((c) => c.id === s.courseId)
          const cohort = resolveCohort ? resolveCohort(s) : cohorts.find((c) => c.id === s.cohortId)
          const balance = calcBalance(s)
          const paymentCount = getAllPaymentsWithInitial.filter((p) => p.studentId === s.id).length
          return (
            <StudentCard
              key={s.id}
              student={s}
              course={course}
              cohort={cohort}
              balance={balance}
              totalDue={calcTotalDue(s)}
              paymentCount={paymentCount}
              formatMK={formatMK}
              openPaymentModal={openPaymentModal}
              openPaymentHistory={openPaymentHistory}
              generateDetailedReceipt={generateDetailedReceipt}
              openStudentDetailModal={openStudentDetailModal}
              openEditStudent={openEditStudent}
              openDeleteConfirm={openDeleteConfirm}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )
        })}
      </CRow>
    )

  return (
    <div className="sms-coordinator-dashboard">
      <div className="sms-page-hero mb-4">
        <div>
          <h2 className="mb-1 fw-bold">
            <CIcon icon={cilPeople} className="me-2" />
            My Workspace
          </h2>
          <p className="text-muted mb-0">
            Open a cohort to manage its students and courses — everything stays grouped by intake.
          </p>
          {operatingDistrict && (
            <CBadge color="light" className="text-dark border mt-2 me-2">
              Operating in {operatingDistrict}
            </CBadge>
          )}
          {accessSummary && accessSummary !== 'Full access' && (
            <CBadge color="info" className="mt-2">
              Your access: {accessSummary}
            </CBadge>
          )}
        </div>
      </div>

      <DailyMomentum />

      {!canManageCatalog && (
        <CAlert color="info" className="mb-4">
          Courses and cohorts are managed by your school admin. Select from the shared catalog when adding students.
        </CAlert>
      )}

      {!canManageCatalog && !catalogLoading && !catalogOwnerId && (
        <CAlert color="warning" className="mb-4">
          Your account is not linked to a school admin yet. Ask your admin to add you under{' '}
          <strong>My Users</strong> so their courses and cohorts appear here.
        </CAlert>
      )}

      {!canCreate && !canEdit && !canDelete && (
        <CAlert color="warning" className="mb-4">
          Your account has view-only access. Ask your admin or super-admin to enable Create, Edit, or
          Delete in Manage Users, then click <strong>Save Changes</strong>.
        </CAlert>
      )}

      {permissionBlock && (
        <CAlert color="warning" className="mb-4">
          {permissionBlock}
        </CAlert>
      )}

      <CRow className="g-3 mb-4">
        {kpiCards.map((kpi) => (
          <CCol sm={6} xl={3} key={kpi.title}>
            <CCard className={`sms-kpi-card ${kpi.gradient} border-0 h-100`}>
              <CCardBody className="d-flex align-items-start justify-content-between">
                <div>
                  <div className="sms-kpi-label">{kpi.title}</div>
                  <div className="sms-kpi-value">{kpi.value}</div>
                  <div className="sms-kpi-sub">{kpi.sub}</div>
                </div>
                <div className="sms-kpi-icon-wrap">
                  <CIcon icon={kpi.icon} size="xl" />
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <CCard className="sms-glass-card border-0 mb-4">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol md={5}>
              <label className="form-label small fw-semibold mb-1">Search</label>
              <div className="sms-search">
                <CIcon icon={cilSearch} className="sms-search-icon" />
                <CFormInput
                  placeholder="Search students, courses, cohorts… (any word order)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sms-search-input"
                />
              </div>
            </CCol>
            <CCol md={3}>
              <label className="form-label small fw-semibold mb-1">Course</label>
              <CFormSelect value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <label className="form-label small fw-semibold mb-1">Cohort</label>
              <CFormSelect value={filterCohort} onChange={(e) => setFilterCohort(e.target.value)}>
                <option value="">All Cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <div className="sms-action-bar mb-4">
        <CButton
          color="primary"
          className="sms-btn-glow"
          onClick={openStudentModal}
          disabled={!canCreate}
          title={canCreate ? 'Add a new student' : 'Requires Allow create permission'}
        >
          <CIcon icon={cilPlus} className="me-1" /> Add Student
        </CButton>
        {canManageCatalog && (
          <>
        <CButton
          color="primary"
          variant="outline"
          onClick={openCourseModal}
          disabled={!canCreate}
          title={canCreate ? 'Add a new course' : 'Requires Allow create permission'}
        >
          <CIcon icon={cilPlus} className="me-1" /> Add Course
        </CButton>
        <CButton
          color="info"
          variant="outline"
          onClick={openCohortModal}
          disabled={!canCreate}
          title={canCreate ? 'Add a new cohort' : 'Requires Allow create permission'}
        >
          <CIcon icon={cilPlus} className="me-1" /> Add Cohort
        </CButton>
          </>
        )}
        <CButton color="success" variant="outline" onClick={openAllPaymentsModal}>
          <CIcon icon={cilList} className="me-1" /> Payment Audit ({getAllPaymentsWithInitial.length})
        </CButton>
      </div>

      <CNav variant="tabs" className="sms-section-tabs mb-4">
        {[
          { id: 'overview', label: 'Overview', icon: cilChart },
          { id: 'cohorts', label: `Cohorts (${filteredCohorts.length})`, icon: cilCalendar },
          { id: 'payments', label: 'Payments', icon: cilMoney },
        ].map((tab) => (
          <CNavItem key={tab.id}>
            <CNavLink active={activeSection === tab.id} onClick={() => setActiveSection(tab.id)}>
              <CIcon icon={tab.icon} className="me-2" />
              {tab.label}
            </CNavLink>
          </CNavItem>
        ))}
      </CNav>

      {activeSection === 'overview' && (
        <>
          <SectionGuide section="coordinator" />
          <CCard className="sms-glass-card border-0 mb-4">
            <CCardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-0">Enrollment Overview</h5>
                  <small className="text-muted">Students per course</small>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <CButtonGroup size="sm">
                    {['All', 'Day', 'Week', 'Month', 'Year'].map((v) => (
                      <CButton
                        key={v}
                        color={v === dateFilter ? 'primary' : 'secondary'}
                        variant={v === dateFilter ? undefined : 'outline'}
                        onClick={() => setDateFilter(v)}
                      >
                        {v}
                      </CButton>
                    ))}
                  </CButtonGroup>
                  <CButton color="primary" size="sm" variant="outline" onClick={exportMyStatementPDF} disabled={!canEdit}>
                    <CIcon icon={cilCloudDownload} className="me-1" /> Export
                  </CButton>
                </div>
              </div>
              <MainChart data={courseEnrollment} />
              <CRow className="g-3 mt-2 text-center">
                <CCol sm={4}>
                  <div className="sms-stat-inline">
                    <span className="sms-stat-inline-val text-success">{formatMK(totalCollected)}</span>
                    <span className="sms-stat-inline-lbl">Collected</span>
                  </div>
                </CCol>
                <CCol sm={4}>
                  <div className="sms-stat-inline">
                    <span className="sms-stat-inline-val text-warning">{formatMK(totalBalance)}</span>
                    <span className="sms-stat-inline-lbl">Outstanding</span>
                  </div>
                </CCol>
                <CCol sm={4}>
                  <div className="sms-stat-inline">
                    <span className="sms-stat-inline-val">{Math.round(collectionRate)}%</span>
                    <span className="sms-stat-inline-lbl">Collection rate</span>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </>
      )}

      {activeSection === 'cohorts' && selectedCohort && cohortStats && (
        <CohortDetailPanel
          selectedCohortDetails={selectedCohort}
          cohortStats={cohortStats}
          cohortStudents={cohortStudents}
          cohortCourses={cohortCourses}
          cohortPayments={cohortPayments}
          allCourses={courses}
          getAllPaymentsWithInitial={getAllPaymentsWithInitial}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          formatMK={formatMK}
          calcBalance={calcBalance}
          getCohortStatus={getCohortStatus}
          getCohortProgress={getCohortProgress}
          getCohortDuration={getCohortDuration}
          getOwnerBadgeColor={getOwnerBadgeColor}
          getPaymentMethodColor={getPaymentMethodColor}
          getPaymentTypeColor={getPaymentTypeColor}
          backToCohorts={backToCohortList}
          openStudentDetailModal={openStudentDetailModal}
          openEditStudent={openEditStudent}
          openPaymentModal={openPaymentModal}
          openPaymentHistory={openPaymentHistory}
          generateStudentReceipt={generateDetailedReceipt}
          openEditCourse={openEditCourse}
          openDeleteConfirm={openDeleteConfirm}
          openAllPaymentsModal={openAllPaymentsModal}
        />
      )}

      {activeSection === 'cohorts' && !selectedCohort && (
        <>
          <SectionGuide section="cohorts" />
          <div className="sms-panel-toolbar mb-3">
            <div>
              <h5 className="mb-0 fw-bold">{showOtherCohorts ? 'Other cohorts' : 'Active cohorts'}</h5>
              <small className="text-muted">
                {showOtherCohorts
                  ? `${otherCohorts.length} completed or non-active intake${otherCohorts.length !== 1 ? 's' : ''}`
                  : `${primaryCohorts.length} active · ${filteredCohorts.length} total`}
              </small>
            </div>
            {showOtherCohorts && (
              <CButton color="secondary" variant="outline" size="sm" onClick={() => setShowOtherCohorts(false)}>
                <CIcon icon={cilArrowLeft} className="me-1" />
                Back
              </CButton>
            )}
          </div>
          {filteredCohorts.length === 0 ? (
            catalogLoading ? (
              <CAlert color="light">Loading cohorts from your school catalog…</CAlert>
            ) : !catalogOwnerId ? (
              <CAlert color="warning">Link your account to a school admin to see shared cohorts.</CAlert>
            ) : (
              <CAlert color="info">No cohorts in the school catalog yet. Ask your admin to create cohorts.</CAlert>
            )
          ) : visibleCohorts.length === 0 && !showOtherCohorts ? (
            <CAlert color="info">
              No active cohorts right now.{' '}
              {otherCohorts.length > 0 && (
                <CButton color="link" className="p-0 align-baseline" onClick={() => setShowOtherCohorts(true)}>
                  View {otherCohorts.length} other cohort{otherCohorts.length !== 1 ? 's' : ''}
                </CButton>
              )}
            </CAlert>
          ) : (
            <CRow className="g-3">
              {visibleCohorts.map((c) => {
                const status = getCohortStatus(c)
                const cohortCourses = courses.filter((course) => course.cohortId === c.id)
                const cohortStudents = allStudents.filter((s) =>
                  studentMatchesCohort(s, c, catalogOwnerId),
                )
                const progress = getCohortProgress(c)
                const canModify = canManageCatalog || canModifyLegacyCatalogItem(c, workspaceOwnerId, catalogOwnerId)
                return (
                  <CCol md={6} xl={4} key={c.id}>
                    <div
                      className={`sms-cohort-card sms-cohort-card--${status.color}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCohortWorkspace(c)}
                      onKeyDown={(e) => e.key === 'Enter' && openCohortWorkspace(c)}
                    >
                      <div className="sms-cohort-card-top">
                        <div>
                          <div className="sms-cohort-name">{c.name}</div>
                          <div className="sms-cohort-desc">{c.description || 'No description'}</div>
                        </div>
                        <CBadge color={status.color}>{status.text}</CBadge>
                      </div>
                      {c.startDate && (
                        <div className="sms-cohort-dates">
                          {format(parseISO(c.startDate), 'dd MMM yyyy')} →{' '}
                          {format(parseISO(c.endDate), 'dd MMM yyyy')}
                          <span className="ms-2 text-muted">({getCohortDuration(c)})</span>
                        </div>
                      )}
                      <CProgress className="sms-cohort-progress mt-2 mb-2" color={status.color} value={progress} />
                      <div className="small text-muted mb-3">{Math.round(progress)}% timeline complete</div>
                      <div className="sms-cohort-metrics">
                        <div>
                          <span className="sms-cohort-metric-val">{cohortStudents.length}</span>
                          <span className="sms-cohort-metric-lbl">Students</span>
                        </div>
                        <div>
                          <span className="sms-cohort-metric-val">{cohortCourses.length}</span>
                          <span className="sms-cohort-metric-lbl">Courses</span>
                        </div>
                      </div>
                      <CButton
                        color="primary"
                        className="w-100 mt-3 sms-btn-glow"
                        onClick={(e) => {
                          e.stopPropagation()
                          openCohortWorkspace(c)
                        }}
                      >
                        Open workspace
                        <CIcon icon={cilArrowRight} className="ms-1" />
                      </CButton>
                      {canModify && (canEdit || canDelete) && (
                        <div className="d-flex gap-2 mt-3 pt-3 border-top border-secondary-subtle">
                          {canEdit && (
                            <CButton
                              size="sm"
                              color="primary"
                              variant="outline"
                              className="flex-grow-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditCohort(c)
                              }}
                            >
                              <CIcon icon={cilPencil} className="me-1" /> Edit
                            </CButton>
                          )}
                          {canDelete && (
                            <CButton
                              size="sm"
                              color="danger"
                              variant="outline"
                              className="flex-grow-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDeleteConfirm(c, 'cohort')
                              }}
                            >
                              <CIcon icon={cilTrash} className="me-1" /> Delete
                            </CButton>
                          )}
                        </div>
                      )}
                    </div>
                  </CCol>
                )
              })}
              {!showOtherCohorts && otherCohorts.length > 0 && (
                <CCol md={6} xl={4}>
                  <OtherCohortsCard count={otherCohorts.length} onClick={() => setShowOtherCohorts(true)} />
                </CCol>
              )}
            </CRow>
          )}
        </>
      )}

      {activeSection === 'payments' && (
        <>
          <div className="sms-panel-toolbar mb-3">
            <div>
              <h5 className="mb-0 fw-bold">Recent Payments</h5>
              <small className="text-muted">Latest transactions across all students</small>
            </div>
            <CButton color="success" size="sm" variant="outline" onClick={openAllPaymentsModal}>
              <CIcon icon={cilList} className="me-1" /> Full audit
            </CButton>
          </div>
          {getAllPaymentsWithInitial.length === 0 ? (
            <CAlert color="info">No payments recorded yet.</CAlert>
          ) : (
            <CCard className="sms-glass-card border-0">
              <CCardBody className="p-0">
                <div className="table-responsive">
                  <CTable hover align="middle" className="mb-0 sms-payments-table">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Student</CTableHeaderCell>
                        <CTableHeaderCell>Amount</CTableHeaderCell>
                        <CTableHeaderCell>Method</CTableHeaderCell>
                        <CTableHeaderCell>Type</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {getAllPaymentsWithInitial.slice(0, 15).map((payment, index) => {
                        const paymentDate = payment.paymentDate?.toDate
                          ? format(payment.paymentDate.toDate(), 'dd MMM yyyy HH:mm')
                          : '—'
                        const paymentType = payment.isInitialPayment
                          ? 'Initial'
                          : payment.transactionType || 'Additional'
                        return (
                          <CTableRow key={payment.id || index}>
                            <CTableDataCell className="small">{paymentDate}</CTableDataCell>
                            <CTableDataCell>
                              <strong>{payment.studentName || '—'}</strong>
                            </CTableDataCell>
                            <CTableDataCell className="fw-bold text-success">
                              {formatMK(payment.amount || 0)}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={getPaymentMethodColor(payment.paymentMethod)}>
                                {payment.paymentMethod}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                                {paymentType}
                              </CBadge>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </div>
              </CCardBody>
            </CCard>
          )}
        </>
      )}
    </div>
  )
}

export default CoordinatorDashboardView
