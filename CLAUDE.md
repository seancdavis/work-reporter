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
- **Local dev limitation:** The `@netlify/vite-plugin` does NOT fetch `VITE_*` env vars from Netlify dashboard. Create `.env.local` with `VITE_NEON_AUTH_URL` for local dev.

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
| Auth | Google OAuth via Neon Auth |

## Project Structure

```
/src
  /pages
    /public       # Read-only pages (DailyPublicPage, WeeklyPublicPage, etc.)
    /admin        # Admin pages with edit functionality (DailyAdminPage, etc.)
    SignInPage.tsx      # Google sign-in page (shown when not authenticated)
    UnauthorizedPage.tsx # Shown when user lacks permission
  /components     # Reusable UI components
  /lib            # API client, auth client, utilities
  /hooks          # React hooks

/netlify/functions
  /_shared        # Shared utilities (db, auth, linear, ai, blobs)
```

## Environment Variables Required

```env
NETLIFY_DATABASE_URL=postgresql://...  # Set automatically by Netlify DB
VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth  # From Neon Console
LINEAR_API_KEY=lin_api_...
ADMIN_EMAILS=admin@example.com,admin2@example.com  # Comma-separated list
MANAGER_EMAILS=manager@example.com  # Comma-separated list (can view kudos)
ANTHROPIC_API_KEY=...  # For AI summaries (optional)
```

## Database (Drizzle ORM)

Schema is defined in `db/schema.ts`. Migrations are in `migrations/`.

**Database Commands (always use npm scripts, not raw drizzle-kit):**
```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations (uses netlify dev:exec)
npm run db:push       # Push schema directly (bypasses migrations)
npm run db:studio     # Open Drizzle Studio GUI
```

**Important:** Never run raw drizzle-kit commands directly. Always use the npm scripts which route through Netlify CLI to ensure proper environment variables.

## Key Features

1. **Daily Standups** - Yesterday summary + today's plan with AI cleanup and markdown rendering
2. **Weekly Standup** (prediction) - What you plan to accomplish this week
3. **Weekly Report** (summary) - AI-generated summary of what happened last week, with linked issues pulled from daily standups
4. **Kudos Recording** - Text, sender, screenshot, context
5. **Linear Integration** - Fetch active issues, link to reports; bidirectional sync for research items (title, description, status, comments)
6. **AI Processing** - Structure free-form input, link issues
7. **Authentication** - Google OAuth via Neon Auth with email allowlist
8. **Research Kanban Board** - Drag-and-drop board to track research items linked to Linear issues, with documents and notes synced to Linear
9. **Impact/Work Shipped** - Track shipped work items with notes and links for promotion evidence
10. **Dark/Light Mode** - Theme toggle with system preference detection, CSS variable-based design tokens

## Daily Standup Features

- **Admin view**: Editable textareas with auto-expand, AI cleanup buttons, preview toggle
- **Public view**: Rendered markdown (hidden when empty), filtered issues (SCD- prefix hidden)
- **Markdown**: Raw text stored alongside pre-rendered HTML (generated on save via `marked`)
- **AI Cleanup**: `/api/ai-cleanup` endpoint cleans up notes (fixes grammar, formats as lists, no headings)
- **Privacy**: Issues with `SCD-` prefix are hidden in public view, shown with lock icon in admin
- **Time display**: Uses relative time ("5 minutes ago") via `timeAgo()` utility
- **Copy from yesterday**: Button to copy linked issues from previous day's standup
- **Toast notifications**: Save feedback visible regardless of scroll position

## Key UI Components

- **Toast** (`Toast.tsx`) - Toast notification system with success/error variants, auto-dismiss after 6 seconds
- **LoadingSpinner** (`LoadingSpinner.tsx`) - Loading states: `PageLoader`, `CardLoader`, `ContentLoader`
- **GlobalLoadingBar** (`GlobalLoadingBar.tsx`) - Top loading bar (GitHub/Linear-style) triggered by API calls
- **AdminLayout** (`AdminLayout.tsx`) - Auth gate for admin routes with admin navigation header
- **Layout** (`Layout.tsx`) - Public layout wrapper
- **ThemeToggle** (`ThemeToggle.tsx`) - Dark/light mode toggle with localStorage persistence
- **IssueSelector** (`IssueSelector.tsx`) - Linear issue search/select with `hideLabel` and `hideSelectedDisplay` props
- **MarkdownContent** (`MarkdownContent.tsx`) - Renders pre-processed HTML with custom CSS styling (see `index.css`)
- **ResearchModal** (`ResearchModal.tsx`) - Full-screen modal for research item details
- **ImpactModal** (`ImpactModal.tsx`) - Full-screen modal for impact item details (notes, links, Linear issue linking)
- **ClosedArchiveModal** (`ClosedArchiveModal.tsx`) - Archive view for closed research items (auto-hidden after 7 days)

**Layout Widths:**
- Header: Always 1600px max-width (consistent across all pages)
- Main content: 1600px for research/impact pages, 5xl (1024px) for other pages

## Authentication Model

Uses **Neon Auth** (built on Better Auth) with Google OAuth. All routes require authentication.

**Permission Levels:**
- `@netlify.com` emails → can read public pages (daily, weekly, reports, research)
- `MANAGER_EMAILS` → can view kudos page (and future manager features)
- `ADMIN_EMAILS` → can access admin pages (and all other pages)

**Route Structure:**
- All routes require Google sign-in first
- `/`, `/daily/:date?`, `/weekly/:week?`, `/reports/:week?`, `/research/:itemId?`, `/impact/:itemId?` = requires `read` permission (@netlify.com or admin)
- `/kudos` = requires `viewKudos` permission (MANAGER_EMAILS or admin)
- `/admin/daily/:date?`, `/admin/weekly/:week?`, `/admin/reports/:week?`, `/admin/research/:itemId?`, `/admin/impact/:itemId?`, `/admin/kudos` = requires `admin` permission (ADMIN_EMAILS only)

**Key Components:**
- `src/lib/auth.ts` = Neon Auth client (uses same-domain proxy in prod for mobile ITP compatibility)
- `src/hooks/useAuth.ts` = Auth context with session, user, permissions, signInWithGoogle, signOut
- `src/pages/SignInPage.tsx` = Google sign-in page (shown for unauthenticated users)
- `src/pages/UnauthorizedPage.tsx` = Shown when user lacks required permission
- `AdminLayout` = Layout wrapper for `/admin/*` routes

**API Protection:**
- Frontend passes `x-user-id` and `x-user-email` headers with authenticated requests
- Backend validates email and returns permissions from `/api/auth`
- All write endpoints require admin permission

**Mobile Proxy:**
- Production uses `/neon-auth/*` proxy to Neon Auth URL for mobile ITP compatibility
- Configured in `netlify.toml` using `VITE_NEON_AUTH_URL` env var

## Linear Integration

- Fetch issues assigned to user from both teams
- Filter by statuses: Todo, In Progress, In Review
- **Bidirectional sync for research items:**
  - Title changes sync to Linear issue title
  - Description changes sync to Linear issue description
  - Column changes sync to Linear workflow states (Ideas→To Do, Exploring→In Progress, Discussing→In Progress, Closed→Done)
  - Notes sync as Linear comments (tracked via `linear_comment_id`)
  - Note edits sync to existing Linear comments
- Write functions in `netlify/functions/_shared/linear.ts`: `updateIssueTitle`, `updateIssueDescription`, `updateIssueState`, `addComment`, `updateComment`
- Bulk sync endpoint: `POST /api/research/bulk-sync` with dry-run support
- All Linear API reads logged as `[Linear <-]`, writes logged as `[Linear ->]`

## Research Kanban Board

A drag-and-drop kanban board for tracking research topics linked to Linear issues. Uses a wider layout (1600px) to fit all columns.

**Columns:**
- Ideas - Starting point for new research topics
- Exploring - Currently doing initial research
- Discussing - Research has led to discussion/planning
- Closed - Generic closed status (items auto-hide after 7 days)

**Features:**
- Search and add Linear issues to the board (pulls title, description, and priority from Linear)
- Editable title and description (markdown) per research item
- Timestamped notes system with edit support - notes sync to Linear as comments
- Documents section - attach URLs with titles to research items
- Modal detail view with full editing capabilities
- Planned issue linking - link implementation issues when status is discussing
- URL routing for deep links (`/research/:itemId`, `/admin/research/:itemId`)
- Drag-and-drop to move between columns with within-column reordering
- Priority indicators (colored dots: urgent=red, high=orange, medium=yellow, low=blue)
- Staleness indicators - shows "Updated X days ago" on cards
- Closed items auto-hide after 7 days with "View All Closed" archive modal
- Privacy: SCD- items hidden from public view but accessible via direct URL (without Linear badge)
- All changes sync bidirectionally with Linear (title, description, status, notes→comments)

**Key Components:**
- `ResearchModal.tsx` - Full-screen modal for viewing/editing research items
- `KanbanBoard.tsx` - Drag-and-drop board with column management
- `ClosedArchiveModal.tsx` - Archive view for closed items older than 7 days

## Impact/Work Shipped

A feature for tracking shipped work items as promotion evidence. Reverse-chronological list with modal detail views.

**Database Tables:**
- `impactItems` - Core item (title, description, shipped_date, optional Linear issue link)
- `impactNotes` - Timestamped notes per item (with edit support)
- `impactLinks` - URL + label pairs per item

**API Endpoint:** `netlify/functions/impact.ts`
- CRUD for impact items
- Notes sub-resource: `GET/POST/PUT/DELETE /api/impact/:id/notes`
- Links sub-resource: `GET/POST/DELETE /api/impact/:id/links`

**Pages:**
- `ImpactAdminPage.tsx` - Admin view with create/edit/delete
- `ImpactPublicPage.tsx` - Read-only view

**Key Components:**
- `ImpactModal.tsx` - Full-screen modal for viewing/editing impact items (notes, links, Linear issue linking)

## Design System

CSS variable-based theming with dark/light mode support. Variables defined in `src/index.css`.

**Theme Toggle:** `ThemeToggle.tsx` with `useTheme` hook, localStorage persistence, system preference detection.

**Variable Categories:**
- `--color-bg-*` - Background colors (primary, secondary, tertiary, elevated, hover, active)
- `--color-text-*` - Text colors (primary, secondary, tertiary, muted, inverse)
- `--color-border-*` - Border colors (primary, secondary, focus)
- `--color-accent-*` - Accent colors (primary, hover, secondary, text)
- `--color-success/danger/warning` - Status colors with bg/text variants
- `--color-priority-*` - Linear priority indicators (urgent, high, medium, low)
- `--shadow-*` - Shadow tokens (sm, md, lg)

**Usage:** All color classes use `text-[var(--color-*)]` / `bg-[var(--color-*)]` syntax. Never use hardcoded Tailwind color classes.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run sync:dry     # Dry run bulk sync of research items to Linear
npm run sync:run     # Execute bulk sync of research items to Linear
```

## Implementation Status

- [x] Phase 1: Project Setup
- [x] Phase 2: Database & Auth
- [x] Phase 3: Linear Integration
- [x] Phase 4: Daily Standups
- [x] Phase 5: Weekly Standups
- [x] Phase 6: Weekly Reports
- [x] Phase 7: Kudos System
- [x] Phase 8: Polish & Deploy
