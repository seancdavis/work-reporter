# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal Vite + React + TypeScript reproduction project for testing Netlify cookie behavior. This is a standalone reproduction case, separate from the parent work-tracker project.

## Commands

```bash
npm run dev      # Start dev server with Netlify platform emulation
npm run build    # TypeScript compile + Vite build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

- **Frontend**: Vite + React 19 + TypeScript in `/src`
- **Backend**: Netlify Functions in `/netlify/functions`
- **Platform**: Uses `@netlify/vite-plugin` for local Netlify platform emulation

## Netlify Context

Reference `.agents/netlify-*.md` files for Netlify patterns:
- `netlify-serverless.md` - Serverless functions (primary reference)
- `netlify-env-variables.md` - Environment variable handling

**Key Rules:**
- Use `Netlify.env.get()` for environment variables (not `process.env`)
- Use in-code `config.path` for function routing
- Never add CORS headers unless explicitly requested
- Function files use `.mts` extension for ES modules

## Function Structure

Functions follow this pattern:
```typescript
import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  return new Response("Hello, world!");
};

export const config: Config = {
  path: "/api/endpoint"
};
```
