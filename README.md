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
npm run dev
```

## Key Features

- **Daily Standups** - Yesterday summary + today's plan with AI cleanup
- **Weekly Standups** - Plan what you'll accomplish this week
- **Weekly Reports** - AI-generated summaries of weekly work
- **Kudos Recording** - Track recognition with screenshots
- **Linear Integration** - Link issues to standups
- **Research Kanban** - Drag-and-drop board for research tracking

## Database Commands

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio GUI
```

## Environment Variables

Set via Netlify UI or CLI:

- `LINEAR_API_KEY` - Linear API access
- `ADMIN_PASSWORD` - Admin authentication
- `KUDOS_PASSWORD` - Kudos-only authentication
- `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` - Auto-injected by Netlify AI Gateway
