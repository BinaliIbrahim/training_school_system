import React, { useMemo } from 'react'
import { CButton, CButtonGroup, CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilCloudDownload } from '@coreui/icons'
import AdminFinanceSummary from './AdminFinanceSummary'

const SchoolOverviewPanel = ({
  canEdit,
  dateFilter,
  setDateFilter,
  exportAllStudentsPDF,
  teamFinance = [],
  filteredStudentCount = 0,
  totalStudentCount = filteredStudentCount,
  hasActiveStudentFilters = false,
  allCohorts = [],
  allCourses = [],
  catalogOwnerId,
  paymentCount = 0,
}) => {
  const catalogStats = useMemo(() => {
    const sharedCohorts = catalogOwnerId
      ? allCohorts.filter((c) => c.ownerId === catalogOwnerId).length
      : allCohorts.length
    const legacyCohorts = catalogOwnerId
      ? allCohorts.filter((c) => c.ownerId !== catalogOwnerId).length
      : 0
    const sharedCourses = catalogOwnerId
      ? allCourses.filter((c) => c.ownerId === catalogOwnerId).length
      : allCourses.length
    const legacyCourses = catalogOwnerId
      ? allCourses.filter((c) => c.ownerId !== catalogOwnerId).length
      : 0
    return { sharedCohorts, legacyCohorts, sharedCourses, legacyCourses }
  }, [allCohorts, allCourses, catalogOwnerId])

  return (
    <div className="sms-overview-simple">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">School overview</h4>
          <p className="text-muted small mb-0">
            {hasActiveStudentFilters ? (
              <>
                <strong>{filteredStudentCount}</strong> of {totalStudentCount} students match filters ·{' '}
                {dateFilter.toLowerCase()} view · {paymentCount} payments
              </>
            ) : (
              <>
                {filteredStudentCount} student{filteredStudentCount !== 1 ? 's' : ''} in{' '}
                {dateFilter.toLowerCase()} view · {paymentCount} payments · shared catalog + team legacy data
              </>
            )}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <CButtonGroup size="sm">
            {['Day', 'Week', 'Month', 'Year'].map((v) => (
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
          {canEdit && (
            <CButton color="primary" size="sm" onClick={exportAllStudentsPDF}>
              <CIcon icon={cilCloudDownload} className="me-1" />
              Export
            </CButton>
          )}
        </div>
      </div>

      <AdminFinanceSummary teamFinance={teamFinance} />

      <div className="sms-overview-catalog mt-4">
        <div className="small fw-semibold text-muted mb-2">Catalog & enrolment</div>
        <div className="sms-audit-stats">
          <div className="sms-audit-stat sms-audit-stat--blue">
            <span className="sms-audit-stat-val">{catalogStats.sharedCohorts}</span>
            <span className="sms-audit-stat-lbl">Shared cohorts</span>
            {catalogStats.legacyCohorts > 0 && (
              <CBadge color="secondary" className="mt-1">+{catalogStats.legacyCohorts} legacy</CBadge>
            )}
          </div>
          <div className="sms-audit-stat sms-audit-stat--cyan">
            <span className="sms-audit-stat-val">{catalogStats.sharedCourses}</span>
            <span className="sms-audit-stat-lbl">Shared courses</span>
            {catalogStats.legacyCourses > 0 && (
              <CBadge color="secondary" className="mt-1">+{catalogStats.legacyCourses} legacy</CBadge>
            )}
          </div>
          <div className="sms-audit-stat sms-audit-stat--purple">
            <span className="sms-audit-stat-val">{filteredStudentCount}</span>
            <span className="sms-audit-stat-lbl">
              Students{hasActiveStudentFilters ? ' (filtered)' : ` (${dateFilter})`}
            </span>
          </div>
          <div className="sms-audit-stat sms-audit-stat--green">
            <span className="sms-audit-stat-val">{teamFinance.length}</span>
            <span className="sms-audit-stat-lbl">Team members</span>
          </div>
        </div>
        <p className="text-muted small mt-3 mb-0">
          <CIcon icon={cilCalendar} className="me-1" />
          New students use your shared catalog. Legacy items from coordinators are kept visible for existing records.
        </p>
      </div>
    </div>
  )
}

export default SchoolOverviewPanel
