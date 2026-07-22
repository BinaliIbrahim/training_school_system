import { getRoleLabel } from '../constants/roles'

/** Shared install steps — appended to every role guide (on-screen + PDF). */
export const PWA_INSTALL_SECTION = {
  title: 'Install as desktop or mobile app',
  steps: [
    'SMS Pro works as a Progressive Web App (PWA). You can install it on your computer or phone like a native app — no app store required.',
    'Desktop (Chrome or Edge): sign in to SMS Pro in your browser, then open Settings or Home and click Install App on the banner. You can also use the install icon in the browser address bar (usually a monitor with a down arrow). Confirm Install — the app opens in its own window and appears in your Start menu, taskbar, or Applications folder.',
    'Android phone or tablet (Chrome): sign in, then tap Install on the banner in Settings, or open the browser menu (⋮) and choose Install app or Add to Home screen. Confirm — an SMS Pro icon is added to your home screen.',
    'iPhone or iPad (Safari): sign in, tap the Share button (square with an arrow), scroll down, and tap Add to Home Screen. Tap Add — open SMS Pro from your home screen for a full-screen app experience.',
    'After installation, launch SMS Pro from your home screen or desktop shortcut. The installed app opens on the sign-in page so you can get straight to work.',
    'Need help? If you do not see an install option, update your browser and make sure you are signed in. The Install App button also appears in Settings under your account preferences.',
  ],
}

export const PWA_INSTALL_TIP =
  'Install SMS Pro from Settings for quick access — it works on desktop (Chrome/Edge) and mobile (Add to Home Screen).'

function withSharedManualSections(manual) {
  if (!manual) return manual

  const sectionNumber = manual.sections.length + 1
  return {
    ...manual,
    sections: [
      ...manual.sections,
      {
        title: `${sectionNumber}. ${PWA_INSTALL_SECTION.title}`,
        steps: PWA_INSTALL_SECTION.steps,
      },
    ],
    tips: [...(manual.tips || []), PWA_INSTALL_TIP],
  }
}

/**
 * Step-by-step guides per role — kept short for on-screen reading and PDF export.
 */
export const USER_MANUALS = {
  'super-admin': {
    role: 'super-admin',
    title: 'Super Admin Guide',
    subtitle: 'Platform oversight, approvals, and school operations',
    intro:
      'You manage the whole SMS Pro platform: approve new users, monitor subscriptions, and jump into any school when needed.',
    sections: [
      {
        title: '1. Start your day',
        steps: [
          'Open Home to see platform stats and anything waiting for approval.',
          'Check Sign-ins if you need an audit of who logged in and when.',
          'Open All users to approve, edit, or remove accounts.',
        ],
      },
      {
        title: '2. Approve new users',
        steps: [
          'Go to All users — pending accounts show a warning badge.',
          'Review who created the user and their role (Coordinator, Accounts, etc.).',
          'Click Approve so they can sign in, or Reject with a note to the admin.',
          'After approval, the admin can fine-tune Create / Edit / Delete permissions.',
        ],
      },
      {
        title: '3. Support school admins',
        steps: [
          'Open My School for cohorts, students, courses, and payments.',
          'Extend an admin subscription from the user edit modal when billing is updated.',
          'Use Settings → Full system backup to export or restore platform data (ZIP).',
        ],
      },
      {
        title: '4. Permissions & roles',
        steps: [
          'Each team role has a default access level — admins can override any combination.',
          'Coordinators, Accounts, and Procurement should have an operating district set.',
          'Teachers and Parents are usually view-only until an admin grants more access.',
        ],
      },
    ],
    tips: [
      'Use Analytics for a quick picture of activity across the platform.',
      'Download this guide as PDF and share it with new super admins on your team.',
    ],
  },
  admin: {
    role: 'admin',
    title: 'School Admin Guide',
    subtitle: 'Run your school — team, catalog, students, and payments',
    intro:
      'You own your school catalog and team. Daily work lives under My School; Home gives you a snapshot of collections and team performance.',
    sections: [
      {
        title: '1. Set up your team',
        steps: [
          'Open Team → Add Team Member.',
          'Pick a role: Coordinator (field work), Accounts (payments), Procurement (equipment/certs), Teacher (view-only), or Parent.',
          'Set the operating district for field roles — you will see it on Home and My School.',
          'New members need super-admin approval before they can sign in.',
          'After approval, edit the user and tick Allow create, edit, or delete as needed.',
        ],
      },
      {
        title: '2. Build your catalog',
        steps: [
          'Go to My School → Cohorts → Add Cohort for each intake (e.g. January 2026).',
          'Add courses to the cohort with fees and duration.',
          'Team members use this shared catalog — they do not duplicate programmes.',
        ],
      },
      {
        title: '3. Students & payments',
        steps: [
          'Open a cohort workspace → Students tab → Add student.',
          'Assign the student to a coordinator on your team.',
          'Record payments from Actions → Record payment, or use Payment Audit for all fees.',
          'Green badges mean fully paid; eligible students can receive equipment and certificates.',
        ],
      },
      {
        title: '4. Monitor your school',
        steps: [
          'Home shows team cards with district, collections, and outstanding balances.',
          'My School filters let you search by user, payment method, or paid/pending status.',
          'Sign-ins lists who on your team logged in recently.',
          'Settings → Full system backup exports your school data as a ZIP of CSV files.',
        ],
      },
    ],
    tips: [
      'Use the Start here guide on Home until your team is fully onboarded.',
      'Keep coordinator districts up to date so you know where each person operates.',
    ],
  },
  student: {
    role: 'student',
    title: 'Coordinator Guide',
    subtitle: 'Your workspace — students and fees in your district',
    intro:
      'You register students, record payments, and track balances for intakes assigned to you. Set your district in Profile so admins know where you work.',
    sections: [
      {
        title: '1. Complete your profile',
        steps: [
          'Open Profile → set your full name, phone, and operating district.',
          'Upload a photo if your school asks for one.',
          'Check Subscription if your school requires an active plan on your account.',
        ],
      },
      {
        title: '2. Open your workspace',
        steps: [
          'My workspace is your home screen — overview, cohorts, and payments.',
          'Pick a cohort card to see students inside that intake.',
          'Use search and filters to find a student quickly.',
        ],
      },
      {
        title: '3. Add & manage students',
        steps: [
          'Inside a cohort → add student with course from the admin catalog.',
          'Fill registration fee, boarding fee, and initial payment if paid at signup.',
          'Use Actions on a student card → Record payment when they pay later.',
          'View details for a full fee breakdown and payment history.',
        ],
      },
      {
        title: '4. Understand your access',
        steps: [
          'Your admin controls whether you can create, edit, or delete records.',
          'If buttons are missing, ask them to update permissions in Team and save.',
          'Sign out and back in after permission changes if the screen does not refresh.',
        ],
      },
    ],
    tips: [
      'Amber cards mean balance due; green means fully paid.',
      'You cannot create new courses or cohorts — ask your admin to add them to the catalog.',
    ],
  },
  accounts: {
    role: 'accounts',
    title: 'Accounts Guide',
    subtitle: 'Payments, balances, and payment audit',
    intro:
      'You focus on money in and money owed. Default access is edit-only on payments — your admin can grant create or delete if needed.',
    sections: [
      {
        title: '1. Before you start',
        steps: [
          'Set your operating district in Profile if your school uses districts.',
          'Open My School from the sidebar — this is your finance workspace.',
          'Read the banner at the top — it summarises what Accounts can do here.',
        ],
      },
      {
        title: '2. Payment audit',
        steps: [
          'Click Payment Audit in the action bar to see every transaction.',
          'Filter by team member, method, or paid/pending on the overview filters.',
          'Use this list to reconcile cash, bank, and mobile money collections.',
        ],
      },
      {
        title: '3. Record & correct payments',
        steps: [
          'Open a cohort → find the student → Actions → Record payment.',
          'Enter amount, method, and reference number for traceability.',
          'If you only have edit access, update existing payment records — ask admin for create if you need new entries.',
        ],
      },
      {
        title: '4. Follow up on balances',
        steps: [
          'Overview shows total collected vs outstanding for your team.',
          'Students with a balance appear in amber; fully paid appear in green.',
          'Export PDF reports when your admin enables export actions on your account.',
        ],
      },
    ],
    tips: [
      'You see data for your whole admin team — use the user filter to focus on one coordinator.',
      'Always match reference numbers to bank or mobile money slips.',
    ],
  },
  procurement: {
    role: 'procurement',
    title: 'Procurement Guide',
    subtitle: 'Equipment and certificates for eligible students',
    intro:
      'You track kit and certificate handouts when students are fully paid and their cohort is complete. Your admin sets how much you can create or edit.',
    sections: [
      {
        title: '1. Know who is eligible',
        steps: [
          'Set your district in Profile if required by your school.',
          'Open My School and drill into a cohort workspace.',
          'Look for the eligibility badge: fully paid + cohort complete = ready for equipment and certificates.',
        ],
      },
      {
        title: '2. Update student records',
        steps: [
          'Open student details from the student card.',
          'Add notes or update fields your school uses to track handouts.',
          'Use Actions → edit when your admin has granted edit access.',
        ],
      },
      {
        title: '3. Work with coordinators',
        steps: [
          'Coordinators register students in the field — you confirm readiness before issuing items.',
          'Use the user filter to see students under a specific coordinator.',
          'Report shortages or delays to your school admin in Team chat or your usual channel.',
        ],
      },
      {
        title: '4. Permissions',
        steps: [
          'Default access: create and edit student records, no delete.',
          'If you cannot change a record, ask your admin to adjust permissions in Team.',
          'Refresh the page after permission updates.',
        ],
      },
    ],
    tips: [
      'Do not issue certificates until payment and cohort completion rules are met.',
      'Keep a paper sign-off sheet that matches what you enter in SMS Pro.',
    ],
  },
  teacher: {
    role: 'teacher',
    title: 'Teacher Guide',
    subtitle: 'View school progress — read-only access',
    intro:
      'You can browse cohorts, students, and payment status but cannot change records unless your admin grants extra permissions.',
    sections: [
      {
        title: '1. Open My School',
        steps: [
          'Use the sidebar link My School — this opens the shared school dashboard.',
          'Browse Overview for totals and charts.',
          'Switch to Cohorts to open an intake workspace.',
        ],
      },
      {
        title: '2. Review students',
        steps: [
          'Inside a cohort, see each student’s course, paid amount, and balance.',
          'Green status = fully paid; amber = balance still due.',
          'Use search to find a student by name or phone.',
        ],
      },
      {
        title: '3. What you cannot do by default',
        steps: [
          'You cannot add cohorts, courses, or students unless your admin enables create.',
          'You cannot record payments unless given edit access.',
          'Contact your admin in Team if you need more access.',
        ],
      },
      {
        title: '4. Stay informed',
        steps: [
          'Check Analytics for trends if your school enables it.',
          'Update Profile with your name and phone so admins can reach you.',
        ],
      },
    ],
    tips: [
      'Teachers share one catalog with the whole school — programmes are managed by the admin.',
      'Download this PDF and keep it handy for training sessions.',
    ],
  },
  parent: {
    role: 'parent',
    title: 'Parent Guide',
    subtitle: 'View linked student information',
    intro:
      'Your account lets you see student progress and fees when your school links you to a student record and grants access.',
    sections: [
      {
        title: '1. Sign in',
        steps: [
          'Use the email and password your school gave you.',
          'If login fails, ask the school admin to confirm you are approved and active.',
        ],
      },
      {
        title: '2. View student data',
        steps: [
          'Open My workspace or the view your admin configured.',
          'See payment status, balance, and cohort information for linked students.',
          'You usually have view-only access — you cannot edit records yourself.',
        ],
      },
      {
        title: '3. Payments',
        steps: [
          'Pay fees through your school’s normal channels (bank, mobile money, cash).',
          'Give the receipt reference to the coordinator or accounts officer to record in SMS Pro.',
          'Check back after payment is recorded — the balance should go down.',
        ],
      },
      {
        title: '4. Account & help',
        steps: [
          'Update your name and phone in Profile.',
          'Use Settings for appearance and notification preferences.',
          'Contact your school admin for permission or linking issues.',
        ],
      },
    ],
    tips: [
      'Keep your phone number correct so the school can reach you about fees.',
      'Subscription may apply — follow prompts on the Subscription page if shown.',
    ],
  },
}

export const MANUAL_ROLE_OPTIONS = Object.keys(USER_MANUALS).map((role) => ({
  value: role,
  label: getRoleLabel(role),
}))

/** Which role guides the signed-in user may view (and pick in the dropdown). */
export function getManualRolesForViewer(viewerRole) {
  const allRoles = Object.keys(USER_MANUALS)

  if (viewerRole === 'super-admin') {
    return MANUAL_ROLE_OPTIONS
  }

  if (viewerRole === 'admin') {
    return MANUAL_ROLE_OPTIONS.filter((opt) => opt.value !== 'super-admin')
  }

  const ownRole = viewerRole && USER_MANUALS[viewerRole] ? viewerRole : 'student'
  return MANUAL_ROLE_OPTIONS.filter((opt) => opt.value === ownRole)
}

export function canViewerPickManualRole(viewerRole) {
  return getManualRolesForViewer(viewerRole).length > 1
}

export function getDefaultManualViewRole(viewerRole) {
  if (viewerRole === 'super-admin') return 'super-admin'
  if (viewerRole === 'admin') return 'admin'
  return USER_MANUALS[viewerRole] ? viewerRole : 'student'
}

export function getUserManual(role) {
  return withSharedManualSections(USER_MANUALS[role] || USER_MANUALS.student)
}

export function getUserManualForViewer(viewerRole, selectedRole) {
  const allowed = getManualRolesForViewer(viewerRole).map((o) => o.value)
  const role = allowed.includes(selectedRole) ? selectedRole : getDefaultManualViewRole(viewerRole)
  return getUserManual(role)
}
