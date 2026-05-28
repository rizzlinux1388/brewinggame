# BrewingGame — Card Game Platform

A web + mobile card game platform where you can play classic card games online or create your own using AI or a visual builder.

## Features

- **5 built-in games**: Hearts, Spades, Go Fish, Crazy Eights, War
- **Online multiplayer**: Real-time play via WebSockets
- **AI opponents**: Rule-based AI that works with any game
- **AI game creator**: Describe a game in plain English → Claude generates the full rule set
- **Visual builder**: 8-step wizard to design custom card games without code

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [npm](https://npmjs.com) v9 or later
- A PostgreSQL database (see options below)
- An [Anthropic API key](https://console.anthropic.com) (for the AI game creator)

---

## 1. Clone & Install

```bash
git clone https://github.com/rizzlinux1388/brewinggame.git
cd brewinggame
npm install
```

---

## 2. Set Up Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

> **Use `.env`, not `.env.local`.** The Prisma CLI (`db:migrate`, `db:seed`,
> `db:generate`) only auto-loads `.env`. Next.js reads both, but if you put your
> connection string only in `.env.local` the Prisma CLI will fail with
> `datasource.url property is required`.

Open `.env` and fill in:

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/brewinggame"

# App URL (keep as-is for local dev)
NEXTAUTH_URL="http://localhost:3000"

# Random secret — generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"

# From https://console.anthropic.com → API Keys
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### Getting a database

**Option A — Local Postgres:**
```bash
createdb brewinggame
# Then use: postgresql://postgres:yourpassword@localhost:5432/brewinggame
```

**Option B — Free cloud DB ([Neon](https://neon.tech)):**
1. Sign up → New Project → copy the connection string

**Option C — Free cloud DB ([Supabase](https://supabase.com)):**
1. New project → Settings → Database → Connection String (URI tab)

### Generating `NEXTAUTH_SECRET`

```bash
openssl rand -base64 32
# or with Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Getting an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in / create an account (free credits included)
3. API Keys → Create Key → copy it

---

## 3. Set Up the Database

Run migrations to create all tables, then seed the 5 built-in games:

```bash
npm run db:migrate
npm run db:seed
```

---

## 4. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Build for Production

```bash
npm run build
npm start
```

> **Note:** This app uses a custom Node.js server (`server.ts`) for Socket.io WebSocket support. Deploy to platforms that support long-running processes: [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io), or a VPS. It is **not** compatible with Vercel's serverless runtime.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run Jest test suite |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed built-in games |
| `npm run db:studio` | Open Prisma Studio (DB browser) |
| `npm run db:generate` | Regenerate Prisma client |

---

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
├── components/       # React components (game, builder, UI)
├── engine/           # Core game engine (pure TypeScript, no framework deps)
│   └── built-in-games/   # Hearts, Spades, Go Fish, Crazy Eights, War
├── ai/               # Claude API integration and game generator
├── server/           # Socket.io server
├── store/            # Zustand state stores
├── types/            # TypeScript types (Game Definition Schema)
└── lib/              # Auth, Prisma client, utilities
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Seeds built-in games
server.ts             # Custom Node.js entry point (Next.js + Socket.io)
```

---

## Creating a Custom Game

### With AI
1. Go to **Create → AI Creator**
2. Describe your game in plain English
3. Review the generated rules, rename if needed, save

### With the Visual Builder
1. Go to **Create → Visual Builder**
2. Walk through the 8-step wizard (deck, players, phases, scoring, win condition)
3. Review the summary and publish

---

## Running Tests

```bash
npm test
```

The test suite covers the game engine: card dealing, pass phase, trick-taking mechanics, must-follow-suit enforcement, trick resolution, and a full 52-card Hearts simulation.

---

## Optional: GitHub / Google OAuth

Add these to `.env` if you want social login:

```bash
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

The app works with email/password auth without them.
