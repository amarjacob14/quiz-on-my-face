import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import styles from './Results.module.css';

export default function Results() {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [scoreboard, setScoreboard] = useState(location.state?.scoreboard || []);

  const myRank = scoreboard.findIndex((p) => p.id === user?.id) + 1;
  const myEntry = scoreboard.find((p) => p.id === user?.id);
  const winner = scoreboard[0];

  const rankMessages = {
    1: "Top of the class. Quiz royalty. 🏆",
    2: "Beaten by a nose. One more pub quiz night and you've got it. 🥈",
    3: "Bronze brain. Still on the podium, still smarter than most. 🥉",
  };

  const rankMsg = rankMessages[myRank] || `#${myRank}? Plenty more quiz nights ahead.`;

  return (
    <div className={styles.resultsPage}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className="logo">Quiz on My Face</div>
          <h1 className={styles.title}>Final Results</h1>
          <p className={styles.subtitle}>Room: <strong>{roomCode}</strong></p>
        </div>

        {winner && (
          <div className={styles.winnerCard}>
            <div className={styles.winnerTrophy}>🏆</div>
            <div className={styles.winnerInfo}>
              <p className={styles.winnerLabel}>Winner</p>
              <p className={styles.winnerName}>{winner.username}</p>
              <p className={styles.winnerScore}>{winner.score.toLocaleString()} pts</p>
            </div>
          </div>
        )}

        {myEntry && (
          <div className={styles.myResultCard}>
            <p className={styles.myRankMsg}>{rankMsg}</p>
            <div className={styles.myStats}>
              <div className={styles.myStat}>
                <span className={styles.myStatVal}>{myEntry.score.toLocaleString()}</span>
                <span className={styles.myStatLabel}>Points</span>
              </div>
              <div className={styles.myStat}>
                <span className={styles.myStatVal}>#{myRank}</span>
                <span className={styles.myStatLabel}>Rank</span>
              </div>
              <div className={styles.myStat}>
                <span className={styles.myStatVal}>{scoreboard.length}</span>
                <span className={styles.myStatLabel}>Players</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.leaderboard}>
          <h3 className={styles.leaderboardTitle}>Leaderboard</h3>
          <Scoreboard players={scoreboard} currentUserId={user?.id} />
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/')}>
            Play Again
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
