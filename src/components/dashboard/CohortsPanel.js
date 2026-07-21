import React, { useMemo, useState } from 'react'
import { CRow, CCol, CButton, CProgress, CBadge, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilPencil,
  cilTrash,
  cilArrowRight,
  cilCloudDownload,
  cilArrowLeft,
} from '@coreui/icons'
import { format, parseISO } from 'date-fns'
import SectionGuide from './SectionGuide'
import OtherCohortsCard from './OtherCohortsCard'
import { partitionCohortsForDisplay } from '../../utils/cohortDisplay'

const CohortsPanel = ({
  filteredCohorts,
  allCourses,
  allStudents,
  filtersActive = false,
  catalogOwnerId,
  canManageCatalog,
  canEdit,
  canDelete,
  studentMatchesCohort,
  getCohortStatus,
  getCohortProgress,
  getCohortDuration,
  getOwnerBadgeColor,
  viewCohortDetails,
  openEditCohort,
  openDeleteConfirm,
  exportAllStudentsPDF,
}) => {
  const [showOtherCohorts, setShowOtherCohorts] = useState(false)

  const { primary: primaryCohorts, other: otherCohorts } = useMemo(
    () => partitionCohortsForDisplay(filteredCohorts, getCohortStatus),
    [filteredCohorts, getCohortStatus],
  )

  const visibleCohorts = showOtherCohorts ? otherCohorts : primaryCohorts

  const renderCohortCard = (c) => {
    const status = getCohortStatus(c)
    const cohortCourses = allCourses.filter(
      (course) => course.cohortId === c.id && course.ownerId === c.ownerId,
    )
    const cohortStudents = allStudents.filter((s) => studentMatchesCohort(s, c))
    const progress = getCohortProgress(c)

    return (
      <CCol md={6} xl={4} key={`${c.ownerId}-${c.id}`}>
        <div className={`sms-cohort-card sms-cohort-card--${status.color}`}>
          <div className="sms-cohort-card-top">
            <div>
              <div className="sms-cohort-name">{c.name}</div>
              <div className="sms-cohort-desc">
                {c.description || 'No description'}
                {c.legacy && (
                  <CBadge color="secondary" className="ms-2">Legacy</CBadge>
                )}
              </div>
            </div>
            <CBadge color={status.color}>{status.text}</CBadge>
          </div>

          {c.startDate && (
            <div className="sms-cohort-dates">
              <CIcon icon={cilCalendar} className="me-1" />
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
            {(canManageCatalog && c.ownerId === catalogOwnerId && (canEdit || canDelete)) && (
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
  }

  return (
    <div className="sms-cohorts-panel">
      <SectionGuide section="cohorts" />

      <div className="sms-panel-toolbar mb-3">
        <div>
          <h5 className="mb-0 fw-bold">{showOtherCohorts ? 'Other cohorts' : 'Active & latest cohorts'}</h5>
          <small className="text-muted">
            {showOtherCohorts
              ? `${otherCohorts.length} past or non-active intake${otherCohorts.length !== 1 ? 's' : ''}`
              : `${primaryCohorts.length} shown · ${filteredCohorts.length} total`}
          </small>
        </div>
        <div className="d-flex gap-2">
          {showOtherCohorts && (
            <CButton color="secondary" variant="outline" size="sm" onClick={() => setShowOtherCohorts(false)}>
              <CIcon icon={cilArrowLeft} className="me-1" />
              Back
            </CButton>
          )}
          {canEdit && (
            <CButton color="primary" size="sm" variant="outline" onClick={exportAllStudentsPDF}>
              <CIcon icon={cilCloudDownload} className="me-1" /> Export
            </CButton>
          )}
        </div>
      </div>

      {filteredCohorts.length === 0 ? (
        <CAlert color="info">
          {filtersActive
            ? 'No cohorts match the current filters. Try clearing search or payment filters.'
            : 'No cohorts in the school catalog yet. Ask your admin to add cohorts.'}
        </CAlert>
      ) : visibleCohorts.length === 0 && !showOtherCohorts ? (
        <CAlert color="info">
          No active or latest cohorts right now.{' '}
          {otherCohorts.length > 0 && (
            <CButton color="link" className="p-0 align-baseline" onClick={() => setShowOtherCohorts(true)}>
              View {otherCohorts.length} other cohort{otherCohorts.length !== 1 ? 's' : ''}
            </CButton>
          )}
        </CAlert>
      ) : (
        <CRow className="g-3">
          {visibleCohorts.map(renderCohortCard)}
          {!showOtherCohorts && otherCohorts.length > 0 && (
            <CCol md={6} xl={4}>
              <OtherCohortsCard count={otherCohorts.length} onClick={() => setShowOtherCohorts(true)} />
            </CCol>
          )}
        </CRow>
      )}
    </div>
  )
}

export default CohortsPanel
