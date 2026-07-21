import React from 'react'

const ControlCenter = React.lazy(() => import('./views/admin/ControlCenter'))
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const SchoolDashboard = React.lazy(() => import('./views/admin/SchoolDashboard'))
const ManageUsers = React.lazy(() => import('./views/admin/ManageUsers'))
const Cards = React.lazy(() => import('./views/base/cards/Cards'))
const Charts = React.lazy(() => import('./views/charts/Charts'))
const Profile = React.lazy(() => import('./views/account/Profile'))
const Settings = React.lazy(() => import('./views/account/Settings'))
const SchoolSiteBuilder = React.lazy(() => import('./views/admin/SchoolSiteBuilder'))
const LoginLogs = React.lazy(() => import('./views/admin/LoginLogs'))

// CoreUI demo pages (optional / legacy)
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Typography = React.lazy(() => import('./views/theme/typography/Typography'))
const Accordion = React.lazy(() => import('./views/base/accordion/Accordion'))
const Breadcrumbs = React.lazy(() => import('./views/base/breadcrumbs/Breadcrumbs'))
const Tooltips = React.lazy(() => import('./views/base/tooltips/Tooltips'))
const Buttons = React.lazy(() => import('./views/buttons/buttons/Buttons'))
const ButtonGroups = React.lazy(() => import('./views/buttons/button-groups/ButtonGroups'))
const Dropdowns = React.lazy(() => import('./views/buttons/dropdowns/Dropdowns'))
const ChecksRadios = React.lazy(() => import('./views/forms/checks-radios/ChecksRadios'))
const FloatingLabels = React.lazy(() => import('./views/forms/floating-labels/FloatingLabels'))
const FormControl = React.lazy(() => import('./views/forms/form-control/FormControl'))
const InputGroup = React.lazy(() => import('./views/forms/input-group/InputGroup'))
const Layout = React.lazy(() => import('./views/forms/layout/Layout'))
const Range = React.lazy(() => import('./views/forms/range/Range'))
const Select = React.lazy(() => import('./views/forms/select/Select'))
const Validation = React.lazy(() => import('./views/forms/validation/Validation'))
const CoreUIIcons = React.lazy(() => import('./views/icons/coreui-icons/CoreUIIcons'))
const Flags = React.lazy(() => import('./views/icons/flags/Flags'))
const Brands = React.lazy(() => import('./views/icons/brands/Brands'))
const Alerts = React.lazy(() => import('./views/notifications/alerts/Alerts'))
const Badges = React.lazy(() => import('./views/notifications/badges/Badges'))
const Modals = React.lazy(() => import('./views/notifications/modals/Modals'))
const Toasts = React.lazy(() => import('./views/notifications/toasts/Toasts'))
const Widgets = React.lazy(() => import('./views/widgets/Widgets'))

const routes = [
  // ── Primary SMS Pro routes ──
  { path: '/admin/control', name: 'Home', element: ControlCenter },
  { path: '/dashboard', name: 'My workspace', element: Dashboard },
  { path: '/admin/overview', name: 'My School', element: SchoolDashboard },
  { path: '/admin/users', name: 'Team', element: ManageUsers },
  { path: '/admin/logs', name: 'Sign-ins', element: LoginLogs },
  { path: '/admin/platform', name: 'All users', element: ManageUsers },
  { path: '/team', name: 'My School', element: SchoolDashboard },
  { path: '/charts', name: 'Analytics', element: Charts },
  { path: '/admin/site', name: 'My School Website', element: SchoolSiteBuilder },
  { path: '/profile', name: 'Profile', element: Profile },
  { path: '/settings', name: 'Settings', element: Settings },

  // ── Legacy aliases ──
  { path: '/base/cards', name: 'Platform', element: Cards },
  { path: '/base/tables', name: 'Overview', element: SchoolDashboard },
  { path: '/base/tabs', name: 'Team', element: SchoolDashboard },

  { path: '/', exact: true, name: 'Home' },
  { path: '/theme', name: 'Theme', element: Colors, exact: true },
  { path: '/theme/colors', name: 'Colors', element: Colors },
  { path: '/theme/typography', name: 'Typography', element: Typography },
  { path: '/base', name: 'Base', element: Cards, exact: true },
  { path: '/base/accordion', name: 'Accordion', element: Accordion },
  { path: '/base/breadcrumbs', name: 'Breadcrumbs', element: Breadcrumbs },
  { path: '/base/tooltips', name: 'Tooltips', element: Tooltips },
  { path: '/buttons', name: 'Buttons', element: Buttons, exact: true },
  { path: '/buttons/buttons', name: 'Buttons', element: Buttons },
  { path: '/buttons/dropdowns', name: 'Dropdowns', element: Dropdowns },
  { path: '/buttons/button-groups', name: 'Button Groups', element: ButtonGroups },
  { path: '/forms', name: 'Forms', element: FormControl, exact: true },
  { path: '/forms/form-control', name: 'Form Control', element: FormControl },
  { path: '/forms/select', name: 'Select', element: Select },
  { path: '/forms/checks-radios', name: 'Checks & Radios', element: ChecksRadios },
  { path: '/forms/range', name: 'Range', element: Range },
  { path: '/forms/input-group', name: 'Input Group', element: InputGroup },
  { path: '/forms/floating-labels', name: 'Floating Labels', element: FloatingLabels },
  { path: '/forms/layout', name: 'Layout', element: Layout },
  { path: '/forms/validation', name: 'Validation', element: Validation },
  { path: '/icons', exact: true, name: 'Icons', element: CoreUIIcons },
  { path: '/icons/coreui-icons', name: 'CoreUI Icons', element: CoreUIIcons },
  { path: '/icons/flags', name: 'Flags', element: Flags },
  { path: '/icons/brands', name: 'Brands', element: Brands },
  { path: '/notifications', name: 'Notifications', element: Alerts, exact: true },
  { path: '/notifications/alerts', name: 'Alerts', element: Alerts },
  { path: '/notifications/badges', name: 'Badges', element: Badges },
  { path: '/notifications/modals', name: 'Modals', element: Modals },
  { path: '/notifications/toasts', name: 'Toasts', element: Toasts },
  { path: '/widgets', name: 'Widgets', element: Widgets },
]

export default routes
