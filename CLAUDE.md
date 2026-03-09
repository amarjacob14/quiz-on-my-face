# CLAUDE.md — Trivia (Web App)

## PROJECT OVERVIEW
Name: Trivia
Type: Web-based multiplayer trivia game
Inspiration: Knowledge is Power (PS4)
Status: Concept / early development

## GAME MODES
1. **Solo device** — Each player on their own phone/browser, compete in real-time
2. **Shared screen** — One screen (TV/monitor), players use phones as controllers (Jackbox-style)
3. **Hybrid** — Mix of both; same room or remote

## CORE CONCEPT
- Players join a game room via code or link
- Questions displayed in rounds
- Real-time scoring and leaderboards
- Group play feel — reactions, animations, audience interaction

## TECH DIRECTION
- Web app (browser-based, no install required)
- Real-time multiplayer (WebSockets likely — e.g. Socket.io)
- Mobile-first UI for player devices
- Separate host/display view for shared screen mode
- Stack TBD — likely Node.js + React or similar

## WHEN I SAY "architecture"
→ Propose a full tech stack and system design for all 3 game modes

## WHEN I SAY "build [feature]"
→ Ask for current stack and any constraints
→ Write clean, well-structured code with comments where logic isn't obvious
→ Flag any decisions that will affect other parts of the system

## WHEN I SAY "game design [topic]"
→ Focus on player experience, pacing, and fun — not just technical implementation
→ Reference Knowledge is Power or Jackbox where relevant

## PRIORITIES
1. Fun first — mechanics before polish
2. Works on mobile without friction
3. No app install required
4. Shared screen mode is a key differentiator

## NEVER
→ Don't over-engineer early — keep it shippable
→ Don't assume a fixed player count — design for 2-20
→ Don't build for one mode and bolt on the others — design for all 3 from the start
