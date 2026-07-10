import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import AppLogo from './brand/AppLogo'

import { useAuth } from '../hooks/useAuth'
import { getNavigationForRole, defaultNavigation } from '../config/navigation'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { role, loading } = useAuth()

  const brandTo =
    role === 'super-admin' || role === 'admin'
      ? '/admin/control'
      : role === 'teacher'
        ? '/team'
        : '/dashboard'

  const navigation = loading || !role ? defaultNavigation : getNavigationForRole(role)

  return (
    <CSidebar
      className="border-end sidebar"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="sms-sidebar-header border-bottom">
        <CSidebarBrand to={brandTo} className="sms-sidebar-brand">
          <AppLogo variant="mark" size={42} showText={false} className="sidebar-brand-narrow" />
          <AppLogo variant="full" size={72} showText={false} className="sidebar-brand-full" />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
