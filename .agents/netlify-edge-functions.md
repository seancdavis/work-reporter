---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Edge functions,
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




### Edge Functions
- ALWAYS use the latest format of an edge function structure.
- **DO NOT** add CORS headers (such as Access-Control-Allow-Origin) unless explicitly asked for them.
- if using typescript, ensure types are installed from `npm install @netlify/edge-functions`
- DO NOT put global logic outside of the exported function unless it is wrapped in a function definition
- ONLY use vanilla javascript if there are other ".js" files in the functions directory.
- ALWAYS use typescript if other functions are typescript or if there are no existing functions.
- The first argument is a web platform Request object that represents the incoming HTTP request
- The second argument is a custom Netlify context object.
- Edge functions have a global `Netlify` object that is also accessible.
  - ONLY use `Netlify.env.*` for interacting with environment variables in code.
- Place function files in `YOUR_BASE_DIRECTORY/netlify/edge-functions` or a subdirectory.
  - The serverless functions director can be changed via`netlify.toml`:
    ```toml
    [build]
      edge_functions = "my-custom-directory"
    ```

- Edge functions use Deno as runtime and should attempt to use built-in methods where possible. See the list of available web APIs to know which built-ins to use.
  - **Module Support**:
    - Supports **Node.js built-in modules**, **Deno modules**, and **npm packages** (beta).
  - **Importing Modules**:
    - **Node.js built-in modules**: Use `node:` prefix (e.g., `import { randomBytes } from "node:crypto"`).
    - **Deno modules**: Use **URL imports** (e.g., `import React from "https://esm.sh/react"` or an **import map**).
    - **npm packages (beta)**: Install via `npm install` and import by package name (e.g., `import _ from "lodash"`).
    - Some npm packages with **native binaries** (e.g., Prisma) or **dynamic imports** (e.g., cowsay) may not work.
  - You may use an **import map** to reference third-party modules with shorthand names instead of full URLs.
  - **Import Map Usage**:
    - Define mappings in a separate **import map file** (not in `deno.json`).
    - The file can be placed anywhere in the project directory.
  - **Example Import Map (`import_map.json`)**:
    ```json
    {
      "imports": {
        "html-rewriter": "https://ghuc.cc/worker-tools/html-rewriter/index.ts"
      }
    }
    ```
  - **Enabling Import Maps**:
    - Declare the import map in `netlify.toml`:
      ```toml
      [functions]
        deno_import_map = "./path/to/your/import_map.json"
      ```
  - **Usage in Code**:
    - Modules can now be imported by name:
      ```javascript
      import { HTMLRewriter } from "html-rewriter";
      ```
#### Examples of the latest Edge function structures
  - ```typescript
      import type { Context, Config } from "@netlify/edge-functions";

      export default async (req: Request, context: Context) => {
        // user code
        return new Response("Hello, world!")
      }

      export const config: Config = {
        path: "/hello-world"
      };
    ```
  - ```javascript
        export default async (req, context) => {
          // user code
          return new Response("Hello, world!")
        }

        export const config = {
          path: "/hello-world"
        };
    ```

#### Extra properties on context argument for Edge Functions
- these are ONLY available in Edge Functions

```
{
  ...ALL OTHER Context fields/methods,

  next: (options?: { sendConditionalRequest?: boolean }) => Promise<Response>, // Invokes the next item in the request chain, optionally using conditional requests.

  nextRequest: (request: Request, options?: { sendConditionalRequest?: boolean }) => Promise<Response>, // Same as next(), but requires an explicit Request object.
}

```

#### Web APIs available in Edge Functions ONLY
- console.*
- atob
- btoa
- Fetch API
  - fetch
  - Request
  - Response
  - URL
  - File
  - Blob
- TextEncoder
- TextDecoder
- TextEncoderStream
- TextDecoderStream
- Performance
- Web Crypto API
  - randomUUID()
  - getRandomValues()
  - SubtleCrypto
- WebSocket API
- Timers
  - setTimeout
  - clearTimeout
  - setInterval
- Streams API
  - ReadableStream
  - WritableStream
  - TransformStream
- URLPattern API


#### In-code function config and routing for Edge functions
- prefer to use in-code configuration via exporting a `con