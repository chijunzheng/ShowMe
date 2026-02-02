import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/quiz-animations.css'

// E2E Test Page Support
// Access test pages via URL parameter: ?test=trophy-badge
const urlParams = new URLSearchParams(window.location.search)
const testPage = urlParams.get('test')

// Lazy load test pages only when needed
const TestPageComponents = {
  'trophy-badge': React.lazy(() => import('./test-pages/TrophyBadgeTestPage')),
}

function Root() {
  // If a test page is requested and exists, render it
  if (testPage && TestPageComponents[testPage]) {
    const TestPage = TestPageComponents[testPage]
    return (
      <React.Suspense fallback={<div>Loading test page...</div>}>
        <TestPage />
      </React.Suspense>
    )
  }

  // Otherwise render the main app
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
