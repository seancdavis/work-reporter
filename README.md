# Work Tracker

A work reporting application for daily/weekly standup reporting, recording kudos for promotion evidence, and providing visibility to stakeholders.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Netlify Functions
- **Database**: Netlify DB (Neon/PostgreSQL) with Drizzle ORM
- **Styling**: Tailwind CSS
- **AI**: Netlify AI Gateway → Claude Haiku
- **Image Storage**: Netlify Blobs

## Getting Started

```bash
npm install
```

Create a `.env.local` file with your Neon Auth URL (from Neon Console > Auth):
```
VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth
```

Then run:
```bash
npm run dev
```

**Note:** The `@netlify/vite-plugin` does not fetch environment variables from the Netlify dashboard during local dev. You need a local `.env.local` file for `VITE_NEON_AUTH_URL`.

## Key Features

- **Daily Standups** - Yesterday summary + today's plan with AI cleanup
- **Weekly Standups** - Plan what you'll accomplish this week
- **Weekly Reports** - AI-generated summaries of weekly work
- **Kudos Recording** - Track recognition with screenshots
- **Linear Integration** - Link issues to standups
- **Research Kanban** - Drag-and-drop board for research tracking

## Route Structure

All routes require Google sign-in via Neon Auth. Access is determined by email:

| Permission | Who | Access |
|------------|-----|--------|
| Read | `@netlify.com` emails | `/`, `/weekly`, `/reports`, `/research` |
| Kudos | `MANAGER_EMAILS` list | `/kudos` |
| Admin | `ADMIN_EMAILS` list | `/admin/*` (full access) |

### Routes
| Route | Permission Required |
|-------|---------------------|
| `/` | read |
| `/weekly` | read |
| `/reports` | read |
| `/research` | read |
| `/kudos` | viewKudos |
| `/admin/*` | admin |

## Database Commands

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio GUI
```

## Environment Variables

Set via Netlify UI or CLI:

- `VITE_NEON_AUTH_URL` - Neon Auth URL (from Neon Console)
- `LINEAR_API_KEY` - Linear API access
- `ADMIN_EMAILS` - Comma-separated list of admin emails
- `MANAGER_EMAILS` - Comma-separated list of manager emails (can view kudos)
- `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` - Auto-injected by Netlify AI Gateway

**Local dev:** Create `.env.local` with `VITE_NEON_AUTH_URL` (other vars fetched by Netlify plugin).
