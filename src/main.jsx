import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
// Importa el ErrorBoundary
import ErrorBoundary from './components/organismos/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* El ErrorBoundary debe ser el padre supremo (o casi) */}
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)