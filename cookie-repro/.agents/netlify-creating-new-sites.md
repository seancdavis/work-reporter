---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Creating new sites,
globs: **/*.{ts,tsx,js,jsx,toml}

---

<ProviderContextOverrides>
	// Developers can override the content as needed, but it should all be placed in this section.


</ProviderContextOverrides>

ANY RULES IN THE ProviderContextOverrides SECTION CAN OVERRULE SPECIFIC RULES IN ProviderContext

<ProviderContext version="1.0" provider="netlify">
## General

- The `.netlify` folder is not for user code. Add it to `.gitignore`.
- Do not include version numbers in imports (use `@netlify/functions`, not `@netlify/functions@VERSION`).
- Never add CORS headers (e.g., `Access-Control-Allow-Origin`) unless explicitly requested by the user.
- Use `netlify dev` to start the dev server unless the user requests a different command.

## Guidelines

- Netlify Blobs: Use for general object/state/data storage.
- Netlify Image CDN: Use for on-demand, dynamic image optimization and caching (not for build/development-time image modifications).
- Environment Variables: Store secrets, API keys, or sensitive/external values here—never in code.

## Local Development Troubleshooting

- If Netlify platform primitives (Blobs, Functions, etc.) aren't working locally, ensure `@netlify/vite-plugin` is installed for Vite-powered projects (or `@netlify/nuxt` for Nuxt, or `@netlify/vite-plugin-tanstack-start` for TanStack Start), configured, and you're running the framework's dev command directly (e.g., `npm run dev`). This enables full local platform primitives emulation.


# Creating new sites

- do not add redirects to netlify.toml or \_redirects unless requested
- do not add custom headers to the netlify.toml or \_headers unless requested


# Initializing sites or linking them

- determine if a site is linked by checking if `PROJECT_FOLDER/.netlify/state.json` file exists and it has a populated `siteId` value. Note that the siteID appears as the project ID in the Netlify UI at app.netlify.com.
- if the site is not linked, run `netlify init` to allow the user to set up the site with Netlify. If the user deploys manually, it will set up the site to use Netlify automatically. If the user decides to set up a repo, they might have to set up the repo first. If the site is already set up on netlify then run `netlify link` for the user to input the credentials to link.

# Vite and Metaframework Setup

For projects using Vite or Vite-powered metaframeworks, strongly recommend installing `@netlify/vite-plugin`:

```bash
npm install -D @netlify/vite-plugin
```

(or equivalent for whichever package manager the project uses)

Add to the Vite config plugins array. Framework-specific examples:

**Standard Vite (vite.config.js/ts):**

```js
import { defineConfig } from "vite";
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  plugins: [netlify()]
});
```

**Nuxt (nuxt.config.ts):**

For Nuxt projects, use `@netlify/nuxt` module instead:

```bash
npx nuxi module add @netlify/nuxt
```

This does exactly what `@netlify/vite-plugin` does but specifically for Nuxt. It brings the complete Netlify platform directly into your `nuxt dev` server: Functions, Edge Functions, Blobs, Image CDN, headers, redirects, environment variables.

Alternatively, you can configure manually by installing as a dev dependency and adding to the modules array:

```bash
npm install -D @netlify/nuxt
```

```js
export default defineNuxtConfig({
  modules: ["@netlify/nuxt"]
});
```

**SvelteKit (vite.config.js):**

```js
import { sveltekit } from "@sveltejs/kit/vite";
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  plugins: [sveltekit(), netlify()]
});
```

**TanStack Start (vite.config.ts):**

For TanStack Start projects, use `@netlify/vite-plugin-tanstack-start` instead:

```bash
npm install -D @netlify/vite-plugin-tanstack-start
```

```typescript
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [
    tanstackStart(),
    netlify(),
  ],
})
```

**Other metaframeworks:** Look for `vite` configuration key in the framework's config file (e.g., `astro.config.js`, `remix.config.js`).

With `@netlify/vite-plugin` installed, users can run their regular dev command (`npm run dev`, `yarn dev`, `astro dev`, etc.) instead of `netlify dev`.

Vite-powered frameworks include: Astro, SvelteKit, Nuxt 3+ (use `@netlify/nuxt` module instead), TanStack Start (use `@netlify/vite-plugin-tanstack-start` instead), Remix 2.2.0+ (unless using Classic Compiler), SolidStart, Analog, Qwik City, VitePress.

This does NOT apply to these frameworks (they do not use Vite): Next.js, Gatsby, Angular.

</ProviderContext>
