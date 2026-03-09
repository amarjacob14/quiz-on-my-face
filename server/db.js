const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'trivia.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema setup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    provider TEXT DEFAULT 'local',
    provider_id TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT UNIQUE NOT NULL,
    host_id INTEGER NOT NULL,
    category TEXT,
    difficulty TEXT,
    num_questions INTEGER DEFAULT 10,
    game_mode TEXT DEFAULT 'solo',
    status TEXT DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (host_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(game_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS game_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    question_index INTEGER NOT NULL,
    answer TEXT,
    is_correct INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// User operations
const userOps = {
  create: db.prepare(`
    INSERT INTO users (username, email, password_hash, provider, provider_id, avatar_url)
    VALUES (@username, @email, @password_hash, @provider, @provider_id, @avatar_url)
  `),
  findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?'),
};

// Game operations
const gameOps = {
  create: db.prepare(`
    INSERT INTO games (room_code, host_id, category, difficulty, num_questions, game_mode)
    VALUES (@room_code, @host_id, @category, @difficulty, @num_questions, @game_mode)
  `),
  findByCode: db.prepare('SELECT * FROM games WHERE room_code = ?'),
  updateStatus: db.prepare('UPDATE games SET status = ? WHERE room_code = ?'),
  finish: db.prepare('UPDATE games SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE room_code = ?'),
  addPlayer: db.prepare(`
    INSERT OR IGNORE INTO game_players (game_id, user_id) VALUES (?, ?)
  `),
  updateScore: db.prepare(`
    UPDATE game_players SET score = score + ? WHERE game_id = ? AND user_id = ?
  `),
  getPlayers: db.prepare(`
    SELECT u.id, u.username, u.avatar_url, gp.score
    FROM game_players gp
    JOIN users u ON u.id = gp.user_id
    WHERE gp.game_id = ?
    ORDER BY gp.score DESC
  `),
  saveAnswer: db.prepare(`
    INSERT INTO game_answers (game_id, user_id, question_index, answer, is_correct, points_earned, response_time_ms)
    VALUES (@game_id, @user_id, @question_index, @answer, @is_correct, @points_earned, @response_time_ms)
  `),
};

module.exports = { db, userOps, gameOps };
