# EROGRAM

NSFW discovery platform -- Telegram groups, bots, OnlyFans creators, AI tools.

## Quick Start

```bash
cp .env.example .env.local   # fill in MONGODB_URI at minimum
npm install
npm run dev
```

## Required Env Vars

- `MONGODB_URI` -- MongoDB Atlas connection string (required for all pages)
- `JWT_SECRET` -- for auth tokens
- See `.env.example` for all optional vars (R2, Telegram, payments, etc.)

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4
- MongoDB Atlas via Mongoose
- Cloudflare R2 for media storage
- Vercel hosting with cron jobs
- Custom JWT auth (Telegram + Google OAuth)

## Project Structure

- `app/` -- pages, layouts, API routes
- `lib/actions/` -- server actions (preferred data access)
- `lib/models/index.ts` -- all Mongoose schemas
- `components/` -- shared UI
- `brain/` -- EROGRAM BRAIN knowledge base (architecture, rules, incidents)
- `.cursor/rules/` -- AI agent rules and context

## EROGRAM BRAIN

The `brain/` folder contains the project's knowledge base:

- `brain/CORE.md` -- start here. Priorities, danger connections, owner preferences.
- `brain/lobes/` -- deep context per area (SEO, ads, payments, content, media, UX, technical, clients, owner)
- `brain/incidents/log.md` -- things that broke and how they were fixed

## Key Rules

- NEVER create new API routes -- use server actions in `lib/actions/`
- NEVER change slugs, sitemaps, or revalidation config
- NEVER push to git without explicit permission
- Read `brain/CORE.md` before making changes to understand priorities and danger zones
