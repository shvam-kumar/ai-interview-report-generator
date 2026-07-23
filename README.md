# AI Interview Report Generator

I built this to solve a pretty specific annoyance: you get a job description, you have your resume ready, but figuring out *exactly* what to prepare for an interview is still mostly guesswork. So this app takes your resume, a short self-description, and the job description you're targeting, and turns it into an actual report — how well you match, what you'll likely get asked, where your gaps are, and a day-by-day plan to close them before the interview.

It's a full MERN-ish stack project (React frontend, Node/Express backend), with Google's Gemini API doing the heavy lifting on the analysis side.

## What it actually does

- You sign up / log in (standard JWT auth, nothing fancy)
- You submit your resume text, a bit about yourself, and the job posting you're going for
- Gemini chews through all three and spits back:
  - A match score, so you know roughly where you stand
  - Technical questions you're likely to get, plus *why* they'd ask it and how to answer well
  - Same thing but for behavioral questions
  - A list of skill gaps, ranked by how much they'd actually hurt you
  - A prep plan broken down day by day so you're not just staring at a wall of info

## Stack

Backend's Node + Express, MongoDB for storage, JWT for auth, and Zod to make sure whatever Gemini sends back actually matches the shape I expect (AI responses can be unpredictable, so this saved me a few headaches).

Frontend's React on Vite, styled with SCSS. Kept it simple — no heavy UI framework, just hand-written styles.

## How it's organized

Nothing too clever here, just split into two folders so backend and frontend don't step on each other:

```
project/
├── Backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Route controllers (auth, interview)
│   │   ├── middlewares/     # Auth & file upload middleware
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Express routes
│   │   └── services/        # AI service (Gemini integration)
│   ├── server.js
│   └── package.json
└── Frontend/
    ├── src/
    │   ├── features/
    │   │   ├── auth/         # Login, register, auth context
    │   │   └── interview/    # Interview flow, report generation UI
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Running it locally

You'll need:
- Node.js, v18 or newer
- A MongoDB instance — local is fine, or spin up a free one on Atlas
- A Gemini API key from [Google AI Studio](https://ai.google.dev/) — the free tier works but has daily limits, so don't be surprised if you hit a rate limit while testing

### Backend

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` folder:

```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GOOGLE_GENAI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

Then start it up:

```bash
npm start
# or if you want auto-restart on changes:
npx nodemon server.js
```

### Frontend

```bash
cd Frontend
npm install
```

If you need to point it at a different backend URL, add a `.env` here too:

```
VITE_API_URL=http://localhost:3000
```

Then:

```bash
npm run dev
```

## API routes

| Endpoint | Method | What it does |
|---|---|---|
| `/auth/register` | POST | Create a new account |
| `/auth/login` | POST | Log in |
| `/interview/report` | POST | Send resume + self-description + job description, get back the full report |

*(These match what I've got right now — update if your route paths differ.)*

## A few things worth knowing

- Gemini's free tier rate-limits pretty aggressively (20 requests/day on the model I'm using). The backend retries with backoff when it hits a 429, but if you're testing a lot, you'll bump into it. Worth upgrading if this ever goes to production.
- `.env` files are gitignored in both folders — don't remove that, obviously.
- This started as a personal project to fix my own interview-prep chaos, so expect some rough edges. PRs / suggestions welcome.

## License

MIT — do what you want with it.
