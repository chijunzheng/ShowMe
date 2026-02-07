import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/quiz-animations.css'

// Removed: E2E Test Page Support (TrophyBadge test page removed during legacy cleanup)

function Root() {
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
