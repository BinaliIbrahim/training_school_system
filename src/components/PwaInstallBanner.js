import React, { useCallback, useEffect, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilX } from '@coreui/icons'
import { isPwaInstalled } from '../utils/pwa'

const DISMISS_KEY = 'sms-pwa-install-dismissed'

const PwaInstallBanner = ({ compact = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isPwaInstalled()) {
      setInstalled(true)
      return undefined
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (installed || dismissed || !deferredPrompt) return null

  if (compact) {
    return (
      <CButton color="primary" size="sm" className="sms-btn-glow" onClick={handleInstall}>
        <CIcon icon={cilCloudDownload} className="me-1" />
        Install App
      </CButton>
    )
  }

  return (
    <CAlert color="primary" className="sms-pwa-banner d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <strong>Install SMS Pro</strong>
        <div className="small mb-0 opacity-90">
          Add to your home screen or desktop for quick access — works offline for cached pages.
        </div>
      </div>
      <div className="d-flex gap-2">
        <CButton color="light" size="sm" onClick={handleInstall}>
          <CIcon icon={cilCloudDownload} className="me-1" />
          Install
        </CButton>
        <CButton color="light" variant="ghost" size="sm" onClick={handleDismiss} aria-label="Dismiss">
          <CIcon icon={cilX} />
        </CButton>
      </div>
    </CAlert>
  )
}

export default PwaInstallBanner
