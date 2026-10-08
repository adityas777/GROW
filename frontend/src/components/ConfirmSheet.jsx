import { motion } from 'framer-motion'
import { X, Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import styles from './ConfirmSheet.module.css'

export default function ConfirmSheet({ plan, onConfirm, onClose, isLoading }) {
  if (!plan) return null

  return (
    <>
      <motion.div
        className="bottom-sheet-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="bottom-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        id="confirm-sheet"
      >
        {/* Handle bar */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <CheckCircle size={20} className={styles.checkIcon} />
            <h2 className={styles.title}>Confirm Investment</h2>
          </div>
          <button className={`btn btn-ghost btn-sm ${styles.closeBtn}`} onClick={onClose} id="btn-confirm-close">
            <X size={16} />
          </button>
        </div>

        {/* Sandbox warning */}
        <div className="sandbox-banner" style={{ marginBottom: 16 }}>
          <Shield size={12} />
          SANDBOX MODE — Koi real money nahi move hoga. Demo only.
        </div>

        {/* Details */}
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Fund</span>
            <span className={styles.value}>{plan.fund_name}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.detailRow}>
            <span className={styles.label}>Monthly SIP</span>
            <span className={`${styles.value} ${styles.amount}`}>₹{plan.amount?.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.detailRow}>
            <span className={styles.label}>Risk Level</span>
            <span className={`risk-chip risk-${plan.risk?.toLowerCase()}`}>
              {plan.risk === 'Low' ? '🟢' : plan.risk === 'High' ? '🔴' : '🟡'} {plan.risk}
            </span>
          </div>
          <div className={styles.divider} />
          <div className={styles.detailRow}>
            <span className={styles.label}>Horizon</span>
            <span className={styles.value}>{plan.horizon === 'long' ? '3+ years' : plan.horizon === 'medium' ? '1-3 years' : '< 1 year'}</span>
          </div>
        </div>

        {/* Risk reminder */}
        <div className={styles.riskReminder}>
          <AlertTriangle size={14} />
          <p>{plan.what_can_go_wrong}</p>
        </div>

        {/* Voice hint */}
        <p className={styles.voiceHint}>🎤 Ya bol sakte ho "haan, confirm" ya button press karo</p>

        {/* Confirm Button */}
        <motion.button
          className={`btn btn-primary btn-lg ${styles.confirmBtn}`}
          onClick={onConfirm}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          id="btn-final-confirm"
        >
          {isLoading ? (
            <span className="loading-dots"><span/><span/><span/></span>
          ) : (
            <>✅ Haan, Confirm Karo</>
          )}
        </motion.button>

        <p className={styles.legal}>
          Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.
        </p>
      </motion.div>
    </>
  )
}
