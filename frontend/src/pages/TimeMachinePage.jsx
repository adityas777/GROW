import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TimeMachineGame from '../components/TimeMachineGame.jsx';
import BottomNav from '../components/BottomNav.jsx';
import styles from './TimeMachinePage.module.css';

export default function TimeMachinePage() {
  const navigate = useNavigate();

  function handleStartSipInChat(simResult) {
    const stockNames = simResult.stockBreakdown.map(s => s.name).join(', ');
    navigate('/chat', {
      state: {
        presetPrompt: `Maine Time Machine simulation dekha! ₹${simResult.monthlySipAmount}/month SIP in ${stockNames} turned into ${simResult.multiplier}x return (${simResult.overallCagr}% CAGR). Mujhe abhi real SIP start karna hai. Best fund recommend karo!`
      }
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button 
          className={`btn btn-ghost btn-sm ${styles.backBtn}`}
          onClick={() => navigate('/chat')}
          id="btn-timemachine-back"
          aria-label="Back to Copilot"
        >
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>Time Machine ⏳</h1>
          <span className={styles.subtitle}>Compounding Simulation Game</span>
        </div>
      </header>

      <div className={styles.content}>
        <TimeMachineGame onStartSipInChat={handleStartSipInChat} />
      </div>

      <BottomNav />
    </div>
  );
}
