import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Share2, Download, Loader2 } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { api } from '../lib/api'
import styles from './ShareSmsPage.module.css'

/**
 * ShareSmsPage — receives shared SMS via Web Share Target API
 * Android users: Open PaycheckPage → SMS Sync → Add to Home Screen →
 * Later when salary SMS arrives, Share → Paisa Dost → lands here automatically
 */
export default function ShareSmsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sessionId, userEmail, userName } = useSession()

  const [status, setStatus] = useState('processing') // processing | success | error | no_salary
  const [parsedData, setParsedData] = useState(null)
  const [rawText, setRawText] = useState('')
  const sharedText = searchParams.get('text') || searchParams.get('url') || searchParams.get('title') || ''

  useEffect(() => {
    if (sharedText) {
      setRawText(sharedText)
      processSharedSms(sharedText)
    } else {
      setStatus('error')
    }
  }, [sharedText])

  async function processSharedSms(text) {
    setStatus('processing')
    try {
      const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
      const data = await api.simulatePaycheckSMS({
        text,
        sender: 'BANK',
        session_id: activeSession,
      })

      if (data?.success && data?.data) {
        setParsedData(data.data)
        setStatus('success')

        // Trigger email notification automatically
        if (userEmail && data.data.salary_amount) {
          const split = data.data.split || {}
          try {
            await api.post('/paycheck/event', {
              amount: data.data.salary_amount,
              source: 'salary_sms_share',
              session_id: activeSession,
              user_email: userEmail,
              user_name: userName,
            })
          } catch (_) {
            // Email failure is non-critical
          }
        }
      } else {
        setStatus('no_salary')
      }
    } catch (err) {
      console.error('Share SMS parse error:', err)
      setStatus('error')
    }
  }

  function goToPaycheck() {
    if (parsedData) {
      // Store parsed data in sessionStorage so PaycheckPage can read it
      sessionStorage.setItem('shared_salary_event', JSON.stringify(parsedData))
    }
    navigate('/paycheck', { state: { sharedSalaryEvent: parsedData } })
  }

  return (
    <div className={styles.page}>
      {/* Backdrop glow */}
      <div className={styles.backdropGlow} />

      <AnimatePresence mode="wait">
        {status === 'processing' && (
          <motion.div
            key="processing"
            className={styles.card}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className={styles.iconWrap}>
              <Loader2 size={36} className={styles.spinIcon} />
            </div>
            <h2 className={styles.title}>SMS Analyze Ho Raha Hai...</h2>
            <p className={styles.subtitle}>Aapka salary SMS read karke smart split tayyar kar rahe hain</p>
            {rawText && (
              <div className={styles.rawSmsBox}>
                <span className={styles.rawLabel}>Shared SMS:</span>
                <p className={styles.rawText}>{rawText.slice(0, 120)}{rawText.length > 120 ? '...' : ''}</p>
              </div>
            )}
          </motion.div>
        )}

        {status === 'success' && parsedData && (
          <motion.div
            key="success"
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Success Header */}
            <div className={styles.successHeader}>
              <motion.div
                className={styles.successIconWrap}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
              >
                <CheckCircle size={40} className={styles.checkIcon} />
              </motion.div>
              <h2 className={styles.title}>Salary Detect Ho Gayi! 🎉</h2>
              <p className={styles.subtitle}>
                {parsedData.bank} se ₹{parsedData.salary_amount?.toLocaleString('en-IN')} credited
              </p>
            </div>

            {/* Amount display */}
            <motion.div
              className={styles.amountCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className={styles.amountLabel}>Monthly Salary</span>
              <span className={styles.amountValue}>₹{parsedData.salary_amount?.toLocaleString('en-IN')}</span>
              {parsedData.account_tail && (
                <span className={styles.accountTag}>A/c ending ···{parsedData.account_tail}</span>
              )}
            </motion.div>

            {/* Split Preview */}
            {parsedData.split && (
              <motion.div
                className={styles.splitPreview}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className={styles.splitTitle}>Suggested 3-Way Split</div>
                <div className={styles.splitBar}>
                  <div
                    className={styles.barEmergency}
                    style={{ width: `${parsedData.split.emergency_pct}%` }}
                    title={`Emergency ${parsedData.split.emergency_pct}%`}
                  />
                  <div
                    className={styles.barSip}
                    style={{ width: `${parsedData.split.sip_pct}%` }}
                    title={`SIP ${parsedData.split.sip_pct}%`}
                  />
                  <div
                    className={styles.barFun}
                    style={{ width: `${parsedData.split.fun_pct}%` }}
                    title={`Fun ${parsedData.split.fun_pct}%`}
                  />
                </div>
                <div className={styles.splitRows}>
                  <div className={styles.splitRow}>
                    <span className={styles.dotGold} />
                    <span>Emergency Fund</span>
                    <strong>₹{parsedData.split.emergency?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className={styles.splitRow}>
                    <span className={styles.dotGreen} />
                    <span>Monthly SIP</span>
                    <strong className={styles.greenText}>₹{parsedData.split.sip?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className={styles.splitRow}>
                    <span className={styles.dotAmber} />
                    <span>Kharcha & Fun</span>
                    <strong>₹{parsedData.split.fun?.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </motion.div>
            )}

            {userEmail && (
              <div className={styles.emailSentNote}>
                📧 Email summary bhi bhej diya — {userEmail}
              </div>
            )}

            <motion.button
              className={styles.ctaBtn}
              onClick={goToPaycheck}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Sparkles size={16} /> Paycheck Split Customize Karo <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {status === 'no_salary' && (
          <motion.div
            key="no_salary"
            className={styles.card}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.iconWrap}>
              <AlertTriangle size={36} className={styles.warnIcon} />
            </div>
            <h2 className={styles.title}>Salary SMS Nahi Laga</h2>
            <p className={styles.subtitle}>
              Yeh message salary credit SMS jaisi nahi lagi. Kya aapne galat SMS share kiya?
            </p>
            {rawText && (
              <div className={styles.rawSmsBox}>
                <span className={styles.rawLabel}>Shared text:</span>
                <p className={styles.rawText}>{rawText.slice(0, 200)}</p>
              </div>
            )}
            <div className={styles.hintBox}>
              <p>Salary SMS mein ye hona chahiye:</p>
              <ul>
                <li>💳 "credited" ya "deposited" word</li>
                <li>💰 Amount jaise INR 30,000 ya Rs 85,000</li>
                <li>🏦 Bank sender jaise HDFCBK, ICICIBK, SBIINB</li>
              </ul>
            </div>
            <button className={styles.secondaryBtn} onClick={() => navigate('/paycheck')}>
              Manually Enter Karo <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            className={styles.card}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.iconWrap}>
              <AlertTriangle size={36} className={styles.warnIcon} />
            </div>
            <h2 className={styles.title}>Kuch Gadbad Hua</h2>
            <p className={styles.subtitle}>SMS read karne mein error aaya. Dobara try karo ya manually enter karo.</p>
            <button className={styles.ctaBtn} onClick={() => navigate('/paycheck')}>
              Paycheck Page Pe Jao <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powered by footer */}
      <div className={styles.footer}>
        <Smartphone size={14} />
        Powered by Paisa Dost • Web Share Target
      </div>
    </div>
  )
}
