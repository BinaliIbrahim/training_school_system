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
      item('Home', '/admin/control', cilTerminal, { color: 'danger', text: 'Start' }),
      item('All users', '/admin/users', cilPeople),
      item('Sign-ins', '/admin/logs', cilList),
      item('My School', '/admin/overview', cilSpeedometer),
      item('Analytics', '/charts', cilChartPie),
      item('My Website', '/admin/site', cilGlobeAlt, { color: 'info', text: 'New' }),
    )
  } else if (role === 'admin') {
    nav.push(
      item('Home', '/admin/control', cilTerminal, { color: 'primary', text: 'Start' }),
      item('My School', '/admin/overview', cilSpeedometer, { color: 'success', text: 'Daily' }),
      item('Team', '/admin/users', cilPeople),
      item('Sign-ins', '/admin/logs', cilList),
      item('Analytics', '/charts', cilChartPie),
      item('My Website', '/admin/site', cilGlobeAlt, { color: 'info', text: 'New' }),
    )
  } else if (role === 'teacher') {
    nav.push(item('My School', '/team', cilLibrary))
  } else {
    nav.push(
      item('My workspace', '/dashboard', cilSpeedometer),
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
