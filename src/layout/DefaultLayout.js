import React from 'react'
import { ToastProvider } from '../context/ToastContext'
import { AppContent, AppSidebar, AppFooter, AppHeader, MobileTabBar } from '../components/index'
import useUserPresence from '../hooks/useUserPresence'

const DefaultLayout = () => {
  useUserPresence()

  return (
    <ToastProvider>
      <div className="sms-app-shell">
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 sms-app-body">
            <AppContent />
          </div>
          <AppFooter />
          <MobileTabBar />
        </div>
      </div>
    </ToastProvider>
  )
}

export default DefaultLayout
