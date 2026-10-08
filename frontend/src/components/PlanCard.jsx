import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, ChevronRight, Info } from 'lucide-react'
import styles from './PlanCard.module.css'

export default function PlanCard({ plan, onConfirm, onExplain }) {
  if (!plan) return null

  const riskColor = plan.risk?.toLowerCase() === 'low' ? 'green' : plan.risk?.toLowerCase() === 'high' ? 'red' : 'amber'

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.fundIcon}>
          <TrendingUp size={18} />
        </div>
        <div className={styles.headerText}>
          <div className={styles.fundName}>{plan.fund_name}</div>
          <div className={styles.fundCategory}>{plan.category}</div>
        </div>
      </div>

      {/* One-liner */}
      <p className={styles.oneLiner}>{plan.one_line}</p>

      {/* Risk + Cost row */}
      <div className={styles.metaRow}>
        <span className={`risk-chip risk-${plan.risk?.toLowerCase()}`}>
          {plan.risk === 'Low' ? '🟢' : plan.risk === 'High' ? '🔴' : '🟡'} {plan.risk}
        </span>
        <span className={styles.expenseRatio}>
          {plan.expense_ratio}% / year
          <button className={styles.infoBtn} onClick={() => onExplain?.('expense ratio')}>
            <Info size={11} />
          </button>
        </span>
        <span className={styles.navInfo}>NAV ₹{plan.mock_nav}</span>
      </div>

      {/* What can go wrong */}
      <div className={styles.warningBox}>
        <AlertTriangle size={14} className={styles.warningIcon} />
        <p className={styles.warningText}>
          <strong>Kya galat ho sakta hai:</strong> {plan.what_can_go_wrong}
        </p>
      </div>

      {/* Amount */}
      <div className={styles.amountRow}>
        <div className={styles.amountLabel}>Monthly SIP</div>
        <div className={styles.amountValue}>₹{plan.amount?.toLocaleString('en-IN')}</div>
      </div>

      {/* Mock return */}
      {plan.mock_1yr_return && (
        <div className={styles.returnNote}>
          📈 Past 1-year return: {plan.mock_1yr_return}% — <em>not a guarantee of future returns</em>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button className={`btn btn-ghost btn-sm ${styles.explainBtn}`} onClick={() => onExplain?.('sip')}>
          Samjhao simple mein
        </button>
        <motion.button
          className={`btn btn-primary ${styles.confirmBtn}`}
          onClick={onConfirm}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          id="btn-plan-confirm"
        >
          Confirm karo <ChevronRight size={16} />
        </motion.button>
      </div>

      <p className={styles.disclaimer}>
        *SANDBOX MODE — No real money. Illustrative data only.*
      </p>
    </motion.div>
  )
}
