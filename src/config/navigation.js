import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilChartPie,
  cilSettings,
  cilCreditCard,
  cilLibrary,
  cilUser,
  cilTerminal,
  cilGlobeAlt,
  cilList,
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

const item = (name, to, icon, badge) => ({
  component: CNavItem,
  name,
  to,
  icon: icon ? <CIcon icon={icon} customClassName="nav-icon" /> : undefined,
  badge,
})

export const getNavigationForRole = (role) => {
  const nav = []

  if (role === 'super-admin') {
    nav.push(
      item('Control Center', '/admin/control', cilTerminal, { color: 'danger', text: 'Hub' }),
      item('Platform Control', '/admin/platform', cilSettings),
      item('All Users', '/admin/users', cilPeople),
      item('Login Activity', '/admin/logs', cilList),
      item('School Overview', '/admin/overview', cilSpeedometer),
      item('Analytics', '/charts', cilChartPie),
      item('My Website', '/admin/site', cilGlobeAlt, { color: 'info', text: 'New' }),
    )
  } else if (role === 'admin') {
    nav.push(
      item('Control Center', '/admin/control', cilTerminal, { color: 'primary', text: 'Hub' }),
      item('School Overview', '/admin/overview', cilSpeedometer, { color: 'success', text: 'Live' }),
      item('My Users', '/admin/users', cilPeople),
      item('Login Activity', '/admin/logs', cilList),
      item('Analytics', '/charts', cilChartPie),
      item('My Website', '/admin/site', cilGlobeAlt, { color: 'info', text: 'New' }),
    )
  } else if (role === 'teacher') {
    nav.push(item('Team Dashboard', '/team', cilLibrary))
  } else {
    nav.push(
      item('My Dashboard', '/dashboard', cilSpeedometer),
      item('Analytics', '/charts', cilChartPie),
    )
  }

  nav.push({ component: CNavTitle, name: 'Account' })
  nav.push(item('Profile', '/profile', cilUser))
  nav.push(item('Settings', '/settings', cilSettings))
  nav.push(item('Subscription', '/subscription', cilCreditCard))

  return nav
}

/** Fallback nav before auth loads */
export const defaultNavigation = [
  item('Dashboard', '/dashboard', cilSpeedometer),
  item('Subscription', '/subscription', cilCreditCard),
]
