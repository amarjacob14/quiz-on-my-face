import React from 'react';
import styles from './Scoreboard.module.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ players, large = false, currentUserId }) {
  if (!players || players.length === 0) return null;

  return (
    <div className={`${styles.scoreboard} ${large ? styles.large : ''}`}>
      {players.map((p, i) => {
        const isMe = p.id === currentUserId;
        const medal = MEDALS[i] || null;

        return (
          <div
            key={p.id}
            className={`${styles.row} ${isMe ? styles.me : ''} ${i === 0 ? styles.first : ''}`}
          >
            <div className={styles.rank}>
              {medal || <span className={styles.rankNum}>{i + 1}</span>}
            </div>

            <div className={styles.avatar}>
              {p.username[0].toUpperCase()}
            </div>

            <div className={styles.nameWrap}>
              <span className={styles.name}>{p.username}</span>
              {isMe && <span className={styles.youBadge}>you</span>}
              {p.isCorrect !== undefined && (
                <span className={p.isCorrect ? styles.correct : styles.incorrect}>
                  {p.isCorrect ? '+' + p.lastPoints : 'no points'}
                </span>
              )}
            </div>

            <div className={styles.score}>
              {p.score.toLocaleString()}
              <span className={styles.pts}>pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
