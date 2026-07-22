import React from 'react'
import { Navigate } from 'react-router-dom'
import { isPwaInstalled } from '../utils/pwa'
import LandingPage from '../views/pages/login/Landing'

/** Marketing landing for browsers; installed app users go straight to login. */
const RootEntry = () => {
  if (isPwaInstalled()) {
    return <Navigate to="/login" replace />
  }

  return <LandingPage />
}

export default RootEntry
