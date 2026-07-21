import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilLightbulb } from '@coreui/icons'
import { showWelcomeTips } from '../../utils/onboarding'

const GUIDES = {
  adminHome: {
    title: 'My School — quick tips',
    steps: [
      'Overview shows money collected and team totals',
      'Cohorts → open a cohort to manage students and payments',
      'Payment Audit (top bar) lists every fee received',
    ],
  },
  overview: {
    title: 'Overview',
    steps: [
      'See how much was collected and what is still outstanding',
      'Switch Day / Week / Month / Year to change the time window',
      'Open Cohorts when you are ready to work with students',
    ],
  },
  cohorts: {
    title: 'Cohorts',
    steps: [
      'Each card is one intake (e.g. January 2026)',
      'Click Open workspace for students, courses, and payments',
      'Use Add Cohort in the action bar to create a new intake',
    ],
  },
  cohortDetails: {
    title: 'Cohort workspace',
    steps: [
      'Summary — money totals for this intake',
      'Students — add people, record payments, print receipts',
      'Payments — every transaction for this cohort',
    ],
  },
  courses: {
    title: 'Courses',
    steps: [
      'All programmes linked to your catalog',
      'Each card shows fee, duration, and how many enrolled',
      'Edit or delete from the card actions',
    ],
  },
  coordinator: {
    title: 'Your workspace',
    steps: [
      'Overview — KPIs and charts for your students',
      'Cohorts — open one to see students and payments inside',
      'Payments — all transactions across your cohorts',
    ],
  },
  coordinatorStudents: {
    title: 'Student cards',
    steps: [
      'Green = fully paid · Amber = balance due · Blue = eligible for certs',
      'Use Actions → Record payment when a student pays',
      'View details for a full fee breakdown',
    ],
  },
}

const SectionGuide = ({ section }) => {
  const guide = GUIDES[section]
  if (!guide || !showWelcomeTips()) return null

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
