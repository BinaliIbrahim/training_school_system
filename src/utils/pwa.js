/** True when the app is running as an installed PWA (home screen / desktop shortcut). */
export function isPwaInstalled() {
  if (typeof window === 'undefined') return false

  if (window.navigator.standalone === true) return true

  const displayModes = ['standalone', 'fullscreen', 'minimal-ui']
  return displayModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
}
