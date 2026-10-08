import React, { useState } from 'react';
import { MessageSquareText, Clipboard, Sparkles, X, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import styles from './AutoSyncModal.module.css';

const SAMPLE_MESSAGES = [
  {
    label: '💼 Infosys (₹1.2L)',
    text: 'Dear Customer, INR 1,20,000.00 credited to A/c XX4589 by INFOSYS SALARY on 01-OCT-26.',
  },
  {
    label: '🏦 TCS Payroll (₹85K)',
    text: 'Your A/c 9921 is credited with Rs 85,000.00 on 30-SEP-26 by TCS PAYROLL.',
  },
  {
    label: '🎓 Stipend (₹45K)',
    text: 'INR 45,000.00 deposited to A/c *1234 by STIPEND / WAGES on 05-OCT.',
  },
  {
    label: '🏢 Startup (₹30K)',
    text: 'Your account XX3456 has been credited with INR 30,000.00. Salary payment from CORP. Balance: 35,420.00',
  },
];

export function AutoSyncModal({ isOpen, onClose, onSimulateSuccess }) {
  const [smsText, setSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clipboardCopied, setClipboardCopied] = useState(false);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsText(text);
          setErrorMsg('');
          setClipboardCopied(true);
          setTimeout(() => setClipboardCopied(false), 1500);
          return;
        }
      }
    } catch {
      // Clipboard read permission might be denied or unsupported in some browsers
    }
    // Fallback: focus textarea
    const textarea = document.getElementById('salary-sms-textarea');
    if (textarea) textarea.focus();
  };

  const handleAnalyze = async (textToAnalyze) => {
    const text = (textToAnalyze || smsText).trim();
    if (!text) {
      setErrorMsg('Kripya SMS text paste karein ya sample chip select karein.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await api.simulatePaycheckSMS({ text, sender: 'HDFCBK' });
      if (data && data.success && data.data) {
        onSimulateSuccess(data.data);
        onClose();
      } else {
        setErrorMsg(data?.message || 'Is message mein salary amount detect nahi hua. Pura credit SMS paste karein.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'SMS parse karne mein dikkat aayi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sample) => {
    setSmsText(sample.text);
    setErrorMsg('');
    handleAnalyze(sample.text);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <div className={styles.iconCircle}>
              <MessageSquareText size={18} className={styles.headerIcon} />
            </div>
            <div>
              <h3 className={styles.title}>Paste Salary SMS</h3>
              <p className={styles.subtitle}>Bank SMS paste karo → amount & smart split auto-fill hoga</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Quick Paste from Clipboard */}
        <div className={styles.actionsBar}>
          <span className={styles.sectionLabel}>Bank message yahan paste karein:</span>
          <button
            type="button"
            className={styles.clipboardBtn}
            onClick={handlePasteClipboard}
            title="Clipboard se paste karo"
          >
            {clipboardCopied ? (
              <>
                <Check size={13} className={styles.greenIcon} /> Pasted!
              </>
            ) : (
              <>
                <Clipboard size={13} /> Paste from Clipboard
              </>
            )}
          </button>
        </div>

        {/* Textarea */}
        <div className={styles.textareaWrapper}>
          <textarea
            id="salary-sms-textarea"
            className={styles.textarea}
            placeholder="e.g. Dear Customer, INR 75,000.00 credited to A/c XX4589 by SALARY on 01-OCT-26..."
            value={smsText}
            onChange={(e) => {
              setSmsText(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            rows={4}
          />
          {smsText && (
            <button
              type="button"
              className={styles.clearTextBtn}
              onClick={() => {
                setSmsText('');
                setErrorMsg('');
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Inline Error Message */}
        {errorMsg && (
          <div className={styles.errorAlert}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sample Chips */}
        <div className={styles.samplesSection}>
          <div className={styles.samplesLabel}>Ya ek sample SMS try karo:</div>
          <div className={styles.chips}>
            {SAMPLE_MESSAGES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.chip}
                onClick={() => handleSelectSample(s)}
                disabled={loading}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          className={styles.submitBtn}
          disabled={loading || !smsText.trim()}
          onClick={() => handleAnalyze()}
        >
          {loading ? (
            'Detecting Salary...'
          ) : (
            <>
              <Sparkles size={16} /> Amount Detect & Split Set Karo
            </>
          )}
        </button>

        {/* Privacy Note */}
        <div className={styles.privacyNote}>
          <ShieldCheck size={14} className={styles.privacyIcon} />
          <span>Zero Storage: Aapka SMS store nahi hota. Sirf amount extract karke split banta hai.</span>
        </div>
      </div>
    </div>
  );
}
