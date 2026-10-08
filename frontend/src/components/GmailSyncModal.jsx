import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, AlertCircle, Sparkles, X, ShieldCheck, ArrowRight, RefreshCw, Lock } from 'lucide-react';
import { api } from '../lib/api';
import styles from './GmailSyncModal.module.css';

const DEMO_SAMPLES = [
  { id: 'infosys', label: '💼 Infosys (₹1.2L)', amount: '₹1,20,000', bank: 'HDFC Bank' },
  { id: 'tcs', label: '🏦 TCS Payroll (₹85K)', amount: '₹85,000', bank: 'ICICI Bank' },
  { id: 'stipend', label: '🎓 Stipend (₹45K)', amount: '₹45,000', bank: 'Axis Bank' },
  { id: 'startup', label: '🏢 Startup (₹30K)', amount: '₹30,000', bank: 'Kotak Bank' },
];

const BACKEND = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

export function GmailSyncModal({ isOpen, onClose, onSyncSuccess, userEmail = '', sessionId = '' }) {
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [oauthEmail, setOauthEmail] = useState(userEmail); // confirmed email after OAuth
  const pollRef = useRef(null);
  const popupRef = useRef(null);

  // Display email — prefer OAuth-confirmed email, then session email
  const displayEmail = oauthEmail || userEmail || '';
  const avatarChar = displayEmail ? displayEmail.charAt(0).toUpperCase() : 'G';

  // Listen for message from OAuth popup
  useEffect(() => {
    const handler = (event) => {
      // Accept messages from the backend callback page
      if (!event.data || typeof event.data !== 'object') return;
      const { success, email, name, message: msg } = event.data;

      if (success) {
        setOauthEmail(email || '');
        // Popup closed — now scan Gmail
        handleScanAfterOAuth(email || oauthEmail);
      } else {
        setLoading(false);
        setScanStep('');
        setErrorMsg(msg || 'Google sign-in was cancelled or failed.');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [sessionId, oauthEmail]);

  if (!isOpen) return null;

  const openGooglePopup = () => {
    if (!sessionId) {
      setErrorMsg('Session not initialized. Please refresh the page.');
      return;
    }

    setLoading(true);
    setScanStep('Opening Google sign-in...');
    setErrorMsg('');
    setScanResult(null);

    const url = `${BACKEND}/auth/google?session_id=${encodeURIComponent(sessionId)}`;
    const popup = window.open(
      url,
      'GoogleOAuth',
      'width=500,height=620,scrollbars=yes,resizable=yes,top=100,left=200'
    );
    popupRef.current = popup;

    // Fallback: poll backend status if postMessage doesn't fire (popup blocker etc.)
    pollRef.current = setInterval(async () => {
      if (popup && popup.closed) {
        clearInterval(pollRef.current);
        // Check if token was stored
        try {
          const res = await fetch(`${BACKEND}/auth/google/status?session_id=${sessionId}`);
          const data = await res.json();
          if (data.authenticated) {
            setOauthEmail(data.email || '');
            handleScanAfterOAuth(data.email || '');
          } else {
            setLoading(false);
            setScanStep('');
            setErrorMsg('Sign-in was cancelled. Please try again.');
          }
        } catch {
          setLoading(false);
          setScanStep('');
        }
      }
    }, 800);
  };

  const handleScanAfterOAuth = async (email) => {
    setScanStep(`Scanning Gmail inbox for ${email || 'your account'}...`);
    await new Promise((r) => setTimeout(r, 400));

    try {
      const res = await api.syncGmailPaycheck({
        session_id: sessionId || undefined,
        email: email || undefined,
        max_search: 20,
      });

      setScanStep('Analyzing salary credit emails...');
      await new Promise((r) => setTimeout(r, 300));

      if (res && res.success && res.data) {
        setScanResult(res);
      } else {
        setErrorMsg(
          res?.message || 'No salary credit email found in recent inbox messages.'
        );
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Gmail scan failed.');
    } finally {
      setLoading(false);
      setScanStep('');
    }
  };

  const handleScanSample = async (sampleId) => {
    setLoading(true);
    setErrorMsg('');
    setScanResult(null);
    setScanStep('Parsing salary credit email...');

    try {
      const res = await api.syncGmailPaycheck({
        session_id: sessionId || undefined,
        email: displayEmail || undefined,
        max_search: 15,
        simulate_sample: sampleId,
      });

      if (res && res.success && res.data) {
        setScanResult(res);
      } else {
        setErrorMsg(res?.message || 'Could not parse sample email.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Simulation error.');
    } finally {
      setLoading(false);
      setScanStep('');
    }
  };

  const handleApplySplit = () => {
    if (scanResult && scanResult.data) {
      onSyncSuccess(scanResult.data);
      onClose();
    }
  };

  const handleClose = () => {
    clearInterval(pollRef.current);
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.googleIconCircle}>
              <Mail size={18} className={styles.googleIcon} />
            </div>
            <div>
              <h3 className={styles.title}>Sync with Gmail</h3>
              <p className={styles.subtitle}>Salary credit email scan karke instant split calculate karein</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Signed-In Account Card */}
        <div className={styles.accountCard}>
          <div className={styles.accountInfo}>
            <div className={styles.accountAvatar}>{avatarChar}</div>
            <div className={styles.accountDetails}>
              <span className={styles.accountLabel}>
                {displayEmail ? 'Signed In As' : 'Not signed in'}
              </span>
              <span className={styles.accountEmail}>
                {displayEmail || 'Click below to sign in with Google'}
              </span>
            </div>
          </div>
          <div className={styles.badgeSecure}>
            <ShieldCheck size={13} /> SSL Secured
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.loadingBox}>
            <div className={styles.pulseSpinner}>
              <RefreshCw size={24} className={styles.spinIcon} />
            </div>
            <span className={styles.loadingStepText}>{scanStep}</span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} />
            </div>
          </div>
        )}

        {/* Result */}
        {scanResult && !loading && (
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <CheckCircle2 size={20} className={styles.successCheck} />
              <div>
                <span className={styles.resultTag}>Salary Credit Email Detected!</span>
                <div className={styles.resultAmount}>
                  ₹{Number(scanResult.data.salary_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {scanResult.data.email_info && (
              <div className={styles.emailPreviewBox}>
                <div className={styles.emailMetaRow}>
                  <span className={styles.emailMetaKey}>Subject:</span>
                  <span className={styles.emailMetaVal}>{scanResult.data.email_info.subject}</span>
                </div>
                <div className={styles.emailMetaRow}>
                  <span className={styles.emailMetaKey}>From:</span>
                  <span className={styles.emailMetaVal}>{scanResult.data.email_info.sender}</span>
                </div>
                {scanResult.data.email_info.date && (
                  <div className={styles.emailMetaRow}>
                    <span className={styles.emailMetaKey}>Date:</span>
                    <span className={styles.emailMetaVal}>{scanResult.data.email_info.date}</span>
                  </div>
                )}
                {scanResult.data.email_info.snippet && (
                  <div className={styles.snippetText}>
                    "{scanResult.data.email_info.snippet}"
                  </div>
                )}
              </div>
            )}

            <button type="button" className={styles.applyBtn} onClick={handleApplySplit}>
              <Sparkles size={16} /> Apply Paycheck Split <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && !loading && !scanResult && (
          <div className={styles.noticeBox}>
            <AlertCircle size={16} className={styles.noticeIcon} />
            <div>
              <span className={styles.noticeTitle}>Scan Complete</span>
              <p className={styles.noticeText}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Sign In Button — only show when no result yet */}
        {!scanResult && (
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.googleOAuthBtn}
              disabled={loading}
              onClick={openGooglePopup}
            >
              <svg className={styles.gLogo} viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        )}

        {/* Sample Chips */}
        <div className={styles.samplesSection}>
          <div className={styles.samplesLabel}>
            <span>Or test with a Sample Salary Email:</span>
          </div>
          <div className={styles.chipsGrid}>
            {DEMO_SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className={styles.chipBtn}
                disabled={loading}
                onClick={() => handleScanSample(sample.id)}
              >
                <div className={styles.chipLabel}>{sample.label}</div>
                <div className={styles.chipBank}>{sample.bank}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy Note */}
        <div className={styles.privacyNote}>
          <ShieldCheck size={13} className={styles.privacyIcon} />
          <span>
            Bank salary notifications are parsed in memory. Zero personal emails are stored on our servers.
          </span>
        </div>
      </div>
    </div>
  );
}
