import React from 'react';
import styles from './Question.module.css';

export default function Question({ question, questionNumber, totalQuestions, large = false }) {
  if (!question) return null;

  const difficultyColor = {
    easy: 'var(--success)',
    medium: 'var(--warning)',
    hard: 'var(--danger)',
  }[question.difficulty] || 'var(--text-muted)';

  return (
    <div className={`${styles.questionWrap} ${large ? styles.large : ''}`}>
      <div className={styles.meta}>
        <span className={styles.progress}>
          Question {questionNumber} / {totalQuestions}
        </span>
        <span className={styles.category}>{question.category}</span>
        <span className={styles.difficulty} style={{ color: difficultyColor }}>
          {question.difficulty}
        </span>
      </div>
      <p className={`${styles.questionText} ${large ? styles.questionTextLarge : ''}`}>
        {question.question}
      </p>
    </div>
  );
}
