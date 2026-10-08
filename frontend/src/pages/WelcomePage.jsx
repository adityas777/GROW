import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, MessageCircle, TrendingUp, Shield, Zap, ChevronRight } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import styles from './WelcomePage.module.css'

const FEATURES = [
  { icon: MessageCircle, text: 'Hinglish mein baat karo', sub: 'No jargon, no confusion' },
  { icon: Shield, text: 'Confirm karo, tabhi hoga', sub: 'Your money, your control' },
  { icon: Zap, text: 'Sirf ₹500 se shuru', sub: 'Chota start, bada future' },
  { icon: TrendingUp, text: 'Smart plan, turant', sub: 'AI-powered, human-checked' },
]

const TRUST_INDICATORS = [
  '🔒 Sandbox Mode — No real money',
  '🤖 AI + Guardrails',
  '📋 SEBI-compliant messaging',
]

export default function WelcomePage() {
  const navigate = useNavigate()
  const { saveUserInfo } = useSession()
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % FEATURES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  function handleStart(mode) {
    if (name) {
      saveUserInfo(email, name)
    }
    navigate('/chat', { state: { mode } })
  }

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <motion.div
          className={styles.logo}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <div className={styles.logoIcon}>₹</div>
          <span className={styles.logoText}>Paisa Dost</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          className={styles.headline}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className={styles.title}>
            Pehla{' '}
            <span className="text-gold">₹500</span>
          </h1>
          <p className={styles.subtitle}>Bina tension ke, bina jargon ke.</p>
          <p className={styles.tagline}>
            India ka smartest Hinglish investment copilot — sirf{' '}
            <strong>20 to 26 saal</strong> ke Gen Z ke liye.
          </p>
        </motion.div>

        {/* Rotating Feature */}
        <motion.div
          className={styles.featureRotator}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={i}
                className={`${styles.featurePill} ${i === activeFeature ? styles.featurePillActive : ''}`}
                animate={{ opacity: i === activeFeature ? 1 : 0.3, scale: i === activeFeature ? 1 : 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Icon size={16} />
                <span>{f.text}</span>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Name input (optional) */}
        <motion.div
          className={styles.nameSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {!showNameInput ? (
            <button
              className={`btn btn-ghost btn-sm ${styles.nameToggle}`}
              onClick={() => setShowNameInput(true)}
            >
              Apna naam batao (optional) 👋
            </button>
          ) : (
            <motion.div
              className={styles.nameInputs}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <input
                type="text"
                placeholder="Aapka naam (e.g. Riya)"
                value={name}
                onChange={e => setName(e.target.value)}
                className={styles.nameInput}
                autoFocus
              />
              <input
                type="email"
                placeholder="Email (optional — nudges ke liye)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.nameInput}
              />
            </motion.div>
          )}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className={styles.ctaGroup}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
        >
          <motion.button
            className={`btn btn-primary btn-lg ${styles.ctaVoice}`}
            onClick={() => handleStart('voice')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="btn-voice-start"
          >
            <Mic size={22} />
            Bolke batao
            <span className={styles.ctaHint}>Voice</span>
          </motion.button>

          <motion.button
            className={`btn btn-secondary btn-lg ${styles.ctaType}`}
            onClick={() => handleStart('text')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="btn-type-start"
          >
            <MessageCircle size={22} />
            Type karo
            <span className={styles.ctaHint}>Chat</span>
          </motion.button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className={styles.trust}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {TRUST_INDICATORS.map((t, i) => (
            <span key={i} className={styles.trustItem}>{t}</span>
          ))}
        </motion.div>

        {/* Time Machine Game Link */}
        <motion.button
          className={styles.timeMachineBanner}
          onClick={() => navigate('/timemachine')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          id="btn-timemachine-welcome"
        >
          <span>⏳</span>
          <span>Play Compounding Time Machine (1983 SIP Game)</span>
          <span className={styles.gamePill}>NEW</span>
        </motion.button>

        {/* Ops link */}
        <motion.button
          className={styles.opsLink}
          onClick={() => navigate('/ops')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Ops Dashboard →
        </motion.button>
      </motion.div>

      {/* Decorative bottom wave */}
      <div className={styles.bottomGlow} aria-hidden="true" />
    </div>
  )
}
