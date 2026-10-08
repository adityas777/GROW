import { Routes, Route } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage.jsx'
import CopilotPage from './pages/CopilotPage.jsx'
import PortfolioPage from './pages/PortfolioPage.jsx'
import PaycheckPage from './pages/PaycheckPage.jsx'
import OpsPage from './pages/OpsPage.jsx'
import TimeMachinePage from './pages/TimeMachinePage.jsx'
import ShareSmsPage from './pages/ShareSmsPage.jsx'
import { SessionProvider } from './context/SessionContext.jsx'

export default function App() {
  return (
    <SessionProvider>
      {/* Camera lighting orbs */}
      <div className="orb orb-gold" aria-hidden="true" />
      <div className="orb orb-warm" aria-hidden="true" />
      
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/chat" element={<CopilotPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/paycheck" element={<PaycheckPage />} />
        <Route path="/ops" element={<OpsPage />} />
        <Route path="/timemachine" element={<TimeMachinePage />} />
        {/* Web Share Target — Android shares SMS here */}
        <Route path="/paycheck/share-sms" element={<ShareSmsPage />} />
      </Routes>
    </SessionProvider>
  )
}
