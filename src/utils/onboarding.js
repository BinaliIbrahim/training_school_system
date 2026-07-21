export const QUICKSTART_DISMISSED_KEY = 'sms-admin-quickstart-dismissed'
export const WELCOME_TIPS_KEY = 'sms-show-welcome-tips'

export const isQuickStartVisible = () =>
  localStorage.getItem(QUICKSTART_DISMISSED_KEY) !== 'true'

export const dismissQuickStart = () => {
  localStorage.setItem(QUICKSTART_DISMISSED_KEY, 'true')
}

export const showWelcomeTips = () => localStorage.getItem(WELCOME_TIPS_KEY) !== 'false'

export const setWelcomeTips = (enabled) => {
  localStorage.setItem(WELCOME_TIPS_KEY, enabled ? 'true' : 'false')
}
