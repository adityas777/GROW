import React from 'react';
import { motion } from 'framer-motion';
import TimeMachineGame from './TimeMachineGame.jsx';
import styles from './TimeMachineModal.module.css';

export default function TimeMachineModal({ isOpen, onClose, onStartSipInChat }) {
  if (!isOpen) return null;

  return (
    <motion.div 
      className={styles.overlay} 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div 
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div className={styles.dragHandle} />
        <TimeMachineGame 
          onClose={onClose} 
          onStartSipInChat={onStartSipInChat} 
        />
      </motion.div>
    </motion.div>
  );
}
