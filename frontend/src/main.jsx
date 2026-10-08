import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1c1c1c',
            color: '#f5f5f5',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#D4AF37', secondary: '#000' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#000' },
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
