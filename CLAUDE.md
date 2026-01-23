# Work Tracker - Project Context

## Netlify Context

Reference `.agents/netlify-*.md` files for Netlify best practices:
- `netlify-serverless.md` - Serverless functions patterns
- `netlify-edge-functions.md` - Edge functions patterns
- `netlify-db.md` - Database patterns
- `netlify-blobs.md` - Blob storage patterns
- `netlify-env-variables.md` - Environment variable patterns

**Key Netlify Rules:**
- Use in-code `config.path` for function routing (not netlify.toml redirects)
- Never add CORS headers unless explicitly requested
- Use `npm run dev` for local development (enables Vite plugin emulation)
- For AI Gateway: use the official SDK (e.g., `@anthropic-ai/sdk`) - it auto-reads `process.env.ANTHROPIC_API_KEY` and `process.env.ANTHROPIC_BASE_URL`

## Overview

A work reporting application for:
- Daily and weekly standup reporting
- Recording kudos/recognition for promotion evidence
- Providing visibility to stakeholders

**Key Principle**: Linear is the source of truth for task details. This app reports *on* work, not manages it.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Frontend | Vite + React + TypeScript |
| Backend | Netlify Functions |
| Database | Netlify DB (Neon/PostgreSQL) |
| Styling | Tailwind CSS only |
| AI | Netlify AI Gateway → `claude-haiku-4-5-20251001` |
| Image Storage | Netlify Blobs |
| Deployment | Netlify |
| Auth (MVP) | Simple password at hidden route |

## Project Structure

```
/src
  /pages          # Route components
  /components     # Reusable UI components
  /lib            # API client, utilities
  /hooks          # React hooks

/netlify/functions
  /_shared        # Shared utilities (db, auth, linear, ai, blobs)
```

## Environment Variables Required

```env
NETLIFY_DATABASE_URL=postgresql://...  # Set automatically by Netlify DB
LINEAR_API_KEY=lin_api_...
ADMIN_PASSWORD=...
KUDOS_PASSWORD=...
ANTHROPIC_API_KEY=...  # For AI summaries (optional)
```

## Database (Drizzle ORM)

Schema is defined in `db/schema.ts`. Migrations are in `migrations/`.

**Database Commands (always use `netlify db` commands):**
```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations (uses netlify dev:exec)
npm run db:studio     # Open Drizzle Studio GUI
```

**Important:** Never run raw drizzle-kit commands directly. Always use the npm scripts which route through Netlify CLI to ensure proper environment variables.

## Key Features (MVP)

1. **Daily Standups** - Yesterday summary + today's plan with AI cleanup and markdown rendering
2. **Weekly Standup** (prediction) - What you plan to accomplish this week
3. **Weekly Report** (summary) - AI-generated summary of what happened last week
4. **Kudos Recording** - Text, sender, screenshot, context
5. **Linear Integration** - Fetch active issues, link to reports
6. **AI Processing** - Structure free-form input, link issues
7. **Authentication** - Password-based admin mode vs read-only
8. **Research Kanban Board** - Drag-and-drop board to track research items linked to Linear issues

## Daily Standup Features

- **Admin view**: Editable textareas with auto-expand, AI cleanup buttons
- **Public view**: Rendered markdown (hidden when empty), filtered issues (SCD- prefix hidden)
- **Markdown**: Raw text stored alongside pre-rendered HTML (generated on save via `marked`)
- **AI Cleanup**: `/api/ai-cleanup` endpoint cleans up notes (fixes grammar, formats as lists, no headings)
- **Privacy**: Issues with `SCD-` prefix are hidden in public view, shown with lock icon in admin
- **Time display**: Uses relative time ("5 minutes ago") via `timeAgo()` utility

## Authentication Model

- Hidden route `/admin` for admin password entry (not linked in nav)
- `/kudos` page has inline login gate for kudos access
- Admin = full write access to all features
- Kudos = write access to kudos only
- Unauthenticated = read-only mode (except kudos page requires auth)

## Linear Integration

- Fetch issues assigned to user from both teams
- Filter by statuses: Todo, In Progress, In Review

## Research Kanban Board

A drag-and-drop kanban board for tracking research topics linked to Linear issues.

**Columns:**
- Backlog - Issues to research later
- Exploring - Currently doing initial research
- Deep Dive - In-depth investigation
- Synthesizing - Pulling together findings
- Parked - Research paused or deprioritized

**Features:**
- Search and add Linear issues to the board
- Drag-and-drop to move between columns
- Add notes to each research item
- Links directly to Linear issues for full context

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Implementation Status

- [x] Phase 1: Project Setup
- [x] Phase 2: Database & Auth
- [x] Phase 3: Linear Integration
- [x] Phase 4: Daily Standups
- [x] Phase 5: Weekly Standups
- [x] Phase 6: Weekly Reports
- [x] Phase 7: Kudos System
- [ ] Phase 8: Polish & Deploy
