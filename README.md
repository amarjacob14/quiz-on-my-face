# Trivia — Multiplayer Trivia Game

A full-stack multiplayer trivia web app built with Node.js, Express, Socket.io, React, and Vite.

## Setup

### 1. Install dependencies

```bash
npm run setup
```

This installs both server and client dependencies.

### 2. Start the development servers

```bash
npm run dev
```

This concurrently starts:
- **Server** on http://localhost:3001
- **Client** on http://localhost:5173

Open http://localhost:5173 in your browser.

---

## How to Play

1. **Register/Login** — Create an account or sign in.
2. **Create a Game** — Pick game mode, category, difficulty, and number of questions.
3. **Share the room code** — Share the 6-character code with friends.
4. **Players join** — Friends enter the code on the Join tab.
5. **Host starts** — The host clicks "Start Game" in the lobby.
6. **Answer questions** — 20 seconds per question; faster = more points (up to 1000).
7. **See results** — Scoreboard shown after each round. Final leaderboard at the end.

---

## Game Modes

| Mode | Description |
|------|-------------|
| **Solo Device** | Each player sees and answers on their own phone |
| **Shared Screen** | Big display shows questions (Jackbox-style); phones are controllers |
| **Hybrid** | Questions on both host screen and player devices |

For Shared Screen and Hybrid modes, the host can click **"Open Host Screen"** to open a full-screen display view optimised for a TV or projector.

---

## Tech Stack

- **Backend**: Node.js, Express, Socket.io, JWT, bcrypt, better-sqlite3
- **Frontend**: React 18, Vite, React Router v6
- **Questions**: Open Trivia DB (https://opentdb.com)
- **Database**: SQLite (auto-created as `trivia.db` on first run)

---

## Project Structure

```
trivia/
  server/
    index.js          # Express + Socket.io entry point
    db.js             # SQLite schema + prepared statements
    gameManager.js    # In-memory game state
    questions.js      # Open Trivia DB integration + HTML entity decoding
    routes/auth.js    # Register & login endpoints
    middleware/auth.js # JWT verification
  client/
    src/
      contexts/       # AuthContext, SocketContext
      views/          # Login, Register, Home, Lobby, Game, HostScreen, Results
      components/     # Question, AnswerButton, Timer, Scoreboard
```

---

## Environment Variables

Create a `.env` file in the root (optional):

```
PORT=3001
JWT_SECRET=your-super-secret-key
```

---

## Adding Social Login (Future)

The auth route (`server/routes/auth.js`) includes commented-out Passport.js structure for Google/Facebook OAuth. To enable:

1. `npm install passport passport-google-oauth20`
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
3. Uncomment the Passport code in `server/routes/auth.js`
