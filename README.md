# SwipePredict 🃏⚽

**Predice micro-eventos de fútbol. Swipea para apostar. Gana USDC.**

Tinder-механика для ставок на Liga MX + ЧМ 2026 с крипто-кошельком.

---

## Quick Start

```bash
# 1. Clone & install
cd swipepredict
npm install

# 2. Setup env vars
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
# Fill in your Supabase, OpenAI, API-Football keys

# 3. Setup DB
# Run apps/api/src/db/schema.sql in Supabase SQL Editor

# 4. Run dev
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Fastify |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |
| Wallet | Solana USDC via Phantom |
| Sports API | API-Football ($19/мес) |
| AI | OpenAI GPT-4o mini |
| Hosting | Vercel (web) + Railway (api) |

---

## APIs needed

1. **Supabase** — supabase.com (free tier)
2. **API-Football PRO** — api-sports.io ($19/мес)
3. **OpenAI** — platform.openai.com (~$5/мес)
4. **Solana RPC** — free public or Helius free tier

---

## Project Structure

```
swipepredict/
├── apps/
│   ├── web/          # React PWA
│   └── api/          # Fastify backend
└── packages/
    └── shared/       # Types, utils
```

---

## Deploy

```bash
# Web → Vercel
vercel --cwd apps/web

# API → Railway
railway up --cwd apps/api
```
