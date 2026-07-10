import React from 'react'
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
} from '@coreui/icons'
import { format, parseISO } from 'date-fns'
import MainChart from '../../views/dashboard/MainChart'
import SectionGuide from './SectionGuide'
import DailyMomentum from '../engagement/DailyMomentum'

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
  openEditStudent,
  openDeleteConfirm,
  canCreate,
  canEdit,
  canDelete,
}) => {
  const paid = balance <= 0
  return (
    <CCol md={6} xl={4} key={student.id}>
      <div className={`sms-student-card ${paid ? 'sms-student-card--paid' : 'sms-student-card--pending'}`}>
        <div className="sms-student-card-head">
          <div>
            <div className="sms-student-name">{student.name}</div>
            <div className="sms-student-meta">{student.phoneNumber || 'No phone'}</div>
          </div>
          <CBadge color={paid ? 'success' : 'warning'}>{paid ? 'Paid' : 'Balance due'}</CBadge>
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
  formatMK,
  getPaymentMethodColor,
  getPaymentTypeColor,
  openStudentModal,
  openEditStudent,
  openCourseModal,
  openEditCourse,
  openCohortModal,
  openEditCohort,
  openDeleteConfirm,
  openAllPaymentsModal,
  exportMyStatementPDF,
  openPaymentModal,
  openPaymentHistory,
  generateDetailedReceipt,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  accessSummary = '',
  permissionBlock = '',
}) => {
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
          const course = courses.find((c) => c.id === s.courseId)
          const cohort = cohorts.find((c) => c.id === s.cohortId)
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
            Manage your cohorts, students, courses, and payments — all in one place.
          </p>
          {accessSummary && accessSummary !== 'Full access' && (
            <CBadge color="info" className="mt-2">
              Your access: {accessSummary}
            </CBadge>
          )}
        </div>
      </div>

      <DailyMomentum />

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
                  placeholder="Search students, courses, cohorts..."
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
        <CButton color="success" variant="outline" onClick={openAllPaymentsModal}>
          <CIcon icon={cilList} className="me-1" /> Payment Audit ({getAllPaymentsWithInitial.length})
        </CButton>
      </div>

      <CNav variant="tabs" className="sms-section-tabs mb-4">
        {[
          { id: 'overview', label: 'Overview', icon: cilChart },
          { id: 'cohorts', label: `Cohorts (${filteredCohorts.length})`, icon: cilCalendar },
          { id: 'students', label: `Students (${filteredStudents.length})`, icon: cilPeople },
          { id: 'courses', label: `Courses (${filteredCourses.length})`, icon: cilBook },
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

      {activeSection === 'cohorts' && (
        <>
          <SectionGuide section="cohorts" />
          <div className="sms-panel-toolbar mb-3">
            <div>
              <h5 className="mb-0 fw-bold">Academic Cohorts</h5>
              <small className="text-muted">{filteredCohorts.length} intake periods</small>
            </div>
          </div>
          {filteredCohorts.length === 0 ? (
            <CAlert color="info">No cohorts yet. Click + Add Cohort to create your first intake.</CAlert>
          ) : (
            <CRow className="g-3">
              {filteredCohorts.map((c) => {
                const status = getCohortStatus(c)
                const cohortCourses = courses.filter((course) => course.cohortId === c.id)
                const cohortStudents = filteredStudents.filter((s) => s.cohortId === c.id)
                const progress = getCohortProgress(c)
                return (
                  <CCol md={6} xl={4} key={c.id}>
                    <div className={`sms-cohort-card sms-cohort-card--${status.color}`}>
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
                      {(canEdit || canDelete) && (
                        <div className="d-flex gap-2 mt-3 pt-3 border-top border-secondary-subtle">
                          {canEdit && (
                            <CButton
                              size="sm"
                              color="primary"
                              variant="outline"
                              className="flex-grow-1"
                              onClick={() => openEditCohort(c)}
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
                              onClick={() => openDeleteConfirm(c, 'cohort')}
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
            </CRow>
          )}
        </>
      )}

      {activeSection === 'students' && (
        <>
          <SectionGuide section="coordinatorStudents" />
          {filteredStudents.length === 0 ? (
            <CAlert color="info">No students yet. Add your first student to get started.</CAlert>
          ) : (() => {
            const boarding = filteredStudents.filter((s) => (s.boardingFee || 0) > 0)
            const dayScholars = filteredStudents.filter((s) => (s.boardingFee || 0) === 0)
            return (
              <>
                {boarding.length > 0 && (
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">
                      <CIcon icon={cilHome} className="me-2 text-info" />
                      Boarding Students ({boarding.length})
                    </h6>
                    {renderStudents(boarding, 'No boarding students.')}
                  </div>
                )}
                {dayScholars.length > 0 && (
                  <div>
                    <h6 className="fw-bold mb-3">
                      <CIcon icon={cilPeople} className="me-2" />
                      {boarding.length > 0 ? `Day Scholars (${dayScholars.length})` : `All Students (${dayScholars.length})`}
                    </h6>
                    {renderStudents(dayScholars, 'No students.')}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {activeSection === 'courses' && (
        <>
          <SectionGuide section="courses" />
          <div className="sms-panel-toolbar mb-3">
            <div>
              <h5 className="mb-0 fw-bold">Courses</h5>
              <small className="text-muted">{filteredCourses.length} programmes</small>
            </div>
          </div>
          {filteredCourses.length === 0 ? (
            <CAlert color="info">No courses yet. Add a course and link it to a cohort.</CAlert>
          ) : (
            <CRow className="g-3">
              {filteredCourses.map((c) => {
                const cohort = cohorts.find((coh) => coh.id === c.cohortId)
                const enrolled = filteredStudents.filter((s) => s.courseId === c.id).length
                return (
                  <CCol md={6} xl={4} key={c.id}>
                    <div className="sms-course-card">
                      <div className="sms-course-card-head">
                        <div className="sms-course-name">{c.name}</div>
                        <CBadge color={c.type === 'weekly' ? 'info' : 'warning'}>{c.type}</CBadge>
                      </div>
                      <div className="sms-course-fee">{formatMK(c.fee)}</div>
                      <div className="sms-course-meta">
                        <span>{c.duration}</span>
                        <span>{enrolled} enrolled</span>
                      </div>
                      <CBadge color="secondary" className="mb-0">
                        {cohort?.name || 'No cohort'}
                      </CBadge>
                      {(canEdit || canDelete) && (
                        <div className="d-flex gap-2 mt-3 pt-3 border-top border-secondary-subtle">
                          {canEdit && (
                            <CButton
                              size="sm"
                              color="primary"
                              variant="outline"
                              className="flex-grow-1"
                              onClick={() => openEditCourse(c)}
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
                              onClick={() => openDeleteConfirm(c, 'course')}
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
