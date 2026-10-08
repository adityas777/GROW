import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Calendar, Zap, Share2, RotateCcw, 
  Award, CheckCircle2, Flame, Compass, ChevronRight, X
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend 
} from 'recharts';
import { 
  TIME_MACHINE_STOCKS, 
  HISTORICAL_ERAS, 
  simulateCompounding, 
  formatIndianCurrency 
} from '../lib/timeMachineData';
import styles from './TimeMachineGame.module.css';

function playTimeWarpSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    // Ignore audio errors
  }
}

export default function TimeMachineGame({ onClose, onStartSipInChat }) {
  const [startYear, setStartYear] = useState(1983);
  const [sipAmount, setSipAmount] = useState(500);
  const [selectedStockIds, setSelectedStockIds] = useState(['wipro', 'titan', 'reliance']);
  const [customSplits, setCustomSplits] = useState({});
  const [isEqualSplit, setIsEqualSplit] = useState(true);

  const [isWarping, setIsWarping] = useState(false);
  const [warpYear, setWarpYear] = useState(1983);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const resultsRef = useRef(null);

  const currentEra = HISTORICAL_ERAS.find(e => e.year === startYear) || {
    year: startYear,
    title: `${startYear} Flashback`,
    icon: '⏳',
    marketTrivia: `Investing in ${startYear} required paper certificates and physical brokers on Dalal Street!`
  };

  const toggleStock = (stockId) => {
    if (selectedStockIds.includes(stockId)) {
      if (selectedStockIds.length === 1) return;
      setSelectedStockIds(prev => prev.filter(id => id !== stockId));
    } else {
      setSelectedStockIds(prev => [...prev, stockId]);
    }
  };

  const computeAllocations = () => {
    const count = selectedStockIds.length;
    if (isEqualSplit || count === 0) {
      const share = 100 / count;
      return selectedStockIds.map(id => ({ stockId: id, percentage: share }));
    }
    let totalAssigned = 0;
    selectedStockIds.forEach(id => {
      totalAssigned += (customSplits[id] || 0);
    });
    if (totalAssigned <= 0) {
      const share = 100 / count;
      return selectedStockIds.map(id => ({ stockId: id, percentage: share }));
    }
    return selectedStockIds.map(id => ({
      stockId: id,
      percentage: ((customSplits[id] || 0) / totalAssigned) * 100
    }));
  };

  const handleTimeTravel = () => {
    playTimeWarpSound();
    setIsWarping(true);
    setWarpYear(startYear);

    const allocs = computeAllocations();
    const simResult = simulateCompounding({
      startYear,
      endYear: 2026,
      monthlySipAmount: sipAmount,
      allocations: allocs
    });

    const stepInterval = Math.max(15, Math.floor(1000 / (2026 - startYear)));
    let current = startYear;

    const timer = setInterval(() => {
      current += 1;
      if (current >= 2026) {
        clearInterval(timer);
        setWarpYear(2026);
        setTimeout(() => {
          setIsWarping(false);
          setResults(simResult);
          setShowResults(true);
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 200);
      } else {
        setWarpYear(current);
      }
    }, stepInterval);
  };

  const handleShare = () => {
    if (!results) return;
    const stockNames = results.stockBreakdown.map(s => s.name).join(', ');
    const text = `⏳ GROWW TIME MACHINE SIMULATION\n\n` +
      `📅 Start Year: ${results.startYear}\n` +
      `💵 Monthly SIP: ₹${results.monthlySipAmount}/mo\n` +
      `📈 Stocks: ${stockNames}\n` +
      `---------------------------\n` +
      `💰 Total Invested: ${formatIndianCurrency(results.totalInvested)}\n` +
      `🚀 Valuation Today (2026): ${formatIndianCurrency(results.finalTotalValue)}\n` +
      `🔥 Wealth Multiplier: ${results.multiplier}x return!\n\n` +
      `Compounding is truly the 8th wonder of the world. Test your own SIP on Pehla ₹500!`;

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  return (
    <div className={styles.gameWrapper}>
      {/* Top bar inside the game */}
      <div className={styles.topBar}>
        <div className={styles.titleWrap}>
          <div className={styles.arcadeBadge}>
            <Sparkles size={13} />
            <span>Interactive Game</span>
          </div>
          <h2 className={styles.gameTitle}>Compounding Time Machine ⏳</h2>
          <p className={styles.gameSubtitle}>
            Dekho past mein ₹{sipAmount} ki SIP lagate toh aaj kitne Crores bante!
          </p>
        </div>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Control Deck */}
      <div className={styles.controlDeck}>
        {/* Step 1: Destination Year */}
        <div className={styles.stepCard}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepName}>Start Year in Past</span>
            <span className={styles.yearsCompounded}>({2026 - startYear} yrs compounding)</span>
          </div>

          <div className={styles.yearDisplay}>
            <Calendar size={18} className={styles.goldColor} />
            <span className={styles.bigYear}>{startYear}</span>
          </div>

          <input 
            type="range"
            min={1983}
            max={2022}
            value={startYear}
            onChange={(e) => {
              setStartYear(parseInt(e.target.value, 10));
              setShowResults(false);
            }}
            className={styles.rangeInput}
          />

          <div className={styles.eraPills}>
            {HISTORICAL_ERAS.map(era => (
              <button
                key={era.year}
                className={`${styles.eraBtn} ${startYear === era.year ? styles.eraBtnActive : ''}`}
                onClick={() => {
                  setStartYear(era.year);
                  setShowResults(false);
                }}
              >
                {era.icon} {era.year}
              </button>
            ))}
          </div>

          <div className={styles.triviaBox}>
            <span className={styles.triviaIcon}>{currentEra.icon}</span>
            <span className={styles.triviaText}>{currentEra.marketTrivia}</span>
          </div>
        </div>

        {/* Step 2: Monthly SIP Amount */}
        <div className={styles.stepCard}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepName}>Monthly SIP Amount</span>
          </div>

          <div className={styles.amountGrid}>
            {[500, 1000, 2500, 5000].map(amt => (
              <button
                key={amt}
                className={`${styles.amtBtn} ${sipAmount === amt ? styles.amtBtnActive : ''}`}
                onClick={() => {
                  setSipAmount(amt);
                  setShowResults(false);
                }}
              >
                {amt === 500 && <span className={styles.badgePehla}>Pehla ₹500</span>}
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Pick Stocks */}
        <div className={styles.stepCard}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepName}>Pick Your Stocks ({selectedStockIds.length} selected)</span>
          </div>

          <div className={styles.stocksList}>
            {TIME_MACHINE_STOCKS.map(stock => {
              const isSelected = selectedStockIds.includes(stock.id);
              return (
                <div
                  key={stock.id}
                  className={`${styles.stockRow} ${isSelected ? styles.stockRowActive : ''}`}
                  onClick={() => {
                    toggleStock(stock.id);
                    setShowResults(false);
                  }}
                >
                  <span className={styles.stockAvatar}>{stock.avatar}</span>
                  <div className={styles.stockDetails}>
                    <div className={styles.stockTitleLine}>
                      <span className={styles.stockName}>{stock.name}</span>
                      <span className={styles.cagrTag}>~{stock.cagr}%</span>
                    </div>
                    <span className={styles.stockFactText}>{stock.fact}</span>
                  </div>
                  {isSelected && <CheckCircle2 size={16} className={styles.goldColor} />}
                </div>
              );
            })}
          </div>

          {selectedStockIds.length > 1 && (
            <div className={styles.splitToggleRow}>
              <button 
                className={`${styles.splitBtn} ${isEqualSplit ? styles.splitBtnActive : ''}`}
                onClick={() => setIsEqualSplit(true)}
              >
                Equal Split ({Math.round(100 / selectedStockIds.length)}% each)
              </button>
              <button 
                className={`${styles.splitBtn} ${!isEqualSplit ? styles.splitBtnActive : ''}`}
                onClick={() => setIsEqualSplit(false)}
              >
                Custom %
              </button>
            </div>
          )}

          {!isEqualSplit && selectedStockIds.length > 1 && (
            <div className={styles.customSliders}>
              {selectedStockIds.map(stockId => {
                const stock = TIME_MACHINE_STOCKS.find(s => s.id === stockId);
                const currentVal = customSplits[stockId] ?? Math.round(100 / selectedStockIds.length);
                return (
                  <div key={stockId} className={styles.sliderRow}>
                    <span className={styles.sliderLabel}>{stock?.ticker}</span>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={currentVal}
                      onChange={(e) => {
                        setCustomSplits(prev => ({
                          ...prev,
                          [stockId]: parseInt(e.target.value, 10)
                        }));
                        setShowResults(false);
                      }}
                      className={styles.weightRange}
                    />
                    <span className={styles.sliderVal}>{currentVal}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Big Action Launch Button */}
        <motion.button
          className={styles.bigLaunchBtn}
          onClick={handleTimeTravel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isWarping}
          id="btn-time-travel-inline"
        >
          <Zap size={20} />
          <span>WHAT WILL YOUR PORTFOLIO LOOK LIKE? 🚀</span>
        </motion.button>
      </div>

      {/* Time Warp Overlay */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            className={styles.warpModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.warpBody}>
              <div className={styles.warpSpin}>⏳</div>
              <div className={styles.warpCount}>{warpYear}</div>
              <p className={styles.warpNote}>Compounding monthly ₹{sipAmount} & reinvesting dividends...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Dashboard */}
      {showResults && results && (
        <div className={styles.resultsDeck} ref={resultsRef}>
          {/* Hero valuation card */}
          <div className={styles.heroValuationCard}>
            <div className={styles.heroTop}>
              <span className={styles.celebrateBadge}>🎉 2026 Valuation</span>
              <button className={styles.miniShareBtn} onClick={handleShare}>
                <Share2 size={14} />
                <span>{copiedToast ? 'Copied!' : 'Share'}</span>
              </button>
            </div>

            <div className={styles.bigValuationText}>
              {formatIndianCurrency(results.finalTotalValue)}
            </div>

            <div className={styles.heroSubMeta}>
              Invested: <strong>{formatIndianCurrency(results.totalInvested)}</strong> (₹{results.monthlySipAmount}/mo)
            </div>

            <div className={styles.multiplierPill}>
              🚀 <strong>{results.multiplier}x Return</strong> (+{formatIndianCurrency(results.absoluteGain)} Gain)
            </div>
          </div>

          {/* Reality check comparison */}
          <div className={styles.compareCard}>
            <div className={styles.compareTitle}>
              <Flame size={16} className={styles.flameColor} />
              <span>Reality Check vs Traditional Options</span>
            </div>

            <div className={styles.compareBarsList}>
              <div className={styles.barItem}>
                <div className={styles.barLabelRow}>
                  <span>Bank Savings (4%)</span>
                  <span>{formatIndianCurrency(results.savingsValue)}</span>
                </div>
                <div className={styles.track}>
                  <div 
                    className={`${styles.fill} ${styles.fillSavings}`}
                    style={{ width: `${Math.max(6, (results.savingsValue / results.finalTotalValue) * 100)}%` }}
                  />
                </div>
              </div>

              <div className={styles.barItem}>
                <div className={styles.barLabelRow}>
                  <span>Physical Gold (8.5%)</span>
                  <span>{formatIndianCurrency(results.goldValue)}</span>
                </div>
                <div className={styles.track}>
                  <div 
                    className={`${styles.fill} ${styles.fillGold}`}
                    style={{ width: `${Math.max(14, (results.goldValue / results.finalTotalValue) * 100)}%` }}
                  />
                </div>
              </div>

              <div className={styles.barItem}>
                <div className={styles.barLabelRow}>
                  <span className={styles.goldColor}>Stocks Compounding (~{results.overallCagr}%)</span>
                  <span className={styles.goldColor}>{formatIndianCurrency(results.finalTotalValue)}</span>
                </div>
                <div className={styles.track}>
                  <div className={`${styles.fill} ${styles.fillStocks}`} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Hockey-stick compounding chart */}
          <div className={styles.chartBox}>
            <h4 className={styles.chartHeading}>The Hockey-Stick Compounding Curve</h4>
            <p className={styles.chartSub}>Early years look flat, then wealth violently accelerates!</p>
            
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={results.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartValGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="year" stroke="#777" tick={{ fontSize: 11 }} />
                  <YAxis 
                    stroke="#777" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatIndianCurrency(v)} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: 8, fontSize: 12 }}
                    formatter={(val, name) => [
                      formatIndianCurrency(val), 
                      name === 'totalValue' ? 'Compounded Value' : 'Invested'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalValue" 
                    stroke="#D4AF37" 
                    strokeWidth={2.5} 
                    fill="url(#chartValGrad)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invested" 
                    stroke="#38bdf8" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3"
                    fill="none" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock breakdown */}
          <div className={styles.breakdownBox}>
            <h4 className={styles.breakdownHeading}>Stock Breakdown</h4>
            <div className={styles.breakdownItems}>
              {results.stockBreakdown.map(item => (
                <div key={item.stockId} className={styles.breakdownRow}>
                  <div className={styles.bRowLeft}>
                    <span>{item.avatar}</span>
                    <div>
                      <div className={styles.bName}>{item.ticker}</div>
                      <div className={styles.bMeta}>{item.percentage.toFixed(0)}% • {formatIndianCurrency(item.invested)} in</div>
                    </div>
                  </div>
                  <div className={styles.bRowRight}>
                    <div className={styles.bVal}>{formatIndianCurrency(item.finalValue)}</div>
                    <div className={styles.bCagr}>~{item.cagr}% CAGR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gen Z Key Lesson */}
          <div className={styles.lessonBox}>
            <div className={styles.lessonIcon}>
              <Compass size={22} className={styles.goldColor} />
            </div>
            <div className={styles.lessonContent}>
              <h5>The Secret of Compounding</h5>
              <p>
                In this simulation, over <strong>75% of your crores were made in the final 10 years</strong>! 
                Starting your <strong>₹500 SIP today in 2026</strong> unlocks this exact exponential superpower for your future self.
              </p>
            </div>
          </div>

          {/* Action row */}
          <div className={styles.actionRow}>
            {onStartSipInChat ? (
              <button 
                className={styles.ctaStartBtn}
                onClick={() => onStartSipInChat(results)}
              >
                <Zap size={16} />
                <span>Start Real ₹{sipAmount} SIP in Chat</span>
              </button>
            ) : null}

            <button 
              className={styles.ctaRetryBtn}
              onClick={() => {
                setShowResults(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <RotateCcw size={14} />
              <span>Change Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
