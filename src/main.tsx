import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { GlobalProvider } from './core/store/GlobalContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </GlobalProvider>
  </StrictMode>,
)
