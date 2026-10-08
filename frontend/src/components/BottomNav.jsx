import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Sparkles, BarChart2, DollarSign } from 'lucide-react';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'chat', label: 'Copilot', icon: MessageSquare, path: '/chat' },
    { id: 'timemachine', label: 'Time Machine', icon: Sparkles, path: '/timemachine' },
    { id: 'portfolio', label: 'Portfolio', icon: BarChart2, path: '/portfolio' },
    { id: 'paycheck', label: 'Salary Split', icon: DollarSign, path: '/paycheck' },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Main Navigation">
      <div className={styles.navContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => navigate(tab.path)}
              id={`nav-tab-${tab.id}`}
            >
              <div className={styles.iconWrap}>
                <Icon size={18} />
                {tab.id === 'timemachine' && <span className={styles.hotBadge}>Game</span>}
              </div>
              <span className={styles.navLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
