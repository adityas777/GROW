import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, DollarSign, Shield, TrendingUp, Coffee, 
  Sparkles, CheckCircle, Mail, AlertTriangle, ArrowRight, Sliders,
  Smartphone, BarChart3, Globe, MessageSquareText
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { api } from '../lib/api'
import { AutoSyncModal } from '../components/AutoSyncModal'
import { GmailSyncModal } from '../components/GmailSyncModal'
import BottomNav from '../components/BottomNav.jsx'
import styles from './PaycheckPage.module.css'

const PRESETS = [
  { label: '₹8,000 (Stipend)', amount: 8000 },
  { label: '₹15,000 (Freelance)', amount: 15000 },
  { label: '₹30,000 (First Job)', amount: 30000 },
  { label: '₹75,000 (Tech)', amount: 75000 },
]

export default function PaycheckPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId, userEmail, userName } = useSession()

  const [incomeAmount, setIncomeAmount] = useState(8000)
  const [customAmount, setCustomAmount] = useState('8000')
  const [customEmail, setCustomEmail] = useState(userEmail || '')
  
  // Percentages (Sum = 100%)
  const [emergencyPct, setEmergencyPct] = useState(25)
  const [sipPct, setSipPct] = useState(15)
  const [funPct, setFunPct] = useState(60)

  const [isSimulating, setIsSimulating] = useState(false)
  const [nudgeResult, setNudgeResult] = useState(null)
  const [isApproved, setIsApproved] = useState(false)
  const [approvedMsg, setApprovedMsg] = useState('')

  // SMS & Gmail Auto-Sync State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [detectedSalaryEvent, setDetectedSalaryEvent] = useState(null)

  // On mount: check if we arrived via Web Share Target (shared SMS from Android)
  useEffect(() => {
    // Check router state first (from ShareSmsPage redirect)
    const routerEvent = location.state?.sharedSalaryEvent
    // Then check sessionStorage (also set by ShareSmsPage)
    const storedEvent = sessionStorage.getItem('shared_salary_event')

    const event = routerEvent || (storedEvent ? JSON.parse(storedEvent) : null)
    if (event) {
      handleAutoSyncDetected(event)
      sessionStorage.removeItem('shared_salary_event')
    }
  }, [])

  // Calculations
  const emergencyAmount = Math.round((incomeAmount * emergencyPct) / 100)
  const sipAmount = Math.round((incomeAmount * sipPct) / 100)
  const funAmount = Math.max(0, incomeAmount - emergencyAmount - sipAmount)

  const handleEmergencyChange = (newVal) => {
    const val = Number(newVal)
    setEmergencyPct(val)
    const rem = 100 - val - sipPct
    if (rem >= 0) {
      setFunPct(rem)
    } else {
      setSipPct(Math.max(5, 100 - val - 10))
      setFunPct(10)
    }
  }

  const handleSipChange = (newVal) => {
    const val = Number(newVal)
    setSipPct(val)
    const rem = 100 - emergencyPct - val
    if (rem >= 0) {
      setFunPct(rem)
    } else {
      setEmergencyPct(Math.max(5, 100 - val - 10))
      setFunPct(10)
    }
  }

  const handlePreset = (amt) => {
    setIncomeAmount(amt)
    setCustomAmount(amt.toString())
  }

  const handleSimulateEvent = async () => {
    setIsSimulating(true)
    try {
      const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
      const res = await api.post('/paycheck/event', {
        amount: Number(incomeAmount) || 8000,
        source: 'salary',
        session_id: activeSession,
        user_email: customEmail || undefined,
        user_name: userName || undefined
      })
      if (res && res.success) {
        setNudgeResult(res)
        if (res.split) {
          setEmergencyPct(Math.round(res.split.emergency_pct) || 25)
          setSipPct(Math.round(res.split.sip_pct) || 15)
          setFunPct(Math.round(res.split.fun_pct) || 60)
        }
      } else {
        alert(res?.error || 'Simulation failed')
      }
    } catch (err) {
      console.error('Paycheck event failed:', err)
      alert('Simulation error: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsSimulating(false)
    }
  }

  const handleApproveSplit = async () => {
    try {
      const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
      const res = await api.post('/paycheck/approve', {
        session_id: activeSession,
        sip_amount: Number(sipAmount) || 1200
      })
      if (res && res.success) {
        setIsApproved(true)
        setApprovedMsg(res.message)
      } else {
        alert(res?.error || 'Approval failed')
      }
    } catch (err) {
      console.error('Approve failed:', err)
      alert('Approval error: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleAutoSyncDetected = (payload) => {
    setDetectedSalaryEvent(payload)
    if (payload.salary_amount) {
      setIncomeAmount(payload.salary_amount)
      setCustomAmount(payload.salary_amount.toString())
    }
    if (payload.split) {
      setEmergencyPct(payload.split.emergency_pct || 25)
      setSipPct(payload.split.sip_pct || 15)
      setFunPct(payload.split.fun_pct || 60)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.titleWrap}>
          <h2 className={styles.title}>Paisa Aaya</h2>
          <span className={styles.subtitle}>Paycheck Splitter</span>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.gmailBtn}
            onClick={() => setShowGmailModal(true)}
            title="Sync with Gmail"
          >
            <Mail size={13} /> Sync Gmail
          </button>
          <button 
            className={styles.syncBtn}
            onClick={() => setShowSyncModal(true)}
            title="Paste Salary SMS"
          >
            <MessageSquareText size={13} /> Paste SMS
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <AnimatePresence>
          {detectedSalaryEvent && (
            <motion.div 
              className={styles.salaryDetectedCard}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.salaryDetectedHeader}>
                <span className={styles.salaryDetectedBadge}>🎉 Bank SMS Detected</span>
                <span className={styles.salaryDetectedMeta}>
                  {detectedSalaryEvent.bank} {detectedSalaryEvent.account_tail ? `(A/c *${detectedSalaryEvent.account_tail})` : ''}
                </span>
              </div>
              <div className={styles.salaryDetectedTitle}>
                ₹{detectedSalaryEvent.salary_amount?.toLocaleString('en-IN')} Salary Credited!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {detectedSalaryEvent?.market && (
          <motion.div 
            className={styles.marketCard}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.marketHeader}>
              <BarChart3 size={16} className={styles.goldIcon} />
              <h4>{detectedSalaryEvent.market.headline}</h4>
            </div>
            <p className={styles.marketTone}>{detectedSalaryEvent.market.tone}</p>
            <div className={styles.allocationsList}>
              {detectedSalaryEvent.market.allocations?.map((item, idx) => (
                <div key={idx} className={styles.allocItem}>
                  <div className={styles.allocTop}>
                    <span className={styles.allocCategory}>{item.category} ({item.percentage}%)</span>
                    <span className={styles.allocAmount}>₹{item.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={styles.allocRationale}>{item.rationale}</div>
                  <div className={styles.allocVehicles}>
                    {item.vehicles?.map((veh, vIdx) => (
                      <span key={vIdx} className={styles.vehicleTag}>{veh}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <DollarSign size={18} className={styles.goldIcon} />
            <h3 className={styles.cardTitle}>Kitne Paise Aaye?</h3>
          </div>
          <p className={styles.cardDesc}>
            Salary, stipend ya freelance income select karo. Hum automatically smart 3-way split tayyar karenge.
          </p>
          <div className={styles.presetGrid}>
            {PRESETS.map((p) => (
              <button
                key={p.amount}
                className={`${styles.presetBtn} ${incomeAmount === p.amount ? styles.presetActive : ''}`}
                onClick={() => handlePreset(p.amount)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Income Amount (₹)</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputPrefix}>₹</span>
              <input
                type="number"
                className={styles.numInput}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  const num = Number(e.target.value)
                  if (num > 0) setIncomeAmount(num)
                }}
                min="1000"
                step="500"
              />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Email (Optional — Nudge receipt ke liye)</label>
            <div className={styles.emailWrap}>
              <Mail size={16} className={styles.emailIcon} />
              <input
                type="email"
                className={styles.emailInput}
                placeholder="example@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
          </div>
          <button 
            className={`btn btn-primary ${styles.triggerBtn}`}
            onClick={handleSimulateEvent}
            disabled={isSimulating}
            id="btn-simulate-paycheck"
          >
            {isSimulating ? (
              <span className="loading-dots"><span/><span/><span/></span>
            ) : (
              <>
                <Sparkles size={16} /> Salary Credit Simulate Karo
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {nudgeResult && !detectedSalaryEvent && (
            <motion.div 
              className={styles.nudgeCard}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.nudgeHeader}>
                <span className={styles.nudgeTag}>💰 Paisa Dost Smart Nudge</span>
                {customEmail && <span className={styles.emailSentBadge}>📧 Email Sent</span>}
              </div>
              <p className={styles.nudgeMsg}>{nudgeResult.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Sliders size={18} className={styles.goldIcon} />
            <h3 className={styles.cardTitle}>Aise Baantein (Smart 3-Way Split)</h3>
          </div>
          <div className={styles.slidersContainer}>
            <div className={styles.sliderItem}>
              <div className={styles.sliderHeader}>
                <div className={styles.sliderLabelWrap}>
                  <Shield size={16} className={styles.goldIcon} />
                  <div>
                    <div className={styles.sliderName}>Emergency Fund</div>
                    <div className={styles.sliderSubtitle}>Achanak kharche ke liye (Safe)</div>
                  </div>
                </div>
                <div className={styles.sliderValueWrap}>
                  <span className={styles.sliderAmount}>₹{emergencyAmount.toLocaleString('en-IN')}</span>
                  <span className={styles.sliderPercent}>({emergencyPct}%)</span>
                </div>
              </div>
              <input 
                type="range"
                className={`${styles.rangeInput} ${styles.rangeGold}`}
                min="5"
                max="50"
                value={emergencyPct}
                onChange={(e) => handleEmergencyChange(e.target.value)}
              />
            </div>
            <div className={styles.sliderItem}>
              <div className={styles.sliderHeader}>
                <div className={styles.sliderLabelWrap}>
                  <TrendingUp size={16} className={styles.greenIcon} />
                  <div>
                    <div className={styles.sliderName}>Monthly SIP</div>
                    <div className={styles.sliderSubtitle}>Bina tension lambi daud (Wealth)</div>
                  </div>
                </div>
                <div className={styles.sliderValueWrap}>
                  <span className={`${styles.sliderAmount} ${styles.greenText}`}>₹{sipAmount.toLocaleString('en-IN')}</span>
                  <span className={styles.sliderPercent}>({sipPct}%)</span>
                </div>
              </div>
              <input 
                type="range"
                className={`${styles.rangeInput} ${styles.rangeGreen}`}
                min="5"
                max="50"
                value={sipPct}
                onChange={(e) => handleSipChange(e.target.value)}
              />
            </div>
            <div className={styles.sliderItem}>
              <div className={styles.sliderHeader}>
                <div className={styles.sliderLabelWrap}>
                  <Coffee size={16} className={styles.amberIcon} />
                  <div>
                    <div className={styles.sliderName}>Kharcha & Fun Money</div>
                    <div className={styles.sliderSubtitle}>Dosto ke saath chill, OTT, khana</div>
                  </div>
                </div>
                <div className={styles.sliderValueWrap}>
                  <span className={styles.sliderAmount}>₹{funAmount.toLocaleString('en-IN')}</span>
                  <span className={styles.sliderPercent}>({funPct}%)</span>
                </div>
              </div>
              <div className={styles.progressWrap}>
                <div 
                  className={styles.progressBar}
                  style={{ width: `${funPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className={styles.visualBar}>
            <div 
              className={styles.barSegmentEmergency} 
              style={{ width: `${emergencyPct}%` }}
              title={`Emergency: ${emergencyPct}%`}
            />
            <div 
              className={styles.barSegmentSip} 
              style={{ width: `${sipPct}%` }}
              title={`SIP: ${sipPct}%`}
            />
            <div 
              className={styles.barSegmentFun} 
              style={{ width: `${funPct}%` }}
              title={`Fun: ${funPct}%`}
            />
          </div>
          <div className={styles.legend}>
            <span><i className={styles.dotGold}/> Emergency {emergencyPct}%</span>
            <span><i className={styles.dotGreen}/> SIP {sipPct}%</span>
            <span><i className={styles.dotAmber}/> Kharcha {funPct}%</span>
          </div>
          {!isApproved ? (
            <button 
              className={`btn btn-primary ${styles.approveBtn}`}
              onClick={handleApproveSplit}
              id="btn-approve-split"
            >
              <CheckCircle size={18} /> Ye Split Approve Karo (₹{sipAmount.toLocaleString('en-IN')} SIP)
            </button>
          ) : (
            <motion.div 
              className={styles.approvedSuccessCard}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className={styles.approvedHeader}>
                <CheckCircle size={20} className={styles.greenIcon} />
                <span>{approvedMsg}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/chat')}
                style={{ width: '100%', marginTop: 10 }}
              >
                Copilot Se Fund Pick Karo <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </div>
      </div>
      <AutoSyncModal 
        isOpen={showSyncModal} 
        onClose={() => setShowSyncModal(false)} 
        onSimulateSuccess={handleAutoSyncDetected}
      />
      <GmailSyncModal 
        isOpen={showGmailModal} 
        onClose={() => setShowGmailModal(false)} 
        onSyncSuccess={handleAutoSyncDetected}
        userEmail={userEmail || ''}
        sessionId={sessionId || ''}
      />

      {/* App Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
