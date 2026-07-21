/** User approval & granular CRUD permission helpers */

export const APPROVAL = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const DEFAULT_PERMISSIONS = {
  create: false,
  edit: false,
  delete: false,
}

/** Default CRUD for coordinators — create/edit/delete students & payments; catalog is admin-only */
export const COORDINATOR_PERMISSIONS = {
  create: true,
  edit: true,
  delete: true,
}

const truthy = (v) => v === true || v === 'true' || v === 1

/** Normalize permissions from profile (supports legacy canWrite) */
export const getUserPermissions = (profile) => {
  if (!profile) return { ...DEFAULT_PERMISSIONS }

  if (profile.role === 'super-admin' || profile.role === 'admin') {
    return { create: true, edit: true, delete: true }
  }

  const p = profile.permissions
  if (p && typeof p === 'object') {
    return {
      create: truthy(p.create),
      edit: truthy(p.edit),
      delete: truthy(p.delete),
    }
  }

  if (truthy(profile.canWrite)) {
    return { create: true, edit: true, delete: true }
  }

  return { ...DEFAULT_PERMISSIONS }
}

export const isUserApproved = (profile) => {
  if (!profile) return false
  if (profile.role === 'super-admin') return true
  if (profile.approvalStatus === APPROVAL.REJECTED) return false
  if (profile.approvalStatus === APPROVAL.PENDING) return false
  return (
    profile.approvalStatus === APPROVAL.APPROVED ||
    profile.approvalStatus == null ||
    profile.approvalStatus === ''
  )
}

export const canUserCreate = (profile) =>
  isUserApproved(profile) && profile.active !== false && getUserPermissions(profile).create

export const canUserEdit = (profile) =>
  isUserApproved(profile) && profile.active !== false && getUserPermissions(profile).edit

export const canUserDelete = (profile) =>
  isUserApproved(profile) && profile.active !== false && getUserPermissions(profile).delete

/** Any write capability (for showing action areas) */
export const canUserWrite = (profile) => {
  const p = getUserPermissions(profile)
  return isUserApproved(profile) && (p.create || p.edit || p.delete)
}

export const permissionsSummary = (profile) => {
  const p = getUserPermissions(profile)
  if (profile?.role === 'admin' || profile?.role === 'super-admin') return 'Full access'
  const parts = []
  if (p.create) parts.push('Create')
  if (p.edit) parts.push('Edit')
  if (p.delete) parts.push('Delete')
  return parts.length ? parts.join(' · ') : 'View only'
}

export const permissionsFromForm = (form) => ({
  create: !!form.create,
  edit: !!form.edit,
  delete: !!form.delete,
})

/** Human-readable reason why CRUD actions are blocked (for dashboard banners) */
export const permissionBlockReason = (profile) => {
  if (!profile) return null
  if (profile.active === false) {
    return 'Your account is inactive. Ask your admin to re-enable it in Manage Users.'
  }
  if (profile.approvalStatus === APPROVAL.PENDING) {
    return 'Your account is pending super-admin approval. You can view data but cannot create or edit until approved.'
  }
  if (profile.approvalStatus === APPROVAL.REJECTED) {
    return 'Your account was rejected. Contact your administrator.'
  }
  const p = getUserPermissions(profile)
  if (!p.create && !p.edit && !p.delete) {
    return 'No permissions on your account yet. Ask your admin to enable Create, Edit, or Delete in Manage Users and click Save Changes, then refresh this page.'
  }
  if (!p.create && (p.edit || p.delete)) {
    return 'You have Edit/Delete access but not Create — use existing records to edit, or ask your admin to enable Allow create.'
  }
  return null
}

export const needsOwnSubscription = (role) => role === 'admin'

export const canManageSubscriptions = (role) => role === 'super-admin'

export const canApproveUsers = (role) => role === 'super-admin'

export const approvalLabel = (status) => {
  const map = {
    pending: { text: 'Pending approval', color: 'warning' },
    approved: { text: 'Approved', color: 'success' },
    rejected: { text: 'Rejected', color: 'danger' },
  }
  return map[status] || { text: 'Approved', color: 'success' }
}
