import React, { useEffect, useState, useRef } from 'react';
import styles from './Timer.module.css';

export default function Timer({ duration, onExpire, running = true }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    setTimeLeft(duration);
    startTimeRef.current = Date.now();

    if (!running) return;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        onExpire?.();
      }
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [duration, running, onExpire]);

  const seconds = Math.ceil(timeLeft / 1000);
  const pct = (timeLeft / duration) * 100;

  const urgency = pct < 25 ? 'urgent' : pct < 50 ? 'warning' : 'normal';

  return (
    <div className={styles.timerWrap}>
      <div className={`${styles.timerNumber} ${styles[urgency]}`}>
        {seconds}
      </div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressBar} ${styles[urgency]}`}
          style={{ width: `${pct}%`, transition: 'width 0.1s linear' }}
        />
      </div>
    </div>
  );
}
