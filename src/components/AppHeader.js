// src/components/AppHeader.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  useColorModes,
  CAvatar,
  CImage,
  CSpinner,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilContrast,
  cilMenu,
  cilMoon,
  cilSun,
  cilUser,
  cilPencil,
  cilSpeedometer,
  cilChartPie,
  cilTerminal,
  cilLibrary,
  cilSettings,
  cilAccountLogout,
} from '@coreui/icons'

import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AppBreadcrumb } from './index'
import { useNotifications } from '../hooks/useNotifications'
import { useBrowserPush } from '../hooks/useBrowserPush'
import { useProfilePhoto } from '../hooks/useProfilePhoto'
import { useAuth } from '../hooks/useAuth'
import { useUserPreferences } from '../hooks/useUserPreferences'
import AppLogo from './brand/AppLogo'

const getQuickNav = (role) => {
  if (role === 'super-admin') {
    return [
      { to: '/admin/control', label: 'Home', icon: cilTerminal },
      { to: '/admin/overview', label: 'My School', icon: cilSpeedometer },
      { to: '/charts', label: 'Analytics', icon: cilChartPie },
    ]
  }
  if (role === 'admin') {
    return [
      { to: '/admin/control', label: 'Home', icon: cilTerminal },
      { to: '/admin/overview', label: 'My School', icon: cilSpeedometer },
      { to: '/charts', label: 'Analytics', icon: cilChartPie },
    ]
  }
  if (role === 'teacher') {
    return [
      { to: '/team', label: 'My School', icon: cilLibrary },
      { to: '/charts', label: 'Analytics', icon: cilChartPie },
    ]
  }
  return [
    { to: '/dashboard', label: 'Workspace', icon: cilSpeedometer },
    { to: '/charts', label: 'Analytics', icon: cilChartPie },
  ]
}

const profilePopperConfig = {
  strategy: 'fixed',
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    {
      name: 'preventOverflow',
      options: { boundary: 'viewport', padding: 12, altAxis: true },
    },
    {
      name: 'flip',
      options: { fallbackPlacements: ['bottom-end', 'top-end'] },
    },
  ],
}

const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const dispatch = useDispatch()
  const sidebarShow = useSelector((s) => s.sidebarShow)
  const { role, user: authUser } = useAuth()
  const { preferences } = useUserPreferences(authUser?.uid)

  const [userData, setUserData] = useState(null)
  const [toast, setToast] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(15)
  useBrowserPush(notifications, preferences?.pushNotifications !== false)
  const { photoURL, uploading, openFilePicker, handleFileChange, fileInputRef } = useProfilePhoto()

  const quickNav = useMemo(() => getQuickNav(role), [role])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUserData(null)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        const data = snap.exists() ? snap.data() : {}
        setUserData({
          uid: firebaseUser.uid,
          email: data.email || firebaseUser.email,
          fullName: data.fullName || firebaseUser.displayName || 'User',
          role: data.role,
        })
      } catch (e) {
        console.error('Header → user load error', e)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const onPhotoSelected = async (e) => {
    const result = await handleFileChange(e)
    if (result?.success) {
      setToast({ color: 'success', msg: 'Profile picture saved!' })
    } else if (result?.error) {
      setToast({ color: 'danger', msg: result.error })
    }
  }

  const themeIcon =
    colorMode === 'dark' ? cilMoon : colorMode === 'auto' ? cilContrast : cilSun

  const Toast = toast && (
    <CToast autohide={3000} visible color={toast.color} className="text-white">
      <CToastHeader closeButton>
        <strong className="me-auto">Profile</strong>
      </CToastHeader>
      <CToastBody>{toast.msg}</CToastBody>
    </CToast>
  )

  const ProfileAvatar = ({ size = 'md' }) => {
    if (uploading) return <CSpinner size="sm" />
    if (photoURL) {
      return (
        <CAvatar size={size} className="sms-header-avatar sms-header-avatar--round">
          <CImage src={photoURL} alt="" className="sms-header-avatar-img" />
        </CAvatar>
      )
    }
    return (
      <CAvatar color="primary" textColor="white" size={size} className="sms-header-avatar">
        {userData?.fullName?.[0]?.toUpperCase() || <CIcon icon={cilUser} />}
      </CAvatar>
    )
  }

  return (
    <>
      <CToaster placement="top-end" push={Toast} />

      <CHeader
        position="sticky"
        className={`sms-header mb-0 p-0 ${scrolled ? 'sms-header--scrolled' : ''}`}
        ref={headerRef}
      >
        {/* Main bar */}
        <CContainer className="sms-header-bar" fluid>
          <div className="sms-header-left">
            <CHeaderToggler
              className="sms-header-toggle"
              onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
              aria-label="Toggle menu"
            >
              <CIcon icon={cilMenu} size="lg" />
            </CHeaderToggler>

            <NavLink to={quickNav[0]?.to || '/dashboard'} className="sms-header-brand d-lg-none">
              <AppLogo variant="mark" size={36} showText subtitle="SMS Pro" />
            </NavLink>
          </div>

          {/* Desktop quick nav */}
          <CHeaderNav className="sms-header-nav d-none d-lg-flex">
            {quickNav.map((link) => (
              <CNavItem key={link.to}>
                <CNavLink to={link.to} as={NavLink} className="sms-header-link">
                  <CIcon icon={link.icon} size="sm" className="me-1" />
                  {link.label}
                </CNavLink>
              </CNavItem>
            ))}
          </CHeaderNav>

          {/* Actions */}
          <CHeaderNav className="sms-header-actions ms-auto">
            {/* Notifications */}
            <CDropdown variant="nav-item" placement="bottom-end" popper={false}>
              <CDropdownToggle caret={false} className="sms-header-icon-btn position-relative">
                <CIcon icon={cilBell} size="lg" />
                {unreadCount > 0 && (
                  <span className="sms-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </CDropdownToggle>
              <CDropdownMenu className="sms-notif-menu pt-0" alignment="end">
                <div className="sms-notif-menu-head">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="sms-notif-list">
                  {notifications.length === 0 ? (
                    <div className="sms-notif-empty">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <CDropdownItem
                        key={n.id}
                        as="button"
                        className={`sms-notif-item ${n.read ? '' : 'unread'}`}
                        onClick={() => markRead(n.id)}
                      >
                        <div className="fw-semibold small">{n.title}</div>
                        <div className="text-muted small">{n.message}</div>
                        {n.createdAt && (
                          <div className="sms-notif-time">{n.createdAt.toLocaleString()}</div>
                        )}
                      </CDropdownItem>
                    ))
                  )}
                </div>
              </CDropdownMenu>
            </CDropdown>

            {/* Theme — desktop dropdown */}
            <CDropdown variant="nav-item" placement="bottom-end" className="d-none d-sm-flex">
              <CDropdownToggle caret={false} className="sms-header-icon-btn">
                <CIcon icon={themeIcon} size="lg" />
              </CDropdownToggle>
              <CDropdownMenu alignment="end" className="sms-theme-menu">
                <CDropdownItem active={colorMode === 'light'} as="button" onClick={() => setColorMode('light')}>
                  <CIcon className="me-2" icon={cilSun} /> Light
                </CDropdownItem>
                <CDropdownItem active={colorMode === 'dark'} as="button" onClick={() => setColorMode('dark')}>
                  <CIcon className="me-2" icon={cilMoon} /> Dark
                </CDropdownItem>
                <CDropdownItem active={colorMode === 'auto'} as="button" onClick={() => setColorMode('auto')}>
                  <CIcon className="me-2" icon={cilContrast} /> Auto
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>

            {/* Theme — mobile cycle tap */}
            <button
              type="button"
              className="sms-header-icon-btn d-sm-none"
              aria-label="Toggle theme"
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
            >
              <CIcon icon={themeIcon} size="lg" />
            </button>

            {/* Profile — opens to the left of the icon (bottom-end) so it stays on screen */}
            <CDropdown
              variant="nav-item"
              className="sms-header-profile-dropdown"
              placement="bottom-end"
              portal
              popperConfig={profilePopperConfig}
            >
              <CDropdownToggle caret={false} className="sms-header-profile-toggle py-0">
                <ProfileAvatar size="md" />
              </CDropdownToggle>
              <CDropdownMenu alignment="end" className="sms-header-profile-menu">
                <div className="sms-header-profile-head">
                  <div className="position-relative d-inline-block">
                    <ProfileAvatar size="lg" />
                    <button
                      type="button"
                      className="sms-header-photo-edit"
                      onClick={openFilePicker}
                      disabled={uploading}
                      aria-label="Change photo"
                    >
                      <CIcon icon={cilPencil} size="sm" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={onPhotoSelected}
                    hidden
                  />
                  <div className="sms-header-profile-name">{userData?.fullName || 'Loading…'}</div>
                  <div className="sms-header-profile-email">{userData?.email || ''}</div>
                </div>
                <CDropdownItem as={NavLink} to="/profile">
                  <CIcon icon={cilUser} className="me-2 opacity-75" /> Profile
                </CDropdownItem>
                <CDropdownItem as={NavLink} to="/settings">
                  <CIcon icon={cilSettings} className="me-2 opacity-75" /> Settings
                </CDropdownItem>
                <CDropdownItem className="text-danger" onClick={() => auth.signOut()}>
                  <CIcon icon={cilAccountLogout} className="me-2 opacity-75" /> Sign out
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CHeaderNav>
        </CContainer>

        {/* Breadcrumb — desktop / tablet */}
        <CContainer className="sms-breadcrumb-bar d-none d-md-flex" fluid>
          <AppBreadcrumb />
        </CContainer>
      </CHeader>
    </>
  )
}

export default AppHeader
