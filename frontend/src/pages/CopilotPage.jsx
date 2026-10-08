import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, MicOff, Send, ArrowLeft, Briefcase, DollarSign,
  BarChart2, BookOpen, Shield, ChevronRight, X, CheckCircle,
  AlertTriangle, Volume2, RotateCcw, Sparkles
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { api, speakText } from '../lib/api'
import PlanCard from '../components/PlanCard.jsx'
import ConfirmSheet from '../components/ConfirmSheet.jsx'
import GlossarySheet from '../components/GlossarySheet.jsx'
import TimeMachineModal from '../components/TimeMachineModal.jsx'
import BottomNav from '../components/BottomNav.jsx'
import styles from './CopilotPage.module.css'

const QUICK_CHIPS = [
  { label: 'Time Machine ⏳', icon: '✨' },
  { label: '₹500 se shuru karun?', icon: '🚀' },
  { label: 'SIP kya hai?', icon: '📚' },
  { label: 'Salary aayi hai', icon: '💰' },
  { label: 'Portfolio dikhao', icon: '📊' },
  { label: 'Safe investment?', icon: '🛡️' },
]

const WELCOME_MESSAGES = [
  { role: 'assistant', text: '👋 Namaste! Main hoon **Paisa Dost** — tumhara Hinglish investment guide.\n\nPehli baar invest kar rahe ho? Bilkul sahi jagah aaye! Bata do kya help chahiye:' }
]

export default function CopilotPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId, userEmail, userName, messages, setMessages, setPendingPlan, setConfirmToken, pendingPlan, confirmToken } = useSession()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTtsPlaying, setIsTtsPlaying] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [currentGlossary, setCurrentGlossary] = useState(null)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [showPaycheckPanel, setShowPaycheckPanel] = useState(false)
  const [quickReplies, setQuickReplies] = useState(QUICK_CHIPS)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [voiceMode, setVoiceMode] = useState(location.state?.mode === 'voice')
  const [currentLang, setCurrentLang] = useState('hinglish')

  const chatEndRef = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const inputRef = useRef(null)

  // Init with welcome messages
  useEffect(() => {
    if (messages.length === 0) {
      setMessages(WELCOME_MESSAGES.map((m, i) => ({ ...m, id: i })))
    }
    if (location.state?.presetPrompt) {
      sendMessage(location.state.presetPrompt)
    }
  }, [location.state?.presetPrompt])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return
    setInput('')

    const userMsg = { role: 'user', text, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    // Detect user language preference dynamically
    const isEng = /english|in english|talk in english|speak english|switch to english/i.test(text)
    const isHindi = /hindi|hindi mein|hindi me/i.test(text)
    let langToSend = currentLang
    if (isEng) {
      langToSend = 'en'
      setCurrentLang('en')
    } else if (isHindi) {
      langToSend = 'hi'
      setCurrentLang('hi')
    }

    try {
      const data = await api.sendMessage({
        text,
        session_id: sessionId,
        lang: langToSend,
        user_email: userEmail,
        user_name: userName,
      })

      if (data.language) {
        setCurrentLang(data.language)
      }

      const assistantMsg = {
        role: 'assistant',
        text: data.reply,
        id: Date.now() + 1,
        intent: data.intent,
        guardrailFired: data.guardrail_fired,
        plan: data.plan,
        confirmToken: data.confirm_token,
        needsConfirmation: data.needs_confirmation,
        glossary: data.glossary,
        language: data.language || langToSend,
      }

      setMessages(prev => [...prev, assistantMsg])

      if (data.quick_replies?.length) {
        setQuickReplies(data.quick_replies.map((r, i) => ({ label: r, icon: ['🚀','📚','💰','📊','🛡️','🤔'][i % 6] })))
      }

      if (data.plan) {
        setCurrentPlan(data.plan)
        setPendingPlan(data.plan)
      }

      if (data.confirm_token) {
        setConfirmToken(data.confirm_token)
      }

      // TTS (natural audio without emojis)
      if (voiceMode && data.reply) {
        const audioLang = data.language || langToSend
        const ttsResult = await api.textToSpeech({ text: data.reply, lang: audioLang })
        if (ttsResult.use_browser_tts) {
          speakText(data.reply, audioLang)
        } else if (ttsResult.audio_blob) {
          const url = URL.createObjectURL(ttsResult.audio_blob)
          const audio = new Audio(url)
          setIsTtsPlaying(true)
          audio.play().catch(() => {
            setIsTtsPlaying(false)
            speakText(data.reply, audioLang)
          })
        }
      }

    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '😅 Network issue! Thoda wait karke dobara try karo.',
        id: Date.now() + 1,
        isError: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, userEmail, userName, isLoading, voiceMode, currentLang])

  async function handleVoice() {
    if (isRecording) {
      // Stop recording
      mediaRecorder.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunks.current = []

      mr.ondataavailable = e => audioChunks.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })

        try {
          setIsLoading(true)
          const sttResult = await api.speechToText(blob)
          if (sttResult.transcript) {
            await sendMessage(sttResult.transcript)
          }
        } catch (err) {
          console.error('STT error:', err)
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: '🎤 Awaaz clearly nahi aayi. Type karke try karo!',
            id: Date.now(),
          }])
          setIsLoading(false)
        }
      }

      mr.start()
      mediaRecorder.current = mr
      setIsRecording(true)

      // Auto stop after 10s
      setTimeout(() => {
        if (mr.state === 'recording') mr.stop()
      }, 10000)

    } catch {
      // Fallback to browser speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        const rec = new SR()
        rec.lang = 'hi-IN'
        rec.interimResults = false
        rec.onresult = e => sendMessage(e.results[0][0].transcript)
        rec.onerror = () => alert('Microphone permission denied. Please type instead.')
        rec.start()
        setIsRecording(true)
        rec.onend = () => setIsRecording(false)
      } else {
        alert('Voice not supported. Please type your message.')
      }
    }
  }

  async function handleConfirm() {
    const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
    const activePlan = currentPlan || pendingPlan
    const activeToken = confirmToken || 'sandbox_token'

    setIsLoading(true)
    try {
      const result = await api.confirmOrder({
        session_id: activeSession,
        confirm_token: activeToken,
        plan: activePlan,
        user_email: userEmail,
        user_name: userName,
      })

      setShowConfirm(false)
      if (result.success) {
        const order = result.order
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `✅ **Ho gaya! Pehla investment confirm!** 🎊\n\nOrder ID: \`${order.order_id}\`\nFund: ${order.fund_name}\nMonthly: ₹${order.monthly_amount}\n\n*SANDBOX MODE — No real money. Illustrative demo.*`,
          id: Date.now(),
          isSuccess: true,
        }])
        setCurrentPlan(null)
        setPendingPlan(null)
        setConfirmToken(null)

        // Navigate to portfolio after a moment
        setTimeout(() => navigate('/portfolio'), 1200)
      } else {
        alert(result.error || 'Confirm order failed')
      }
    } catch (err) {
      console.error('Confirm error:', err)
      alert('Confirmation failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsLoading(false)
    }
  }

  function handleChipClick(chip) {
    if (chip.label.includes('Time Machine')) {
      setShowTimeMachine(true)
      return
    }
    sendMessage(chip.label)
  }

  function handleStartSipFromTimeMachine(simResult) {
    setShowTimeMachine(false)
    const stockNames = simResult.stockBreakdown.map(s => s.name).join(', ')
    sendMessage(`Maine Time Machine simulation dekha! ₹${simResult.monthlySipAmount}/month SIP in ${stockNames} turned into ${simResult.multiplier}x return (${simResult.overallCagr}% CAGR). Mujhe abhi real SIP start karna hai. Best fund recommend karo!`)
  }

  function handleGlossaryClick(term, glossaryData) {
    setCurrentGlossary(glossaryData || { term })
    setShowGlossary(true)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={`btn btn-ghost btn-sm ${styles.backBtn}`} onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>

        <div className={styles.headerCenter}>
          <div className={styles.headerLogo}>₹</div>
          <div>
            <div className={styles.headerTitle}>Paisa Dost</div>
            <div className={styles.headerSub}>
              {isLoading ? (
                <span className={styles.typingIndicator}>
                  <span className="loading-dots"><span/><span/><span/></span>
                  &nbsp;soch raha hoon...
                </span>
              ) : 'Online — seedha baat karo 🤝'}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`btn btn-ghost btn-sm ${voiceMode ? styles.voiceActive : ''}`}
            onClick={() => setVoiceMode(!voiceMode)}
            title={voiceMode ? 'Voice mode on' : 'Voice mode off'}
            id="btn-toggle-voice"
          >
            {voiceMode ? <Volume2 size={16} /> : <Mic size={16} />}
          </button>
          <button className={`btn btn-ghost btn-sm`} onClick={() => navigate('/portfolio')} id="btn-portfolio-nav">
            <BarChart2 size={16} />
          </button>
        </div>
      </header>

      {/* Sandbox Banner */}
      <div className="sandbox-banner" style={{ margin: '0 12px' }}>
        <Shield size={12} />
        SANDBOX MODE — No real money movement. Illustrative data only.
      </div>

      {/* Messages */}
      <div className={styles.messages} id="chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
            >
              {msg.role === 'assistant' && (
                <div className={styles.avatar}>₹</div>
              )}

              <div className={`${styles.bubble} ${
                msg.role === 'user' ? styles.bubbleUser :
                msg.isSuccess ? styles.bubbleSuccess :
                msg.isError ? styles.bubbleError :
                msg.guardrailFired ? styles.bubbleWarning : styles.bubbleAssistant
              }`}>
                {msg.guardrailFired && (
                  <div className={styles.guardrailBadge}>
                    <Shield size={12} /> Guardrail
                  </div>
                )}
                <MessageText text={msg.text} onGlossaryClick={handleGlossaryClick} />

                {msg.role === 'assistant' && !msg.isError && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ opacity: 0.75, marginTop: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                    onClick={() => speakText(msg.text, msg.language || currentLang)}
                    title="Listen aloud without emojis"
                  >
                    <Volume2 size={12} /> Suno / Listen
                  </button>
                )}

                {/* Plan Card embedded in message */}
                {msg.plan && msg.needsConfirmation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <PlanCard
                      plan={msg.plan}
                      onConfirm={() => {
                        setCurrentPlan(msg.plan)
                        setPendingPlan(msg.plan)
                        if (msg.confirmToken) setConfirmToken(msg.confirmToken)
                        setShowConfirm(true)
                      }}
                      onExplain={(term) => handleGlossaryClick(term)}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            className={`${styles.msgRow} ${styles.msgRowAssistant}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.avatar}>₹</div>
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.loadingBubble}`}>
              <div className="loading-dots">
                <span/><span/><span/>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick reply chips */}
      <div className={styles.quickReplies} id="quick-replies">
        {quickReplies.slice(0, 4).map((chip, i) => (
          <motion.button
            key={i}
            className={styles.chip}
            onClick={() => handleChipClick(chip)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {chip.icon} {chip.label}
          </motion.button>
        ))}
      </div>

      {/* Nav shortcuts */}
      <div className={styles.navShortcuts}>
        <button className={styles.shortcutBtn} onClick={() => setShowTimeMachine(true)} id="btn-timemachine-nav">
          <Sparkles size={14} /> Time Machine ⏳
        </button>
        <button className={styles.shortcutBtn} onClick={() => navigate('/paycheck')} id="btn-paycheck-nav">
          <DollarSign size={14} /> Salary Split
        </button>
        <button className={styles.shortcutBtn} onClick={() => navigate('/portfolio')} id="btn-portfolio-shortcut">
          <BarChart2 size={14} /> Portfolio
        </button>
        <button className={styles.shortcutBtn} onClick={() => handleGlossaryClick('sip')} id="btn-glossary">
          <BookOpen size={14} /> Jargon
        </button>
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.textInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={isRecording ? '🎤 Bol raha hoon...' : 'Type ya bolo...'}
            disabled={isLoading || isRecording}
            maxLength={500}
            id="chat-input"
          />

          <motion.button
            className={`${styles.micBtn} ${isRecording ? styles.micBtnActive : ''}`}
            onClick={handleVoice}
            whileTap={{ scale: 0.9 }}
            id="btn-mic"
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </motion.button>

          <motion.button
            className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ''}`}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            whileTap={{ scale: 0.9 }}
            id="btn-send"
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>

      {/* Confirm Sheet */}
      <AnimatePresence>
        {showConfirm && (currentPlan || pendingPlan) && (
          <ConfirmSheet
            plan={currentPlan || pendingPlan}
            onConfirm={() => handleConfirm(currentPlan || pendingPlan)}
            onClose={() => setShowConfirm(false)}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

      {/* Glossary Sheet */}
      <AnimatePresence>
        {showGlossary && (
          <GlossarySheet
            term={currentGlossary?.term}
            data={currentGlossary}
            onClose={() => setShowGlossary(false)}
          />
        )}
      </AnimatePresence>

      {/* Time Machine Interactive In-App Sheet */}
      <AnimatePresence>
        {showTimeMachine && (
          <TimeMachineModal
            isOpen={showTimeMachine}
            onClose={() => setShowTimeMachine(false)}
            onStartSipInChat={handleStartSipFromTimeMachine}
          />
        )}
      </AnimatePresence>

      {/* App Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

// ── Message Text renderer with markdown-lite ────────────────────────────────
function MessageText({ text, onGlossaryClick }) {
  if (!text) return null

  // Simple markdown: **bold**, *italic*, `code`, \n -> line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\n)/)

  return (
    <p className={styles.msgText}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          const code = part.slice(1, -1)
          return <code key={i} className={styles.inlineCode}>{code}</code>
        }
        if (part === '\n') {
          return <br key={i} />
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}
