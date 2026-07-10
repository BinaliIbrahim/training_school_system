import { useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import { useAuth } from './useAuth'
import { recordAction } from '../utils/engagement'

/**
 * App-wide feedback — satisfying toasts + daily momentum tracking on success.
 */
export function useAppToast() {
  const toast = useToast()
  const { user } = useAuth()

  const success = useCallback(
    (message, { celebrate = true, track = true } = {}) => {
      if (track && user?.uid) recordAction(user.uid)
      if (celebrate) toast.celebrate(message)
      else toast.success(message, false)
    },
    [toast, user?.uid],
  )

  const error = useCallback((message) => toast.error(message), [toast])
  const warning = useCallback((message) => toast.warning(message), [toast])
  const info = useCallback((message) => toast.info(message), [toast])

  return { success, error, warning, info, celebrate: toast.celebrate }
}
