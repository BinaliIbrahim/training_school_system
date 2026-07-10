import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilLightbulb } from '@coreui/icons'

const GUIDES = {
  overview: {
    title: 'Start here',
    steps: [
      'Review your business KPIs and charts at a glance',
      'Check team performance in the table below',
      'Use Payment Audit to see who paid and who owes',
    ],
  },
  cohorts: {
    title: 'Manage cohorts',
    steps: [
      'Each card is one intake period (e.g. January 2026)',
      'Click Open to drill into students, courses & payments',
      'Use + Add Cohort in the action bar to create new intakes',
    ],
  },
  cohortDetails: {
    title: 'Cohort workspace',
    steps: [
      'Use the tabs below — one section at a time',
      'Students tab shows paid vs balance as cards',
      'Courses tab lists all programmes in this intake',
    ],
  },
  courses: {
    title: 'All courses',
    steps: [
      'Browse every course across all cohorts',
      'Each card shows fee, duration & enrollment count',
      'Edit or delete from the card actions',
    ],
  },
  coordinator: {
    title: 'Your workspace',
    steps: [
      'Use the tabs to switch between overview, cohorts, students, courses & payments',
      'Add students, courses and cohorts from the action bar',
      'Track balances on student cards and record payments from Actions',
    ],
  },
  coordinatorStudents: {
    title: 'Student cards',
    steps: [
      'Green badge = fully paid · Amber = balance still due',
      'Boarding and day scholars are grouped separately',
      'Use Actions to record payments, view history, or print a receipt',
    ],
  },
}

const SectionGuide = ({ section }) => {
  const guide = GUIDES[section]
  const showTips = localStorage.getItem('sms-show-welcome-tips') !== 'false'
  if (!guide || !showTips) return null

  return (
    <div className="sms-guide-banner mb-4">
      <div className="sms-guide-icon">
        <CIcon icon={cilLightbulb} size="lg" />
      </div>
      <div className="flex-grow-1">
        <div className="sms-guide-title">{guide.title}</div>
        <ol className="sms-guide-steps mb-0">
          {guide.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default SectionGuide
