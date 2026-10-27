# DevEvent

Event browsing and booking app based on the **JavaScript Mastery** Next.js crash course.

## Source

The starting layout and tutorial code come from JavaScript Mastery

`main` keeps that early base (Next.js, TypeScript, Tailwind). The work after that lives on the branches below.

## Branches

### `main`

Original tutorial starting point. Still oriented around the course setup (MongoDB / Mongoose / Cloudinary / PostHog in the older docs and files).

### `dev`

Local app changes after the course, without a production database ORM yet:

- Removed MongoDB, Cloudinary, and PostHog for local development
- Stored events, bookings, and users in JSON under `data/`
- Saved uploaded images under `public/uploads/`
- Dynamic booking counts per event
- Sort and filter on the home event list
- Auth: register, log in, session cookie; create event requires login
- Profile page with each user’s events
- Admin role and dashboard: new events start as **pending**; an admin can **confirm** or **reject**
- Registration emails visible to the event creator and to admins (modal)

### `sqlite-drizzle`

Built on `dev`. Replaces the JSON store with:

- **SQLite** file at `data/dev.db`
- **Drizzle** as the ORM
- One-time seed from the existing JSON files into SQLite

Good for local testing without running a database server.

### `postgres-prisma`

Built on `sqlite-drizzle`. Switches storage to:

- **PostgreSQL** (local database `dev_event`, via `DATABASE_URL` in `.env`)
- **Prisma** schema, client, and migration under `prisma/`
- Same seed-from-JSON behavior when the tables are empty

This is the production-oriented data layer.

## Suggested path

1. Browse or run from `main` to see the course starting point
2. Use `dev` for the feature set with the JSON store
3. Use `sqlite-drizzle` to try SQLite + Drizzle locally
4. Use `postgres-prisma` when you want PostgreSQL + Prisma

```bash
git checkout postgres-prisma
npm install
# set DATABASE_URL in .env, then:
npx prisma migrate dev
npm run dev
```
