import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { registerSW } from 'virtual:pwa-register'
import 'core-js'

import App from './App'
import store from './store'

registerSW({
  onNeedRefresh() {
    if (window.confirm('A new version of SMS Pro is available. Reload to update?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.info('SMS Pro is ready to work offline.')
  },
})

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
