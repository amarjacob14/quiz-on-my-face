import React from 'react';
import styles from './AnswerButton.module.css';

const LABELS = ['A', 'B', 'C', 'D'];
const COLOR_VARS = [
  '--answer-a',
  '--answer-b',
  '--answer-c',
  '--answer-d',
];

export default function AnswerButton({
  answer,
  index,
  onClick,
  disabled,
  state, // null | 'selected' | 'correct' | 'incorrect' | 'reveal-correct' | 'reveal-wrong'
  large = false,
}) {
  const colorVar = COLOR_VARS[index % 4];

  const classNames = [
    styles.answerBtn,
    large ? styles.large : '',
    state === 'correct' ? styles.correct : '',
    state === 'incorrect' ? styles.incorrect : '',
    state === 'selected' ? styles.selected : '',
    state === 'reveal-correct' ? styles.revealCorrect : '',
    state === 'reveal-wrong' ? styles.revealWrong : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      style={{ '--color': `var(${colorVar})` }}
      onClick={() => onClick?.(answer)}
      disabled={disabled}
    >
      <span className={styles.label}>{LABELS[index]}</span>
      <span className={styles.text}>{answer}</span>
      {state === 'correct' && <span className={styles.icon}>✓</span>}
      {state === 'incorrect' && <span className={styles.icon}>✗</span>}
      {state === 'reveal-correct' && <span className={styles.icon}>✓</span>}
    </button>
  );
}
