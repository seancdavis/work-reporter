---
description: Netlify AI Gateway patterns for using AI providers (Anthropic, OpenAI, Gemini)
globs: **/*.{ts,tsx,js,jsx}
---

# Netlify AI Gateway

## Overview

Netlify AI Gateway provides automatic API key and base URL injection for AI providers. No manual configuration needed.

## Environment Variables (Auto-Injected)

Netlify automatically sets these when functions initialize:

- `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL`
- `OPENAI_API_KEY` / `OPENAI_BASE_URL`
- `GEMINI_API_KEY` / `GOOGLE_GEMINI_BASE_URL`

**Important:** If you manually set these variables, Netlify won't override them.

## Using Official SDKs (Recommended)

### Anthropic Claude

```typescript
import Anthropic from "@anthropic-ai/sdk";

// SDK automatically uses process.env.ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL
const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### With Explicit API Key (Also Works)

```typescript
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY not configured");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

## Requirements

- Project must have at least one **production deploy** for AI Gateway to activate
- Use `npm run dev` (Netlify Vite plugin) for local development with AI Gateway

## Available Models

- `claude-haiku-4-5-20251001` - Fast, cost-effective
- `claude-sonnet-4-5-20250929` - Balanced
- See Netlify docs for full model list and rate limits
