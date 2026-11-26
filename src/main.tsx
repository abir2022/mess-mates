import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { registerPwa } from './lib/pwa'
import { installErrorReporting } from './lib/telemetry'
import { initTheme } from './lib/theme'
import './index.css'

// Before the first paint, so a dark-mode phone never flashes a white page.
initTheme()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)

window.addEventListener('load', registerPwa)
installErrorReporting()
