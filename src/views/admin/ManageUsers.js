import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { matchesSearchQuery } from '../../utils/search'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CAlert,
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilUserPlus,
  cilPencil,
  cilTrash,
  cilSearch,
  cilPeople,
  cilCheckCircle,
  cilXCircle,
  cilArrowRight,
  cilShieldAlt,
  cilLockUnlocked,
} from '@coreui/icons'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  deleteField,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { secondaryAuth } from '../../firebase/secondaryAuth'
import { toJsDate, isSubscriptionActive } from '../../utils/subscription'
import {
  APPROVAL,
  approvalLabel,
  isUserApproved,
  getUserPermissions,
  permissionsFromForm,
  permissionsSummary,
  DEFAULT_PERMISSIONS,
} from '../../utils/permissions'
import { notifyUser, notifyUsers, NOTIFICATION_TYPES } from '../../utils/notifications'
import { transferUserData } from '../../utils/transferUserData'
import { MALAWI_DISTRICTS } from '../../constants/districts'
import {
  TEAM_ROLES_CREATABLE,
  ELEVATED_ROLES,
  getRoleLabel,
  getRoleBadgeColor,
  getRolePurpose,
  getDefaultPermissionsForRole,
  roleUsesDistrict,
} from '../../constants/roles'

const roleBadgeColor = getRoleBadgeColor
const roleLabel = getRoleLabel

const formatSubDate = (date) => {
  const d = toJsDate(date)
  if (!d || isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const emptyCreateForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'student',
  district: '',
}

const ManageUsers = () => {
  const navigate = useNavigate()
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showFire, setShowFire] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState({})
  const [transferTargetId, setTransferTargetId] = useState('')
  const [viewMode, setViewMode] = useState('table')

  const isSuperAdmin = currentAdmin?.role === 'super-admin'
  const isAdmin = currentAdmin?.role === 'admin'

  const loadUsers = useCallback(async (adminProfile) => {
    try {
      setLoading(true)
      if (adminProfile.role === 'super-admin') {
        const snapshot = await getDocs(collection(db, 'users'))
        setUsers(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            subscriptionenddate: toJsDate(d.data().subscriptionenddate),
          })),
        )
        return
      }

      const managedIds = adminProfile.managedUserIds || []
      const list = [{ id: adminProfile.id, ...adminProfile, isSelf: true }]

      for (const uid of managedIds) {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          list.push({
            id: snap.id,
            ...snap.data(),
            subscriptionenddate: toJsDate(snap.data().subscriptionenddate),
          })
        }
      }
      setUsers(list)
    } catch (err) {
      setError('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/login')
        return
      }

      const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (!snap.exists()) {
        navigate('/login')
        return
      }

      const data = snap.data()
      if (!['admin', 'super-admin'].includes(data.role)) {
        navigate('/dashboard')
        return
      }

      const profile = { id: firebaseUser.uid, ...data }
      setCurrentAdmin(profile)
      await loadUsers(profile)
    })

    return unsub
  }, [navigate, loadUsers])

  const pendingUsers = useMemo(
    () => (isSuperAdmin ? users.filter((u) => u.approvalStatus === APPROVAL.PENDING) : []),
    [users, isSuperAdmin],
  )

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      matchesSearchQuery(search, u.fullName, u.email, u.role, u.phone, u.district, getRoleLabel(u.role)),
    )
  }, [users, search])

  const teamMembersForTransfer = useMemo(() => {
    if (!selectedUser) return []
    return users.filter((u) => !u.isSelf && u.id !== selectedUser.id && isUserApproved(u))
  }, [users, selectedUser])

  const stats = useMemo(() => {
    const team = users.filter((u) => !u.isSelf)
    return {
      total: isSuperAdmin ? users.length : team.length,
      active: (isSuperAdmin ? users : team).filter((u) => u.active !== false && isUserApproved(u)).length,
      pending: (isSuperAdmin ? users : team).filter((u) => u.approvalStatus === APPROVAL.PENDING).length,
      withPermissions: team.filter((u) => {
        const p = getUserPermissions(u)
        return p.create || p.edit || p.delete
      }).length,
      admins: isSuperAdmin ? users.filter((u) => u.role === 'admin').length : 0,
    }
  }, [users, isSuperAdmin])

  const getSuperAdminIds = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'super-admin')))
    return snap.docs.map((d) => d.id)
  }

  const openEdit = (user) => {
    setSelectedUser(user)
    const perms = getUserPermissions(user)
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'student',
      district: user.district || '',
      active: user.active !== false,
      create: perms.create,
      edit: perms.edit,
      delete: perms.delete,
      subscriptionenddate: user.subscriptionenddate
        ? user.subscriptionenddate.toISOString().split('T')[0]
        : '',
    })
    setShowEdit(true)
  }

  const handleCreateUser = async () => {
    setError('')
    setSuccess('')
    setActionLoading(true)

    try {
      if (!createForm.fullName || !createForm.email || !createForm.password) {
        throw new Error('Name, email, and password are required.')
      }
      if (createForm.password.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }
      if (roleUsesDistrict(createForm.role) && !createForm.district) {
        throw new Error('Operating district is required for this role.')
      }

      const defaultPerms = getDefaultPermissionsForRole(createForm.role)

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        createForm.email.trim(),
        createForm.password,
      )

      const needsApproval = isAdmin
      const newUser = {
        email: createForm.email.trim(),
        fullName: createForm.fullName.trim(),
        phone: createForm.phone || null,
        district: roleUsesDistrict(createForm.role) ? createForm.district : null,
        role: createForm.role,
        roleID: createForm.role,
        active: true,
        createdAt: new Date(),
        createdBy: currentAdmin.id,
        managedBy: currentAdmin.id,
        lastLogin: null,
        hasUsedTrial: false,
        permissions: { ...defaultPerms },
        canWrite: defaultPerms.create || defaultPerms.edit || defaultPerms.delete,
        approvalStatus: needsApproval ? APPROVAL.PENDING : APPROVAL.APPROVED,
      }

      await setDoc(doc(db, 'users', cred.user.uid), newUser)

      if (isAdmin) {
        await updateDoc(doc(db, 'users', currentAdmin.id), {
          managedUserIds: arrayUnion(cred.user.uid),
        })
      }

      const superAdminIds = await getSuperAdminIds()
      await notifyUsers(superAdminIds, {
        type: NOTIFICATION_TYPES.USER_CREATED,
        title: 'New user awaiting approval',
        message: `${createForm.fullName} was created by ${currentAdmin.fullName} and needs your approval.`,
        actorId: currentAdmin.id,
        actorName: currentAdmin.fullName,
        metadata: { userId: cred.user.uid, createdBy: currentAdmin.id },
      })

      await notifyUser({
        recipientId: currentAdmin.id,
        type: NOTIFICATION_TYPES.USER_CREATED,
        title: needsApproval ? 'User submitted for approval' : 'User created',
        message: needsApproval
          ? `${createForm.fullName} was created and sent to super-admin for approval.`
          : `${createForm.fullName} has been added.`,
        actorId: currentAdmin.id,
        actorName: currentAdmin.fullName,
        metadata: { userId: cred.user.uid },
      })

      setSuccess(
        needsApproval
          ? `${createForm.fullName} created — pending super-admin approval.`
          : `${createForm.fullName} has been added!`,
      )
      setCreateForm(emptyCreateForm)
      setShowCreate(false)

      const refreshed = await getDoc(doc(db, 'users', currentAdmin.id))
      setCurrentAdmin({ id: currentAdmin.id, ...refreshed.data() })
      await loadUsers({ id: currentAdmin.id, ...refreshed.data() })
    } catch (err) {
      setError(err.message || 'Failed to create user.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async (user, approved) => {
    setActionLoading(true)
    setError('')
    try {
      await updateDoc(doc(db, 'users', user.id), {
        approvalStatus: approved ? APPROVAL.APPROVED : APPROVAL.REJECTED,
        approvedBy: currentAdmin.id,
        approvedAt: new Date().toISOString(),
        active: approved,
        ...(approved && !user.permissions
          ? (() => {
              const perms = getDefaultPermissionsForRole(user.role)
              return {
                permissions: { ...perms },
                canWrite: perms.create || perms.edit || perms.delete,
              }
            })()
          : {}),
      })

      const creatorId = user.createdBy || user.managedBy
      if (creatorId) {
        await notifyUser({
          recipientId: creatorId,
          type: approved ? NOTIFICATION_TYPES.USER_APPROVED : NOTIFICATION_TYPES.USER_REJECTED,
          title: approved ? 'User approved' : 'User rejected',
          message: approved
            ? `${user.fullName} has been approved and can now access the system.`
            : `${user.fullName} was rejected by super-admin.`,
          actorId: currentAdmin.id,
          actorName: currentAdmin.fullName,
          metadata: { userId: user.id },
        })
      }

      await notifyUser({
        recipientId: user.id,
        type: approved ? NOTIFICATION_TYPES.USER_APPROVED : NOTIFICATION_TYPES.USER_REJECTED,
        title: approved ? 'Account approved' : 'Account rejected',
        message: approved
          ? 'Your account has been approved. You can now sign in.'
          : 'Your account request was rejected. Contact your administrator.',
        actorId: currentAdmin.id,
        actorName: currentAdmin.fullName,
      })

      setSuccess(approved ? `${user.fullName} approved.` : `${user.fullName} rejected.`)
      await loadUsers(currentAdmin)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedUser || selectedUser.isSelf) return
    setActionLoading(true)
    setError('')

    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone || null,
        active: editForm.active,
        district: roleUsesDistrict(editForm.role || selectedUser.role)
          ? editForm.district || null
          : null,
      }

      const canSetPermissions =
        (isSuperAdmin && !['admin', 'super-admin'].includes(editForm.role)) ||
        (isAdmin && !['admin', 'super-admin'].includes(selectedUser.role))

      if (canSetPermissions) {
        const perms = permissionsFromForm(editForm)
        payload.permissions = perms
        // Keep legacy canWrite in sync — deployed Firestore rules may still check this field
        payload.canWrite = perms.create || perms.edit || perms.delete
      }

      if (isSuperAdmin) {
        payload.role = editForm.role
        if (editForm.subscriptionenddate) {
          payload.subscriptionenddate = new Date(editForm.subscriptionenddate)
        }
      }

      await updateDoc(doc(db, 'users', selectedUser.id), payload)

      if (canSetPermissions) {
        const prev = getUserPermissions(selectedUser)
        const next = permissionsFromForm(editForm)
        const changed =
          prev.create !== next.create || prev.edit !== next.edit || prev.delete !== next.delete
        if (changed) {
          await notifyUser({
            recipientId: selectedUser.id,
            type: NOTIFICATION_TYPES.CRUD_TOGGLED,
            title: 'Permissions updated',
            message: `${currentAdmin.fullName} set your access to: ${permissionsSummary({ permissions: next })}.`,
            actorId: currentAdmin.id,
            actorName: currentAdmin.fullName,
            metadata: { permissions: next },
          })
        }
      }

      setSuccess('User updated successfully. They should refresh their dashboard (or sign out and back in) to see new permissions.')
      setShowEdit(false)
      await loadUsers(currentAdmin)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFireUser = async () => {
    if (!selectedUser || !isAdmin) return
    setActionLoading(true)
    setError('')

    try {
      let transferred = 0
      if (transferTargetId) {
        const targetSnap = await getDoc(doc(db, 'users', transferTargetId))
        if (!targetSnap.exists()) throw new Error('Transfer target not found.')
        transferred = await transferUserData(selectedUser.id, transferTargetId, targetSnap.data())

        await notifyUser({
          recipientId: transferTargetId,
          type: NOTIFICATION_TYPES.DATA_TRANSFERRED,
          title: 'Data transferred to your account',
          message: `${transferred} records from ${selectedUser.fullName} were moved to your account by ${currentAdmin.fullName}.`,
          actorId: currentAdmin.id,
          actorName: currentAdmin.fullName,
          metadata: { fromUserId: selectedUser.id, count: transferred },
        })
      }

      await updateDoc(doc(db, 'users', currentAdmin.id), {
        managedUserIds: arrayRemove(selectedUser.id),
      })

      await updateDoc(doc(db, 'users', selectedUser.id), {
        managedBy: null,
        permissions: { ...DEFAULT_PERMISSIONS },
        canWrite: false,
        active: false,
      })

      await notifyUser({
        recipientId: selectedUser.id,
        type: NOTIFICATION_TYPES.USER_FIRED,
        title: 'Removed from team',
        message: `${currentAdmin.fullName} removed you from their team.${
          transferred ? ` Your ${transferred} records were transferred.` : ''
        }`,
        actorId: currentAdmin.id,
        actorName: currentAdmin.fullName,
      })

      setSuccess(
        transferred
          ? `${selectedUser.fullName} removed. ${transferred} records transferred.`
          : `${selectedUser.fullName} removed from your team.`,
      )
      setShowFire(false)
      setTransferTargetId('')

      const refreshed = await getDoc(doc(db, 'users', currentAdmin.id))
      setCurrentAdmin({ id: currentAdmin.id, ...refreshed.data() })
      await loadUsers({ id: currentAdmin.id, ...refreshed.data() })
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddExistingByEmail = async (email) => {
    setActionLoading(true)
    setError('')

    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim()))
      const snapshot = await getDocs(q)
      if (snapshot.empty) throw new Error('No user found with that email.')

      const found = snapshot.docs[0]
      if (found.id === currentAdmin.id) throw new Error('You cannot add yourself.')

      const foundData = found.data()
      if (foundData.approvalStatus === APPROVAL.PENDING) {
        throw new Error('This user is still pending super-admin approval.')
      }

      await updateDoc(doc(db, 'users', currentAdmin.id), {
        managedUserIds: arrayUnion(found.id),
      })

      await updateDoc(doc(db, 'users', found.id), {
        managedBy: currentAdmin.id,
        ...(!foundData.permissions
          ? (() => {
              const perms = getDefaultPermissionsForRole(foundData.role)
              return {
                permissions: { ...perms },
                canWrite: perms.create || perms.edit || perms.delete,
              }
            })()
          : foundData.permissions?.create && !foundData.canWrite
            ? { canWrite: true }
            : {}),
      })

      setSuccess(`${foundData.fullName || email} added to your team.`)
      const refreshed = await getDoc(doc(db, 'users', currentAdmin.id))
      setCurrentAdmin({ id: currentAdmin.id, ...refreshed.data() })
      await loadUsers({ id: currentAdmin.id, ...refreshed.data() })
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !currentAdmin) {
    return (
      <div className="sms-page-loading">
        <CSpinner color="primary" />
        <p className="mt-3 text-muted">Loading your team...</p>
      </div>
    )
  }

  return (
    <div className="sms-manage-users">
      <div className="sms-page-hero mb-4">
        <div>
          <h1 className="sms-page-title mb-1">
            {isSuperAdmin ? 'User Management' : 'My Team'}
          </h1>
          <p className="sms-page-subtitle mb-0">
            {isSuperAdmin
              ? 'Approve users, manage subscriptions, and control CRUD access platform-wide'
              : 'Create team members (super-admin approval required), assign edit access, and manage your school'}
          </p>
        </div>
        <CButton color="primary" className="sms-btn-glow" onClick={() => setShowCreate(true)}>
          <CIcon icon={cilUserPlus} className="me-2" />
          Add New User
        </CButton>
      </div>

      {(error || success) && (
        <div className="sms-toast-stack mb-4">
          {error && (
            <div className="sms-toast sms-toast--error" role="alert">
              <span>{error}</span>
              <button type="button" className="sms-toast-close" onClick={() => setError('')} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
          {success && (
            <div className="sms-toast sms-toast--success" role="alert">
              <span>{success}</span>
              <button type="button" className="sms-toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {isSuperAdmin && pendingUsers.length > 0 && (
        <CCard className="sms-settings-card mb-4 border-warning">
          <CCardBody>
            <h5 className="fw-bold mb-3">
              <CIcon icon={cilShieldAlt} className="me-2 text-warning" />
              Pending Approvals ({pendingUsers.length})
            </h5>
            <CRow className="g-2">
              {pendingUsers.map((u) => (
                <CCol md={6} key={u.id}>
                  <div className="sms-setting-row mb-0">
                    <div>
                      <strong>{u.fullName}</strong>
                      <div className="small text-muted">
                        {u.email} · {roleLabel(u.role)}
                        {u.district ? ` · ${u.district}` : ''} · by {u.createdBy ? 'admin' : 'system'}
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <CButton
                        size="sm"
                        color="success"
                        onClick={() => handleApprove(u, true)}
                        disabled={actionLoading}
                      >
                        Approve
                      </CButton>
                      <CButton
                        size="sm"
                        color="danger"
                        variant="outline"
                        onClick={() => handleApprove(u, false)}
                        disabled={actionLoading}
                      >
                        Reject
                      </CButton>
                    </div>
                  </div>
                </CCol>
              ))}
            </CRow>
          </CCardBody>
        </CCard>
      )}

      <CRow className="g-3 mb-4">
        {(isSuperAdmin
          ? [
              { label: 'Total Users', value: stats.total, icon: cilPeople, tone: 'purple' },
              { label: 'Active', value: stats.active, icon: cilCheckCircle, tone: 'green' },
              { label: 'Pending', value: stats.pending, icon: cilShieldAlt, tone: 'orange' },
              { label: 'Admins', value: stats.admins, icon: cilUser, tone: 'blue' },
            ]
          : [
              { label: 'Team Members', value: stats.total, icon: cilPeople, tone: 'purple' },
              { label: 'Active', value: stats.active, icon: cilCheckCircle, tone: 'green' },
              { label: 'Pending', value: stats.pending, icon: cilShieldAlt, tone: 'orange' },
              { label: 'With Permissions', value: stats.withPermissions, icon: cilLockUnlocked, tone: 'blue' },
            ]
        ).map((s) => (
          <CCol sm={6} md={3} key={s.label}>
            <div className={`sms-kpi-card sms-kpi-${s.tone} border-0 h-100`}>
              <div className="d-flex align-items-center gap-3 p-3">
                <div className="sms-kpi-icon-wrap">
                  <CIcon icon={s.icon} size="lg" />
                </div>
                <div>
                  <div className="sms-kpi-label">{s.label}</div>
                  <div className="sms-kpi-value">{s.value}</div>
                </div>
              </div>
            </div>
          </CCol>
        ))}
      </CRow>

      <CCard className="sms-glass-card sms-manage-toolbar border-0 mb-4">
        <CCardBody>
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="sms-search flex-grow-1" style={{ maxWidth: 420 }}>
              <CIcon icon={cilSearch} className="sms-search-icon" />
              <CFormInput
                placeholder="Search name, email, role… (any word order)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sms-search-input"
              />
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {isSuperAdmin && (
                <div className="sms-view-toggle btn-group" role="group">
                  <CButton
                    size="sm"
                    color={viewMode === 'table' ? 'primary' : 'secondary'}
                    variant={viewMode === 'table' ? undefined : 'outline'}
                    onClick={() => setViewMode('table')}
                  >
                    Table
                  </CButton>
                  <CButton
                    size="sm"
                    color={viewMode === 'cards' ? 'primary' : 'secondary'}
                    variant={viewMode === 'cards' ? undefined : 'outline'}
                    onClick={() => setViewMode('cards')}
                  >
                    Cards
                  </CButton>
                </div>
              )}
              {isAdmin && (
                <AddExistingUser onAdd={handleAddExistingByEmail} loading={actionLoading} />
              )}
            </div>
          </div>
        </CCardBody>
      </CCard>

      {loading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
          <p className="text-muted mt-3 mb-0">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <CCard className="sms-glass-card border-0">
          <CCardBody className="text-center py-5 text-muted">No users match your search.</CCardBody>
        </CCard>
      ) : isSuperAdmin && viewMode === 'table' ? (
        <CCard className="sms-users-table-card border-0">
          <CCardBody className="p-0">
            <div className="table-responsive">
              <CTable hover align="middle" className="sms-users-table mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>District</CTableHeaderCell>
                    <CTableHeaderCell>Access</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Subscription</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredUsers.map((u) => {
                    const approval = approvalLabel(u.approvalStatus || APPROVAL.APPROVED)
                    const perms = permissionsSummary(u)
                    return (
                      <CTableRow key={u.id} className={u.active === false ? 'sms-users-row--inactive' : ''}>
                        <CTableDataCell>
                          <div className="d-flex align-items-center gap-3">
                            <div className="sms-user-avatar sms-user-avatar--sm">
                              {(u.fullName || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold">{u.fullName || 'Unnamed'}</div>
                              <div className="small text-muted">{u.email}</div>
                              {u.phone && <div className="small text-muted">{u.phone}</div>}
                            </div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <span className={`sms-role-pill sms-role-pill--${(u.role || 'student').replace(/-/g, '')}`}>
                            {roleLabel(u.role)}
                          </span>
                        </CTableDataCell>
                        <CTableDataCell>
                          {u.district ? (
                            <span className="sms-district-pill">{u.district}</span>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {!['admin', 'super-admin'].includes(u.role) ? (
                            <span className="sms-access-pill">{perms}</span>
                          ) : (
                            <span className="sms-access-pill sms-access-pill--full">Full access</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <span className={`sms-status-pill ${u.active !== false ? 'is-active' : 'is-inactive'}`}>
                            {u.active !== false ? 'Active' : 'Inactive'}
                          </span>
                          {u.approvalStatus && u.approvalStatus !== APPROVAL.APPROVED && (
                            <span className={`sms-status-pill ms-1 is-${approval.color}`}>{approval.text}</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <span className="small">{formatSubDate(u.subscriptionenddate)}</span>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <div className="sms-row-actions">
                            {!u.isSelf && (
                              <>
                                <CButton
                                  size="sm"
                                  className="sms-action-btn sms-action-btn--edit"
                                  onClick={() => openEdit(u)}
                                  title="Edit user"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton
                                  size="sm"
                                  className="sms-action-btn sms-action-btn--view"
                                  onClick={() => navigate('/admin/overview', { state: { focusUserId: u.id } })}
                                  title="View data"
                                >
                                  <CIcon icon={cilArrowRight} />
                                </CButton>
                                {u.role !== 'super-admin' && (
                                  <CButton
                                    size="sm"
                                    className="sms-action-btn sms-action-btn--delete"
                                    title="Delete user"
                                    disabled={actionLoading}
                                    onClick={async () => {
                                      if (!window.confirm(`Delete ${u.fullName || u.email}?`)) return
                                      setActionLoading(true)
                                      try {
                                        await deleteDoc(doc(db, 'users', u.id))
                                        setSuccess('User removed.')
                                        await loadUsers(currentAdmin)
                                      } catch (err) {
                                        setError(err.message)
                                      } finally {
                                        setActionLoading(false)
                                      }
                                    }}
                                  >
                                    <CIcon icon={cilTrash} />
                                  </CButton>
                                )}
                              </>
                            )}
                            {u.isSelf && <span className="sms-you-badge">You</span>}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>
          </CCardBody>
        </CCard>
      ) : (
        <CRow className="g-3">
          {filteredUsers.map((u) => {
            const approval = approvalLabel(u.approvalStatus || APPROVAL.APPROVED)
            return (
              <CCol md={6} xl={4} key={u.id}>
                <CCard className={`sms-user-card border-0 h-100 ${u.isSelf ? 'sms-user-card-self' : ''}`}>
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="sms-user-avatar">
                        {(u.fullName || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="d-flex gap-1 flex-wrap justify-content-end">
                        {u.isSelf && <CBadge color="dark">You</CBadge>}
                        <CBadge color={roleBadgeColor(u.role)}>{roleLabel(u.role)}</CBadge>
                        {u.district && (
                          <CBadge color="light" className="text-dark border">
                            {u.district}
                          </CBadge>
                        )}
                        {u.approvalStatus && u.approvalStatus !== APPROVAL.APPROVED && (
                          <CBadge color={approval.color}>{approval.text}</CBadge>
                        )}
                        {!['admin', 'super-admin'].includes(u.role) && (
                          <CBadge color={permissionsSummary(u) === 'View only' ? 'secondary' : 'info'}>
                            {permissionsSummary(u)}
                          </CBadge>
                        )}
                      </div>
                    </div>

                    <h5 className="mb-1">{u.fullName || 'Unnamed'}</h5>
                    <p className="text-muted small mb-2">{u.email}</p>

                    {!u.isSelf && u.role === 'admin' && (
                      <div className="sms-user-meta mb-2">
                        {isSubscriptionActive(u.subscriptionenddate) ? (
                          <span className="text-success small">
                            <CIcon icon={cilCheckCircle} className="me-1" />
                            Subscribed (self-managed)
                          </span>
                        ) : (
                          <span className="text-warning small">
                            <CIcon icon={cilXCircle} className="me-1" />
                            Admin must subscribe
                          </span>
                        )}
                      </div>
                    )}

                    {!u.isSelf && (
                      <div className="d-flex gap-2 flex-wrap">
                        <CButton size="sm" color="primary" variant="outline" onClick={() => openEdit(u)}>
                          <CIcon icon={cilPencil} className="me-1" />
                          Edit
                        </CButton>
                        <CButton
                          size="sm"
                          color="info"
                          variant="ghost"
                          onClick={() => navigate('/admin/overview', { state: { focusUserId: u.id } })}
                        >
                          View Data
                          <CIcon icon={cilArrowRight} className="ms-1" />
                        </CButton>
                        {isAdmin && (
                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(u)
                              setTransferTargetId('')
                              setShowFire(true)
                            }}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        )}
                        {isSuperAdmin && u.role !== 'super-admin' && (
                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            onClick={async () => {
                              setActionLoading(true)
                              try {
                                await deleteDoc(doc(db, 'users', u.id))
                                setSuccess('User profile deleted.')
                                await loadUsers(currentAdmin)
                              } catch (err) {
                                setError(err.message)
                              } finally {
                                setActionLoading(false)
                              }
                            }}
                          >
                            Delete
                          </CButton>
                        )}
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            )
          })}
        </CRow>
      )}

      {/* Create User Modal */}
      <CModal visible={showCreate} onClose={() => setShowCreate(false)} alignment="center" size="lg">
        <CModalHeader>
          <CModalTitle>Add Team Member</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isAdmin && (
            <CAlert color="info" className="small">
              New users require <strong>super-admin approval</strong> before they can sign in. Permissions
              are off by default — grant create, edit, or delete after approval.
            </CAlert>
          )}
          <CRow className="g-3">
            <CCol md={6}>
              <label className="form-label">Full Name</label>
              <CFormInput
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              />
            </CCol>
            <CCol md={6}>
              <label className="form-label">Email</label>
              <CFormInput
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </CCol>
            <CCol md={6}>
              <label className="form-label">Phone</label>
              <CFormInput
                placeholder="+26599XXXXXX"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </CCol>
            <CCol md={6}>
              <label className="form-label">Role</label>
              <CFormSelect
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value,
                    district: roleUsesDistrict(e.target.value) ? createForm.district : '',
                  })
                }
              >
                {TEAM_ROLES_CREATABLE.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </CFormSelect>
              <small className="text-muted d-block mt-1">{getRolePurpose(createForm.role)}</small>
            </CCol>
            {roleUsesDistrict(createForm.role) && (
              <CCol md={6}>
                <label className="form-label">Operating district *</label>
                <CFormSelect
                  value={createForm.district}
                  onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                >
                  <option value="">Select district</option>
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}
            <CCol md={12}>
              <label className="form-label">Temporary Password</label>
              <CFormInput
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowCreate(false)}>
            Cancel
          </CButton>
          <CButton color="primary" className="sms-btn-glow" onClick={handleCreateUser} disabled={actionLoading}>
            {actionLoading ? 'Creating...' : 'Create User'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Modal */}
      <CModal visible={showEdit} onClose={() => setShowEdit(false)} alignment="center" className="sms-user-modal">
        <CModalHeader className="sms-user-modal-header">
          <CModalTitle>Edit {editForm.fullName}</CModalTitle>
        </CModalHeader>
        <CModalBody className="sms-user-modal-body">
          <CRow className="g-3">
            <CCol md={12}>
              <label className="form-label">Full Name</label>
              <CFormInput
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </CCol>
            <CCol md={6}>
              <label className="form-label">Phone</label>
              <CFormInput
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </CCol>
            {isSuperAdmin && (
              <CCol md={6}>
                <label className="form-label">Role</label>
                <CFormSelect
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value,
                      district: roleUsesDistrict(e.target.value) ? editForm.district : '',
                    })
                  }
                >
                  {[...TEAM_ROLES_CREATABLE, ...ELEVATED_ROLES.filter((r) => r.value === 'admin')].map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-muted d-block mt-1">{getRolePurpose(editForm.role)}</small>
              </CCol>
            )}
            {roleUsesDistrict(editForm.role || selectedUser?.role) && (
              <CCol md={6}>
                <label className="form-label">Operating district</label>
                <CFormSelect
                  value={editForm.district || ''}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                >
                  <option value="">Select district</option>
                  {MALAWI_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}
            {isSuperAdmin && (
              <CCol md={6}>
                <label className="form-label">Subscription End (super-admin only)</label>
                <CFormInput
                  type="date"
                  value={editForm.subscriptionenddate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, subscriptionenddate: e.target.value })
                  }
                />
                <small className="text-muted">Only super-admin can extend subscriptions.</small>
              </CCol>
            )}
            {(isSuperAdmin || isAdmin) &&
              selectedUser &&
              !['admin', 'super-admin'].includes(selectedUser.role) && (
                <CCol md={12}>
                  <label className="form-label d-block mb-2">Data permissions</label>
                  <div className="d-flex flex-wrap gap-4">
                    <CFormCheck
                      id="perm-create"
                      label="Allow create"
                      checked={editForm.create}
                      onChange={(e) => setEditForm({ ...editForm, create: e.target.checked })}
                    />
                    <CFormCheck
                      id="perm-edit"
                      label="Allow edit"
                      checked={editForm.edit}
                      onChange={(e) => setEditForm({ ...editForm, edit: e.target.checked })}
                    />
                    <CFormCheck
                      id="perm-delete"
                      label="Allow delete"
                      checked={editForm.delete}
                      onChange={(e) => setEditForm({ ...editForm, delete: e.target.checked })}
                    />
                  </div>
                  <small className="text-muted">
                    Grant only the actions this user needs — admins and super-admins can mix create, edit, and delete freely.
                  </small>
                </CCol>
              )}
            <CCol md={12}>
              <CFormCheck
                label="Account is active"
                checked={editForm.active}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="sms-user-modal-footer">
          <CButton color="secondary" variant="ghost" onClick={() => setShowEdit(false)}>
            Cancel
          </CButton>
          <CButton color="primary" className="sms-btn-glow" onClick={handleSaveEdit} disabled={actionLoading}>
            Save Changes
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Fire / Transfer Modal */}
      <CModal visible={showFire} onClose={() => setShowFire(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>Remove Team Member</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Remove <strong>{selectedUser?.fullName}</strong> from your team?
          </p>
          <CAlert color="warning" className="small">
            To keep their school data safe, transfer records to another team member before removing.
          </CAlert>
          <label className="form-label">Transfer data to (optional)</label>
          <CFormSelect
            value={transferTargetId}
            onChange={(e) => setTransferTargetId(e.target.value)}
          >
            <option value="">Do not transfer — keep data on their account</option>
            {teamMembersForTransfer.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.role})
              </option>
            ))}
          </CFormSelect>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowFire(false)}>
            Cancel
          </CButton>
          <CButton color="danger" disabled={actionLoading} onClick={handleFireUser}>
            {actionLoading ? 'Processing...' : 'Remove from team'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

const AddExistingUser = ({ onAdd, loading }) => {
  const [email, setEmail] = useState('')
  return (
    <div className="d-flex gap-2">
      <CFormInput
        placeholder="Add existing user by email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ minWidth: 220 }}
      />
      <CButton
        color="info"
        variant="outline"
        disabled={!email.trim() || loading}
        onClick={() => {
          onAdd(email)
          setEmail('')
        }}
      >
        Link User
      </CButton>
    </div>
  )
}

export default ManageUsers
