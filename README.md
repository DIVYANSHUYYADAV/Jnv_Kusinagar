# 🎯 Cograd Quest

> **Learn. Think. Compete.**
> 
> A real-time multiplayer educational quiz game built for Cograd.
> 
> **Developed by Divyanshu** | **Powered by Cograd**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (e.g., `cograd-quest`)
3. Add a **Web App** to the project
4. Enable **Realtime Database** (in Test Mode initially)
5. Copy your Firebase config values

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase credentials
```

### 4. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Project Structure

```
cograd-quest/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── host/
│   │   ├── page.tsx            # Host setup page
│   │   └── game/[pin]/
│   │       └── page.tsx        # Host game dashboard
│   ├── join/
│   │   └── page.tsx            # Student join page
│   ├── game/[pin]/
│   │   └── page.tsx            # Student gameplay
│   └── results/[pin]/
│       └── page.tsx            # Results page
├── components/
│   └── game/
│       ├── CircularTimer.tsx   # Countdown timer
│       ├── CoordinatePlane.tsx # SVG graph visualization
│       └── Leaderboard.tsx     # Live rankings
├── data/
│   └── questions/
│       └── graphs_coordinates.json  # Question bank (30 questions)
├── lib/
│   ├── firebase.ts             # Firebase initialization
│   └── gameEngine.ts           # Core game logic
├── types/
│   └── game.ts                 # TypeScript type definitions
└── public/
    └── images/
        └── cograd-logo.jpeg    # Cograd official logo
```

---

## 🔥 Firebase Setup

### Realtime Database Rules
```json
{
  "rules": {
    "games": {
      "$pin": {
        ".read": true,
        ".write": true,
        "players": {
          "$playerId": {
            ".write": "auth == null || $playerId == auth.uid"
          }
        }
      }
    }
  }
}
```

---

## 🌐 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or use: vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
```

### Required Environment Variables on Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

---

## 🎮 Game Flow

```
Landing Page → Host a Game → Configure Settings → Get Game PIN
                                                        ↓
                                                Share PIN with students
                                                        ↓
Students → Join with PIN → Choose Nickname & Avatar → Lobby
                                                        ↓
                                                Host clicks START
                                                        ↓
                                              Questions (with timer)
                                                        ↓
                                            Instant feedback + scores
                                                        ↓
                                           Live leaderboard (optional)
                                                        ↓
                                              Final results + analytics
                                                        ↓
                                              Download CSV scorecard
```

---

## 📚 Question Bank

- **Topic**: Graphs & Coordinates
- **Total Questions**: 30
- **Distribution**: 12 Easy · 12 Medium · 6 Hard
- **Types**: MCQ, True/False, Coordinate-based

### Adding New Questions
Edit `data/questions/graphs_coordinates.json` or create new topic files:
```
data/questions/
    graphs_coordinates.json
    algebra.json          (future)
    geometry.json         (future)
    physics.json          (future)
```

### Question Schema
```json
{
  "id": "GC001",
  "type": "mcq",
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "difficulty": "easy",
  "concept": "Quadrants",
  "explanation": "...",
  "timeLimit": 20,
  "points": 1000,
  "graphData": null
}
```

---

## 🏆 Scoring System

| Scenario | Points |
|----------|--------|
| Correct Answer | 1000 (base) |
| Speed Bonus | Up to +500 (proportional to remaining time) |
| Wrong Answer | 0 (or -250 with negative marking enabled) |
| Double Points Power-Up | 2× total |

**Formula**: `score = 1000 + (timeRemaining / timeLimit) × 500`

---

## 🔥 Streak System

| Streak | Reward |
|--------|--------|
| 2 correct | 🔥 Hot Streak |
| 3 correct | 🔥🔥 Super Streak |
| 5 correct | 🔥🔥🔥 Mega Streak |
| 7 correct | ⚡🔥⚡ Legendary! |
| 10 correct | 💥🔥💥 UNSTOPPABLE! |

---

## 🎮 Game Modes

1. **Classic Quiz** — Everyone answers simultaneously
2. **Speed Challenge** — Faster answers = bigger bonus
3. **Survival** — 3 lives; wrong answers cost a life

---

## 🛡️ Anti-Cheating

- ✅ Server-side score calculation
- ✅ Correct answers never exposed in frontend
- ✅ Duplicate submission prevention
- ✅ Server timestamp synchronization
- ✅ Answer locking after submission
- ✅ Player kick functionality

---

## 📱 Browser Support

- ✅ Chrome (mobile + desktop)
- ✅ Safari (iOS + macOS)
- ✅ Firefox
- ✅ Edge
- ✅ Samsung Internet

---

## 🎨 Design System

- **Primary Color**: `#1A3FD8` (Deep Blue)
- **Accent**: `#7C3AED` (Purple)
- **Background**: `#0A0E27` (Navy)
- **Font**: Inter (body) + Outfit (display)
- **Style**: Glassmorphism + Dark Theme

---

## 👨‍💻 Developer

**Divyanshu** — Cograd Quest

Built with ❤️ for Cograd — Connecting Grads

---

## 📄 License

© 2024 Cograd. All rights reserved.
