# AGENTS.md

## Project Overview

PROMOSPORT Recruitment Platform — Next.js 14 (App Router), Prisma/MySQL, TypeScript.

## Dev Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run db:generate   # Prisma client generation
npm run db:push       # Push schema to DB
npm run db:migrate     # Run migrations
npm run db:studio     # Open Prisma Studio
```

## Key Patterns

- **Locale routing**: All pages under `src/app/[locale]/` — locales are `fr` and `ar` (default)
- **Root `/` redirects** to `/fr` (see `next.config.mjs`)
- **Auth**: NextAuth.js at `src/app/api/auth/[...nextauth]/route.ts`
- **RTL**: Arabic locale uses RTL; Prettier uses LF line endings
- **Environment vars**: Copy `.env.example` → `.env` before running

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14.2.35 (App Router) |
| Database | Prisma 5 + MySQL 8 |
| Auth | NextAuth.js (JWT) |
| Styling | Tailwind CSS (shadcn/ui compatible) |
| i18n | next-intl |
| Email | Nodemailer |
| SMS | Twilio |
| File uploads | formidable |
| File export | xlsx, pdfkit |
| Logging | Winston |
| Process mgmt | PM2 (ecosystem.config.js) |

## Database

- MySQL via Prisma; use `npx prisma` for all DB ops
- Run `db:generate` after any schema change
- `prisma/init.sql` used by docker-compose for init

## Docker

```bash
docker-compose up -d    # Starts MySQL (port 3307) + app
```

## Production

- `next build` outputs standalone artifact
- PM2 cluster mode (2 instances) via `ecosystem.config.js`
- Logs at `logs/error.log`, `logs/out.log`, `logs/combined.log`

## Project Roadmap

See `tasks.md.md` for full 15-milestone plan.