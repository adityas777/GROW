import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('pehla_session_id'))
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('pehla_email') || '')
  const [userName, setUserName] = useState(() => localStorage.getItem('pehla_name') || '')
  const [messages, setMessages] = useState([])
  const [profile, setProfile] = useState({ amount: null, horizon: null, risk: null })
  const [portfolio, setPortfolio] = useState(null)
  const [pendingPlan, setPendingPlan] = useState(null)
  const [confirmToken, setConfirmToken] = useState(null)

  useEffect(() => {
    if (!sessionId) {
      initSession()
    }
  }, [])

  async function initSession() {
    try {
      const data = await api.createSession()
      const id = data.session_id
      setSessionId(id)
      localStorage.setItem('pehla_session_id', id)
    } catch (e) {
      console.error('Session init failed:', e)
      // Generate local fallback
      const id = `local-${Date.now()}`
      setSessionId(id)
      localStorage.setItem('pehla_session_id', id)
    }
  }

  function saveUserInfo(email, name) {
    setUserEmail(email)
    setUserName(name)
    localStorage.setItem('pehla_email', email)
    localStorage.setItem('pehla_name', name)
  }

  function addMessage(msg) {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }])
  }

  function clearSession() {
    localStorage.removeItem('pehla_session_id')
    setSessionId(null)
    setMessages([])
    setProfile({ amount: null, horizon: null, risk: null })
    setPendingPlan(null)
    setConfirmToken(null)
    initSession()
  }

  const value = {
    sessionId,
    userEmail,
    userName,
    messages,
    profile,
    portfolio,
    pendingPlan,
    confirmToken,
    setMessages,
    setProfile,
    setPortfolio,
    setPendingPlan,
    setConfirmToken,
    addMessage,
    saveUserInfo,
    clearSession,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
