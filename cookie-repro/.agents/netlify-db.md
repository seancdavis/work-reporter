---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Netlify DB,
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


## Netlify DB

- Prefer using Netlify DB when the data layer is relational or requires search, unless explicitly asked to use a flat file.
- Using `@netlify/neon` NPM module is required. 
- The user does not need to have a database already created, one will automatically be provisioned for them. They also do not need a Neon account. An anonymous postgres database is created, and if a user wants to claim it they can do so through the Netlify UI.
- The first step is that a user must be logged into netlify via the netlify cli, and they must have a site linked with the netlify cli. 
- To add a database to a site, just install the npm module `@netlify/neon`, and run either `netlify dev` or `netlify build`.
- To create tables in the database, create migration scripts that will run postgres with the connection string found by running `netlify env:get NETLIFY_DATABASE_URL`
- If adding `path` to the exported `config` object in the Netlify Function, remember not to add the `/.netlify/functions/` prefix to the URI in API calls when you make them in the app


## Netlify Neon Usage
- To use in Netlify functions, use `@netlify/neon` npm module
- `@netlify/neon` is a wrapper around `@neondatabase/serverless` so all its methods are available, but there is no need to pass a connection string to the neon() function

### Examples of Netlify Neon Usage

```javascript
import { neon } from "@netlify/neon";

const sql = neon();

// query
const users = await sql("SELECT * FROM users");

// insert
await sql("INSERT INTO users (name) VALUES ('John Doe')");

// update
await sql("UPDATE users SET name = 'John Doe' WHERE id = 1");

// delete
await sql("DELETE FROM users WHERE id = 1");

```
</ProviderContext>
