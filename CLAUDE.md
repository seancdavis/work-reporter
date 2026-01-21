# Work Tracker - Project Context

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
DATABASE_URL=postgresql://...
LINEAR_API_KEY=lin_api_...
ADMIN_PASSWORD=...
KUDOS_PASSWORD=...
AUTH_SECRET=...
```

## Key Features (MVP)

1. **Daily Standups** - Yesterday summary + today's plan
2. **Weekly Standup** (prediction) - What you plan to accomplish this week
3. **Weekly Report** (summary) - AI-generated summary of what happened last week
4. **Kudos Recording** - Text, sender, screenshot, context
5. **Linear Integration** - Fetch active issues, link to reports
6. **AI Processing** - Structure free-form input, link issues
7. **Authentication** - Password-based admin mode vs read-only

## Authentication Model

- Hidden route `/auth` for password entry
- Authenticated = write/admin mode
- Unauthenticated = read-only mode
- Kudos section requires separate password (more restricted)

## Linear Integration

- Fetch issues assigned to user from both teams
- Filter by statuses: Todo, In Progress, In Review

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Implementation Status

- [x] Phase 1: Project Setup
- [ ] Phase 2: Database & Auth
- [ ] Phase 3: Linear Integration
- [ ] Phase 4: Daily Standups
- [ ] Phase 5: Weekly Standups
- [ ] Phase 6: Weekly Reports
- [ ] Phase 7: Kudos System
- [ ] Phase 8: Polish & Deploy
