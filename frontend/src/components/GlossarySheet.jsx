import { motion } from 'framer-motion'
import { X, BookOpen, Sparkles, Lightbulb, TrendingUp, HelpCircle } from 'lucide-react'
import styles from './GlossarySheet.module.css'

export default function GlossarySheet({ term, data, onClose }) {
  if (!term && !data) return null

  const displayTerm = data?.term || term || 'Financial Term'
  const meaning = data?.meaning || 'Simple explaination loaded from knowledge base.'
  const analogy = data?.analogy
  const example = data?.example
  const whyItMatters = data?.why_it_matters || data?.whyItMatters

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
        id="glossary-sheet"
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <BookOpen size={18} className={styles.icon} />
            </div>
            <div>
              <span className={styles.badge}>Jargon Decoder</span>
              <h2 className={styles.termTitle}>{displayTerm}</h2>
            </div>
          </div>
          <button className={`btn btn-ghost btn-sm ${styles.closeBtn}`} onClick={onClose} id="btn-glossary-close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Meaning */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Sparkles size={14} className={styles.goldAccent} />
              <h4>Simple Matlab</h4>
            </div>
            <p className={styles.sectionContent}>{meaning}</p>
          </div>

          {/* Analogy */}
          {analogy && (
            <div className={`${styles.sectionCard} ${styles.analogyCard}`}>
              <div className={styles.sectionHeader}>
                <Lightbulb size={14} className={styles.amberAccent} />
                <h4>Real-Life Analogy</h4>
              </div>
              <p className={styles.sectionContent}>{analogy}</p>
            </div>
          )}

          {/* ₹ Example */}
          {example && (
            <div className={`${styles.sectionCard} ${styles.exampleCard}`}>
              <div className={styles.sectionHeader}>
                <TrendingUp size={14} className={styles.greenAccent} />
                <h4>₹ Example Numbers</h4>
              </div>
              <p className={styles.sectionContent}>{example}</p>
            </div>
          )}

          {/* Why it matters */}
          {whyItMatters && (
            <div className={`${styles.sectionCard} ${styles.mattersCard}`}>
              <div className={styles.sectionHeader}>
                <HelpCircle size={14} className={styles.goldAccent} />
                <h4>Kyun Matter Karta Hai?</h4>
              </div>
              <p className={styles.sectionContent}>{whyItMatters}</p>
            </div>
          )}
        </div>

        <button className={`btn btn-secondary ${styles.gotItBtn}`} onClick={onClose}>
          Samajh Gaya 👍
        </button>
      </motion.div>
    </>
  )
}
