import { useState, useEffect } from 'react'
import ConfigurationManager from './components/ConfigurationManager'
import HelpModal from './components/HelpModal'
import { ChaosStreamProxyInstance } from './types'
import './App.css'

const SELECTED_INSTANCE_KEY = 'chaos-maker-selected-instance'

function App() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<ChaosStreamProxyInstance | null>(() => {
    // Load selected instance from localStorage on initial render
    const saved = localStorage.getItem(SELECTED_INSTANCE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (err) {
        console.error('Failed to parse saved instance:', err)
        return null
      }
    }
    return null
  })

  // Save selected instance to localStorage whenever it changes
  useEffect(() => {
    if (selectedInstance) {
      localStorage.setItem(SELECTED_INSTANCE_KEY, JSON.stringify(selectedInstance))
    } else {
      localStorage.removeItem(SELECTED_INSTANCE_KEY)
    }
  }, [selectedInstance])

  return (
    <div className="app app-no-sidebar">
      <div className="app-content app-content-full">
        <header className="app-header">
          <div className="header-title-container">
            <div className="header-title">
              <img src="/favicon.svg" alt="Chaos Maker Logo" className="header-logo" />
              <h1>Chaos Stream Proxy Configurator</h1>
            </div>
            <button
              className="help-button"
              onClick={() => setHelpOpen(true)}
              title="Help"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Help</span>
            </button>
          </div>
          <p>Configure and manage chaos stream proxy instances in Eyevinn OSC</p>
        </header>

        <main className="app-main full-width">
          <ConfigurationManager
            selectedInstance={selectedInstance}
            onInstanceSelect={setSelectedInstance}
          />
        </main>

        <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </div>
  )
}

export default App
