import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SettingsApp from './SettingsApp'
import './styles.css'

const root = document.getElementById('root')!
const isSettings = new URLSearchParams(window.location.search).get('view') === 'settings'

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {isSettings ? <SettingsApp /> : <App />}
  </React.StrictMode>,
)
