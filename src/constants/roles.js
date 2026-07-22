import { DEFAULT_PERMISSIONS, COORDINATOR_PERMISSIONS } from '../utils/permissions'

/** Firestore role values and UI metadata */
export const TEAM_ROLES_CREATABLE = [
  {
    value: 'student',
    label: 'Coordinator',
    badge: 'success',
    purpose:
      'Runs day-to-day student intake and fee collection in an assigned district. Admins can grant create, edit, or delete access.',
    defaultPermissions: COORDINATOR_PERMISSIONS,
    usesDistrict: true,
  },
  {
    value: 'accounts',
    label: 'Accounts',
    badge: 'warning',
    purpose:
      'Focuses on payments, balances, and payment audit. Default: edit payments only — admins can grant more access.',
    defaultPermissions: { create: false, edit: true, delete: false },
    usesDistrict: true,
  },
  {
    value: 'procurement',
    label: 'Procurement',
    badge: 'dark',
    purpose:
      'Tracks equipment and certificate handouts for eligible students. Default: create and edit — admins can adjust permissions.',
    defaultPermissions: { create: true, edit: true, delete: false },
    usesDistrict: true,
  },
  {
    value: 'teacher',
    label: 'Teacher',
    badge: 'info',
    purpose: 'Read-only view of school cohorts and student progress across the catalog.',
    defaultPermissions: DEFAULT_PERMISSIONS,
    usesDistrict: false,
  },
  {
    value: 'parent',
    label: 'Parent',
    badge: 'secondary',
    purpose: 'View-only access to linked student information when granted by an admin.',
    defaultPermissions: DEFAULT_PERMISSIONS,
    usesDistrict: false,
  },
]

export const ELEVATED_ROLES = [
  { value: 'admin', label: 'Admin', badge: 'primary' },
  { value: 'super-admin', label: 'Super Admin', badge: 'danger' },
]

export const SCHOOL_DASHBOARD_ROLES = ['admin', 'super-admin', 'teacher', 'accounts', 'procurement']

export const SCHOOL_TEAM_ROLES = ['teacher', 'accounts', 'procurement']

export const PRIVILEGED_LOGIN_ROLES = ['super-admin', 'admin', 'teacher', 'accounts', 'procurement']

const ROLE_META = [...TEAM_ROLES_CREATABLE, ...ELEVATED_ROLES].reduce((acc, r) => {
  acc[r.value] = r
  return acc
}, {})

export const getRoleLabel = (role) => ROLE_META[role]?.label || role || 'User'

export const getRoleBadgeColor = (role) => ROLE_META[role]?.badge || 'light'

export const getRolePurpose = (role) => ROLE_META[role]?.purpose || ''

export const roleUsesDistrict = (role) => !!ROLE_META[role]?.usesDistrict

export const getDefaultPermissionsForRole = (role) => {
  const meta = ROLE_META[role]
  if (meta?.defaultPermissions) return { ...meta.defaultPermissions }
  return { ...DEFAULT_PERMISSIONS }
}

export const formatTeamMemberLabel = (user, { includeRole = true } = {}) => {
  if (!user) return ''
  const name = user.fullName || user.email || 'Unnamed'
  const parts = [name]
  if (user.district) parts.push(user.district)
  if (includeRole && user.role) parts.push(getRoleLabel(user.role))
  return parts.join(' · ')
}

export const getHomeRouteForRole = (role) => {
  const routes = {
    'super-admin': '/admin/control',
    admin: '/admin/control',
    teacher: '/team',
    accounts: '/team',
    procurement: '/team',
  }
  return routes[role] || '/dashboard'
}

/** Daily workspace link from Profile / Settings */
export const getWorkspaceRouteForRole = (role) => {
  const routes = {
    'super-admin': '/admin/control',
    admin: '/admin/overview',
    teacher: '/team',
    accounts: '/team',
    procurement: '/team',
  }
  return routes[role] || '/dashboard'
}
