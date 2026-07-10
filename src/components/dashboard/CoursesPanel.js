import React from 'react'
import { CRow, CCol, CButton, CBadge, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'
import SectionGuide from './SectionGuide'

const CoursesPanel = ({
  filteredCourses,
  allStudents,
  canEdit,
  canDelete,
  formatMK,
  getOwnerBadgeColor,
  openEditCourse,
  openDeleteConfirm,
}) => (
  <div className="sms-courses-panel">
    <SectionGuide section="courses" />

    <div className="sms-panel-toolbar mb-3">
      <div>
        <h5 className="mb-0 fw-bold">All Courses</h5>
        <small className="text-muted">{filteredCourses.length} programmes</small>
      </div>
    </div>

    {filteredCourses.length === 0 ? (
      <CAlert color="info">No courses found. Add one with + Add Course.</CAlert>
    ) : (
      <CRow className="g-3">
        {filteredCourses.map((c) => {
          const enrolled = allStudents.filter(
            (s) => s.courseId === c.id && s.ownerId === c.ownerId,
          ).length
          return (
            <CCol md={6} xl={4} key={`${c.ownerId}-${c.id}`}>
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
                <CBadge color={getOwnerBadgeColor(c.ownerType)} className="mb-2">
                  {c.ownerName}
                </CBadge>
                {(canEdit || canDelete) && (
                  <div className="sms-course-actions">
                    {canEdit && (
                      <CButton color="warning" variant="outline" size="sm" onClick={() => openEditCourse(c)}>
                        <CIcon icon={cilPencil} className="me-1" /> Edit
                      </CButton>
                    )}
                    {canDelete && (
                      <CButton color="danger" variant="outline" size="sm" onClick={() => openDeleteConfirm(c, 'course')}>
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
  </div>
)

export default CoursesPanel
