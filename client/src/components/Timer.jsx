import React, { useEffect, useRef } from 'react';
import styles from './Timer.module.css';

export default function Timer({ duration, onExpire, running = true }) {
  const barRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 1 - elapsed / duration) * 100;

      if (barRef.current) {
        barRef.current.style.width = pct + '%';
        if (pct < 25) {
          barRef.current.className = styles.progressBar + ' ' + styles.urgent;
        } else if (pct < 50) {
          barRef.current.className = styles.progressBar + ' ' + styles.warning;
        } else {
          barRef.current.className = styles.progressBar + ' ' + styles.normal;
        }
      }

      if (elapsed >= duration) {
        onExpire && onExpire();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, running, onExpire]);

  return (
    <div className={styles.timerWrap}>
      <div className={styles.progressTrack}>
        <div ref={barRef} className={styles.progressBar + ' ' + styles.normal} />
      </div>
    </div>
  );
}
