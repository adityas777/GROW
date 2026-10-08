import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Shield, TrendingUp, Calendar, AlertCircle, 
  PlusCircle, RefreshCw, Sparkles, MessageSquare, DollarSign, Activity
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { api } from '../lib/api'
import BottomNav from '../components/BottomNav.jsx'
import styles from './PortfolioPage.module.css'

export default function PortfolioPage() {
  const navigate = useNavigate()
  const { sessionId } = useSession()
  const [portfolio, setPortfolio] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)

  async function fetchPortfolio() {
    setIsLoading(true)
    try {
      const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
      const data = await api.getPortfolio(activeSession)
      setPortfolio(data)
    } catch (err) {
      console.error('Failed to load portfolio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSeedDemo() {
    setIsSeeding(true)
    try {
      const activeSession = sessionId || localStorage.getItem('pehla_session_id') || 'local-demo'
      await api.seedPortfolio(activeSession)
      await fetchPortfolio()
    } catch (err) {
      console.error('Failed to seed demo order:', err)
      alert('Could not add demo SIP: ' + err.message)
    } finally {
      setIsSeeding(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
  }, [sessionId])

  const orders = portfolio?.orders || []
  const totalInvested = portfolio?.total_invested || 0
  const currentValue = portfolio?.current_value || 0
  const gain = portfolio?.gain_loss || 0
  const gainPct = portfolio?.gain_loss_pct || 0

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button 
          className={`btn btn-ghost btn-sm ${styles.backBtn}`}
          onClick={() => navigate('/chat')}
          id="btn-portfolio-back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>Mera Portfolio</h1>
          <span className={styles.subtitle}>Sandbox Test Account</span>
        </div>
        <button 
          className={`btn btn-ghost btn-sm ${styles.refreshBtn}`}
          onClick={fetchPortfolio}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
        </button>
      </header>

      {/* Sandbox Banner */}
      <div className={styles.bannerWrap}>
        <div className="sandbox-banner">
          <Shield size={13} />
          <span>SANDBOX MODE — Dummy funds and illustrative returns. Koi real paisa nahi lag raha.</span>
        </div>
      </div>

      <div className={styles.content}>
        {/* Total Wealth Card */}
        <motion.div 
          className={styles.wealthCard}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.cardGlow} />
          <div className={styles.wealthHeader}>
            <span className={styles.cardLabel}>Kul Sampatti (Total Value)</span>
            <span className={styles.growthBadge}>
              <TrendingUp size={13} /> +{gainPct}%
            </span>
          </div>

          <div className={styles.wealthValue}>
            ₹{currentValue.toLocaleString('en-IN')}
          </div>

          <div className={styles.wealthStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Lagaya Gaya (Invested)</span>
              <span className={styles.statNum}>₹{totalInvested.toLocaleString('en-IN')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Sanrachit Labh (Returns)</span>
              <span className={`${styles.statNum} ${styles.greenText}`}>
                +₹{gain.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Behavioral Reassurance Note */}
        <div className={styles.dipCoachCard}>
          <div className={styles.dipCoachHeader}>
            <Sparkles size={16} className={styles.dipCoachIcon} />
            <h4>Bina Tension Wala Niyam</h4>
          </div>
          <p>
            Agar market kal thoda niche bhi gire, panic mat hona! Regular ₹500 SIP me "Rupee Cost Averaging" hoti hai — saste me zyada units milti hain.
          </p>
        </div>

        {/* Active SIPs List */}
        <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className={styles.sectionTitle}>Active Sandbox SIPs ({orders.length})</h3>
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleSeedDemo}
            disabled={isSeeding}
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '3px 8px' }}
            title="Add instant ₹500 test SIP"
          >
            <Sparkles size={12} /> {isSeeding ? 'Adding...' : '+ ₹500 Test SIP'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <DollarSign size={28} className={styles.emptyIcon} />
            </div>
            <h4 className={styles.emptyTitle}>Abhi koi investment nahi hai</h4>
            <p className={styles.emptyDesc}>
              Apna pehla ₹500 investment test karne ke liye neeche button dabao ya Paisa Dost copilot se baat karo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
              <button 
                className="btn btn-primary"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                id="btn-seed-demo-sip"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Sparkles size={16} /> {isSeeding ? 'Adding Demo SIP...' : '⚡ Instant Test: Add ₹500 SIP'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/chat')}
                id="btn-start-first-sip"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <PlusCircle size={16} /> Copilot Se Baat Karo
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order, index) => (
              <motion.div 
                key={order.order_id || index}
                className={styles.orderCard}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={styles.orderTop}>
                  <div>
                    <h4 className={styles.orderFund}>{order.fund_name || 'Nifty 50 Index Fund'}</h4>
                    <span className={styles.orderMeta}>Monthly Recurring SIP</span>
                  </div>
                  <span className={`risk-chip risk-${order.risk_level?.toLowerCase() || 'low'}`}>
                    {order.risk_level || 'Low'} Risk
                  </span>
                </div>

                <div className={styles.orderBottom}>
                  <div className={styles.orderAmountWrap}>
                    <span className={styles.orderAmount}>₹{order.monthly_amount?.toLocaleString('en-IN')}</span>
                    <span className={styles.orderPerMonth}>/ month</span>
                  </div>
                  <span className={styles.statusBadge}>
                    Active
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        <div className={styles.actionGrid}>
          <button 
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={() => navigate('/chat')}
          >
            <MessageSquare size={16} /> Copilot Se Baat Karo
          </button>
          <button 
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={() => navigate('/timemachine')}
            id="btn-timemachine-portfolio"
          >
            <Sparkles size={16} /> Time Machine ⏳
          </button>
          <button 
            className={`btn btn-secondary ${styles.actionBtn}`}
            onClick={() => navigate('/paycheck')}
          >
            <Activity size={16} /> Paycheck Split
          </button>
        </div>
      </div>

      {/* App Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
