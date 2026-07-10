import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle } from '@coreui/icons'

const WelcomePulse = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const message = location.state?.message
    if (!message) return
    setMsg(message)
    const hide = setTimeout(() => setMsg(''), 6000)
    navigate(location.pathname + location.search, { replace: true, state: {} })
    return () => clearTimeout(hide)
  }, [location.state?.message, location.pathname, location.search, navigate])

  if (!msg) return null

  return (
    <div className="sms-welcome-pulse" role="status">
      <CIcon icon={cilCheckCircle} className="sms-welcome-pulse-icon" />
      <span>{msg}</span>
    </div>
  )
}

export default WelcomePulse
