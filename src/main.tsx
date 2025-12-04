import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    {/* ROOT WRAPPER – pozadie cez celé okno */}
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <App />
    </div>
  </StrictMode>,
)
