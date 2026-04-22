import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Hydrate dark mode from localStorage before render to prevent flash
const stored = localStorage.getItem('ui-storage');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.state?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
