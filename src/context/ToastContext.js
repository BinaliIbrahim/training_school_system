import React, { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilXCircle, cilWarning, cilInfo } from '@coreui/icons'

const ToastContext = createContext(null)

let toastId = 0

const ICONS = {
  success: cilCheckCircle,
  error: cilXCircle,
  warning: cilWarning,
  info: cilInfo,
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success', celebrate = false) => {
      const id = ++toastId
      setToasts((prev) => [...prev.slice(-4), { id, message, type, celebrate }])
      setTimeout(() => dismiss(id), celebrate ? 4500 : 3800)
      return id
    },
    [dismiss],
  )

  const value = {
    success: (msg, celebrate = true) => push(msg, 'success', celebrate),
    error: (msg) => push(msg, 'error', false),
    warning: (msg) => push(msg, 'warning', false),
    info: (msg) => push(msg, 'info', false),
    celebrate: (msg) => push(msg, 'success', true),
    dismiss,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="sms-toast-portal" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`sms-toast-float sms-toast-float--${t.type}${t.celebrate ? ' sms-toast-float--celebrate' : ''}`}
              role="status"
            >
              {t.celebrate && <span className="sms-toast-sparkles" aria-hidden="true" />}
              <CIcon icon={ICONS[t.type] || ICONS.info} className="sms-toast-float-icon" />
              <span className="sms-toast-float-msg">{t.message}</span>
              <button type="button" className="sms-toast-float-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      celebrate: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}
