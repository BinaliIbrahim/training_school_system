import React from 'react'
import { CRow, CCol, CButton, CProgress, CBadge, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilPeople,
  cilPencil,
  cilTrash,
  cilArrowRight,
  cilCloudDownload,
} from '@coreui/icons'
import { format, parseISO } from 'date-fns'
import SectionGuide from './SectionGuide'

const CohortsPanel = ({
  filteredCohorts,
  allCourses,
  allStudents,
  canCreate,
  canEdit,
  canDelete,
  getCohortStatus,
  getCohortProgress,
  getCohortDuration,
  getOwnerBadgeColor,
  viewCohortDetails,
  openEditCohort,
  openDeleteConfirm,
  exportAllStudentsPDF,
}) => (
  <div className="sms-cohorts-panel">
    <SectionGuide section="cohorts" />

    <div className="sms-panel-toolbar mb-3">
      <div>
        <h5 className="mb-0 fw-bold">All Cohorts</h5>
        <small className="text-muted">{filteredCohorts.length} intake periods</small>
      </div>
      {canEdit && (
        <CButton color="primary" size="sm" variant="outline" onClick={exportAllStudentsPDF}>
          <CIcon icon={cilCloudDownload} className="me-1" /> Export
        </CButton>
      )}
    </div>

    {filteredCohorts.length === 0 ? (
      <CAlert color="info">No cohorts found. Create one using + Add Cohort.</CAlert>
    ) : (
      <CRow className="g-3">
        {filteredCohorts.map((c) => {
          const status = getCohortStatus(c)
          const cohortCourses = allCourses.filter(
            (course) => course.cohortId === c.id && course.ownerId === c.ownerId,
          )
          const cohortStudents = allStudents.filter(
            (s) => s.cohortId === c.id && s.ownerId === c.ownerId,
          )
          const progress = getCohortProgress(c)

          return (
            <CCol md={6} xl={4} key={`${c.ownerId}-${c.id}`}>
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

                <CProgress
                  className="sms-cohort-progress mt-2 mb-3"
                  color={status.color}
                  value={progress}
                />
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
                  <div>
                    <CBadge color={getOwnerBadgeColor(c.ownerType)}>{c.ownerName?.split(' ')[0]}</CBadge>
                  </div>
                </div>

                <div className="sms-cohort-actions mt-3">
                  <CButton color="primary" className="flex-grow-1 sms-btn-glow" onClick={() => viewCohortDetails(c)}>
                    Open workspace
                    <CIcon icon={cilArrowRight} className="ms-1" />
                  </CButton>
                  {(canEdit || canDelete) && (
                    <>
                      {canEdit && (
                        <CButton color="warning" variant="outline" size="sm" onClick={() => openEditCohort(c)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                      )}
                      {canDelete && (
                        <CButton color="danger" variant="outline" size="sm" onClick={() => openDeleteConfirm(c, 'cohort')}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CCol>
          )
        })}
      </CRow>
    )}
  </div>
)

export default CohortsPanel
