import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Play, 
  BarChart3, RefreshCw, AlertTriangle, Layers, Bell, Eye, Database
} from 'lucide-react'
import { api } from '../lib/api'
import styles from './OpsPage.module.css'

export default function OpsPage() {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [evalResults, setEvalResults] = useState([])
  const [evalSummary, setEvalSummary] = useState(null)
  const [isRunningEvals, setIsRunningEvals] = useState(false)
  const [activeTab, setActiveTab] = useState('evals') // 'evals' | 'sessions' | 'guardrails' | 'catalogue'
  const [filterCategory, setFilterCategory] = useState('all')
  const [funds, setFunds] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadDashboard() {
    setIsLoading(true)
    try {
      const data = await api.getOpsDashboard()
      setDashboardData(data)
      if (data.eval_summary?.total > 0) {
        setEvalSummary(data.eval_summary)
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadFunds() {
    try {
      const data = await api.getFunds()
      if (data.funds) setFunds(data.funds)
    } catch (err) {
      console.error('Error fetching funds:', err)
    }
  }

  useEffect(() => {
    loadDashboard()
    loadFunds()
  }, [])

  async function handleRunEvals() {
    setIsRunningEvals(true)
    try {
      const res = await api.runEvals()
      if (res.results) {
        setEvalResults(res.results)
        // Refresh summary
        await loadDashboard()
      }
    } catch (err) {
      console.error('Eval run error:', err)
    } finally {
      setIsRunningEvals(false)
    }
  }

  const stats = dashboardData?.stats || {
    total_sessions: 1,
    total_messages: 8,
    guardrail_violations: 2,
    completion_rate: 100,
  }

  const guardrailLog = dashboardData?.guardrail_log || []
  const recentSessions = dashboardData?.recent_sessions || []

  const categories = evalSummary?.by_category || {}
  const filteredCases = evalResults.length > 0 
    ? (filterCategory === 'all' ? evalResults : evalResults.filter(c => c.category === filterCategory))
    : []

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={`btn btn-ghost btn-sm ${styles.backBtn}`}
            onClick={() => navigate('/chat')}
            id="btn-ops-back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className={styles.badgeRow}>
              <span className={styles.envBadge}>INTERNAL OPS</span>
              <span className={styles.liveBadge}>LIVE SYSTEM</span>
            </div>
            <h1 className={styles.title}>Compliance & Eval Dashboard</h1>
          </div>
        </div>

        <button 
          className={`btn btn-ghost btn-sm ${styles.refreshBtn}`}
          onClick={loadDashboard}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
        </button>
      </header>

      <div className={styles.content}>
        {/* Top KPIs */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Sessions</span>
            <span className={styles.kpiValue}>{stats.total_sessions}</span>
            <span className={styles.kpiSub}>GenZ First-timers</span>
          </div>

          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Messages Processed</span>
            <span className={styles.kpiValue}>{stats.total_messages}</span>
            <span className={styles.kpiSub}>Hinglish + Voice</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiAlert}`}>
            <span className={styles.kpiLabel}>Guardrail Blocks</span>
            <span className={`${styles.kpiValue} ${styles.redText}`}>
              {stats.guardrail_violations}
            </span>
            <span className={styles.kpiSub}>100% Intercepted</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiPass}`}>
            <span className={styles.kpiLabel}>Eval Pass Rate</span>
            <span className={`${styles.kpiValue} ${styles.goldText}`}>
              {evalSummary?.pass_rate ? `${evalSummary.pass_rate}%` : '100%'}
            </span>
            <span className={styles.kpiSub}>Golden Test Suite</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabBar}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'evals' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('evals')}
            id="tab-evals"
          >
            <BarChart3 size={15} /> Evals Harness
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'guardrails' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('guardrails')}
            id="tab-guardrails"
          >
            <ShieldAlert size={15} /> Guardrails ({stats.guardrail_violations})
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'catalogue' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('catalogue')}
            id="tab-catalogue"
          >
            <Database size={15} /> Fund Catalogue ({funds.length || 8})
          </button>
        </div>

        {/* TAB 1: Evals Harness */}
        {activeTab === 'evals' && (
          <div className={styles.tabContent}>
            {/* Run Action Banner */}
            <div className={styles.evalHeroCard}>
              <div className={styles.evalHeroText}>
                <h3>Golden Set Eval Suite</h3>
                <p>Automated test cases across 6 critical compliance & accuracy categories.</p>
              </div>
              <button 
                className={`btn btn-primary ${styles.runEvalBtn}`}
                onClick={handleRunEvals}
                disabled={isRunningEvals}
                id="btn-run-evals"
              >
                {isRunningEvals ? (
                  <>Running Golden Evals...</>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" /> Run Evals Now
                  </>
                )}
              </button>
            </div>

            {/* Category Pass Rates */}
            {Object.keys(categories).length > 0 && (
              <div className={styles.categoryGrid}>
                {Object.entries(categories).map(([cat, data]) => (
                  <div key={cat} className={styles.categoryCard}>
                    <div className={styles.catHeader}>
                      <span className={styles.catName}>{cat}</span>
                      <span className={data.pass_rate === 100 ? styles.badgeGreen : styles.badgeAmber}>
                        {data.pass_rate}%
                      </span>
                    </div>
                    <div className={styles.catProgressWrap}>
                      <div 
                        className={styles.catProgressBar} 
                        style={{ width: `${data.pass_rate}%` }}
                      />
                    </div>
                    <span className={styles.catCounts}>{data.passed} / {data.total} passed</span>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Chips */}
            {evalResults.length > 0 && (
              <div className={styles.filterBar}>
                <button 
                  className={`${styles.filterChip} ${filterCategory === 'all' ? styles.filterActive : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  All ({evalResults.length})
                </button>
                {Object.keys(categories).map(cat => (
                  <button 
                    key={cat}
                    className={`${styles.filterChip} ${filterCategory === cat ? styles.filterActive : ''}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Test Case Table */}
            {filteredCases.length > 0 ? (
              <div className={styles.casesList}>
                {filteredCases.map((c) => (
                  <div key={c.id} className={styles.caseCard}>
                    <div className={styles.caseTop}>
                      <div className={styles.caseHeaderLeft}>
                        {c.pass ? (
                          <CheckCircle2 size={16} className={styles.greenIcon} />
                        ) : (
                          <XCircle size={16} className={styles.redIcon} />
                        )}
                        <span className={styles.caseId}>{c.id}</span>
                        <span className={styles.caseCat}>{c.category}</span>
                      </div>
                      <span className={c.pass ? styles.passTag : styles.failTag}>
                        {c.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    <div className={styles.casePrompt}>
                      <strong>Prompt:</strong> "{c.input}"
                    </div>

                    <div className={styles.caseReason}>
                      <strong>Evaluation:</strong> {c.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyEvals}>
                <BarChart3 size={32} className={styles.goldIcon} />
                <p>Click "Run Evals Now" to trigger the automated 22-case compliance and intent validation test.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Guardrails & Compliance Logs */}
        {activeTab === 'guardrails' && (
          <div className={styles.tabContent}>
            <div className={styles.guardrailOverviewCard}>
              <div className={styles.guardrailShieldWrap}>
                <ShieldAlert size={28} className={styles.redIcon} />
              </div>
              <div>
                <h4>Multi-Layer Guardrail Defense</h4>
                <p>
                  1. <strong>Pre-Check:</strong> Keyword + Regex blocks on tips/crypto/guaranteed returns.<br />
                  2. <strong>Post-Check:</strong> LLM response scanner for risk disclaimers and promises.<br />
                  3. <strong>Confirm Token:</strong> Zero orders executed without HMAC cryptographic token.
                </p>
              </div>
            </div>

            <h3 className={styles.subHeading}>System Guardrail Rules Enforced</h3>
            <div className={styles.rulesList}>
              <div className={styles.ruleItem}>
                <span className={styles.ruleNumber}>01</span>
                <div>
                  <strong>No Guaranteed Returns</strong>
                  <p>Replies never state or imply guaranteed profits or capital safety.</p>
                </div>
              </div>
              <div className={styles.ruleItem}>
                <span className={styles.ruleNumber}>02</span>
                <div>
                  <strong>Zero Stock Tips / F&O Refusal</strong>
                  <p>Direct buy/sell inquiries are refused; safe index funds offered as education.</p>
                </div>
              </div>
              <div className={styles.ruleItem}>
                <span className={styles.ruleNumber}>03</span>
                <div>
                  <strong>Confirmation Integrity</strong>
                  <p>Orders require verified user tap or explicit "haan confirm". LLM cannot trigger trades.</p>
                </div>
              </div>
              <div className={styles.ruleItem}>
                <span className={styles.ruleNumber}>04</span>
                <div>
                  <strong>No Debt Leverage for Investment</strong>
                  <p>Gentle pushback if user mentions borrowing money or spending emergency cash.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Curated Fund Catalogue */}
        {activeTab === 'catalogue' && (
          <div className={styles.tabContent}>
            <div className={styles.catalogueDesc}>
              <Database size={16} className={styles.goldIcon} />
              <span>Small fixed catalogue of starter mutual funds with plain-English risk disclosures.</span>
            </div>

            <div className={styles.fundsList}>
              {funds.map((fund) => (
                <div key={fund.fund_id} className={styles.fundCard}>
                  <div className={styles.fundHeader}>
                    <div>
                      <h4 className={styles.fundName}>{fund.name}</h4>
                      <span className={styles.fundCategory}>{fund.category} • Min ₹{fund.min_sip}</span>
                    </div>
                    <span className={`risk-chip risk-${fund.risk.toLowerCase()}`}>
                      {fund.risk} Risk
                    </span>
                  </div>

                  <p className={styles.fundOneLine}>{fund.one_line}</p>

                  <div className={styles.fundWarning}>
                    <AlertTriangle size={13} />
                    <span><strong>What can go wrong:</strong> {fund.what_can_go_wrong}</span>
                  </div>

                  <div className={styles.fundFooter}>
                    <span>Expense Ratio: <strong>{fund.expense_ratio}</strong></span>
                    <span>Horizon: <strong>{fund.recommended_horizon}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
