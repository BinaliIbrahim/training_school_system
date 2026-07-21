import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilTerminal,
  cilSpeedometer,
  cilPeople,
  cilChartPie,
  cilLibrary,
  cilCreditCard,
  cilMenu,
} from '@coreui/icons'
import { useAuth } from '../hooks/useAuth'

const getTabs = (role) => {
  if (role === 'super-admin') {
    return [
      { to: '/admin/control', icon: cilTerminal, label: 'Home' },
      { to: '/admin/overview', icon: cilSpeedometer, label: 'School' },
      { to: '/admin/users', icon: cilPeople, label: 'Users' },
      { to: '/charts', icon: cilChartPie, label: 'Stats' },
      { action: 'menu', icon: cilMenu, label: 'Menu' },
    ]
  }
  if (role === 'admin') {
    return [
      { to: '/admin/control', icon: cilTerminal, label: 'Home' },
      { to: '/admin/overview', icon: cilSpeedometer, label: 'School' },
      { to: '/admin/users', icon: cilPeople, label: 'Team' },
      { to: '/charts', icon: cilChartPie, label: 'Stats' },
      { action: 'menu', icon: cilMenu, label: 'Menu' },
    ]
  }
  if (role === 'teacher') {
    return [
      { to: '/team', icon: cilLibrary, label: 'School' },
      { to: '/charts', icon: cilChartPie, label: 'Stats' },
      { action: 'menu', icon: cilMenu, label: 'Menu' },
    ]
  }
  return [
    { to: '/dashboard', icon: cilSpeedometer, label: 'Home' },
    { to: '/charts', icon: cilChartPie, label: 'Stats' },
    { to: '/subscription', icon: cilCreditCard, label: 'Plan' },
    { action: 'menu', icon: cilMenu, label: 'Menu' },
  ]
}

const isTabActive = (pathname, to) => {
  if (to === '/admin/control') return pathname === '/admin/control'
  if (to === '/dashboard') return pathname === '/dashboard'
  return pathname === to || pathname.startsWith(`${to}/`)
}

const MobileTabBar = () => {
  const { role } = useAuth()
  const location = useLocation()
  const dispatch = useDispatch()
  const tabs = useMemo(() => getTabs(role), [role])

  if (!role) return null

  return (
    <nav className="sms-mobile-tabbar d-lg-none" aria-label="Main navigation">
      {tabs.map((tab) => {
        if (tab.action === 'menu') {
          return (
            <button
              key="menu"
              type="button"
              className="sms-mobile-tab"
              onClick={() => dispatch({ type: 'set', sidebarShow: true })}
              aria-label="Open menu"
            >
              <CIcon icon={tab.icon} size="lg" />
              <span>{tab.label}</span>
            </button>
          )
        }

        const active = isTabActive(location.pathname, tab.to)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`sms-mobile-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <CIcon icon={tab.icon} size="lg" />
            <span>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default React.memo(MobileTabBar)
