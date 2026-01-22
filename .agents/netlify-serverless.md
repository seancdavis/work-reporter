---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Serverless functions,
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




### Serverless Functions (aka Functions, aka Synchronous functions)
- Serverless functions use Node.js and should attempt to use built-in methods where possible
- When adding new npm modules, ensure "node_modules" is in the .gitignore
- ALWAYS use the latest format of a function structure.
- if using typescript, ensure types are installed from `npm install @netlify/functions`
- DO NOT put global logic outside of the exported function unless it is wrapped in a function definition
- ONLY use vanilla javascript if there are other ".js" files in the functions directory.
- ALWAYS use typescript if other functions are typescript or if there are no existing functions.
- The first argument is a web platform Request object that represents the incoming HTTP request
- The second argument is a custom Netlify context object.
- Functions have a global `Netlify` object that is also accessible.
  - ONLY use `Netlify.env.*` for interacting with environment variables in code.
- Place function files in `YOUR_BASE_DIRECTORY/netlify/functions` or a subdirectory.
  - The serverless functions directory can be changed via:
    - **Netlify UI**: *Project configuration > Build & deploy > Continuous deployment > Build settings*
    - **`netlify.toml`**:
      ```toml
      [functions]
        directory = "my_functions"
    ```
  - `netlify.toml` settings override UI settings.
- If using a subdirectory, name the entry file `index.mts` or match the subdirectory name.
  - Example valid function paths:
    - `netlify/functions/hello.mts`
    - `netlify/functions/hello/index.mts`
    - `netlify/functions/hello/hello.mts`
- Naming files with `.mts` enables modern ES module syntax

#### Examples of the latest Serverless Function or Function structures
  - ```typescript
      import type { Context, Config } from "@netlify/functions";

      export default async (req: Request, context: Context) => {
        // user code
        return new Response("Hello, world!")
      }

      export const config: Config = {
        // use this path instead of /.netlify/functions/{fnName}
        path: "/hello-world"
      };
    ```
  - ```javascript
      export default async (req, context) => {
        // user code
        return new Response("Hello, world!")
      }

      export const config = {
      // use this path instead of /.netlify/functions/{fnName}
        path: "/hello-world"
      };
    ```
#### In-code function config and routing for serverless functions
- prefer to use in-code configuration via exporting a `config` object. This is the structure the config can have:
- prefer to provide a friendly path using the config object.
- ONLY serverless functions use `/.netlify/functions/{function_name}` path by default.
- If you set a specific path via this config or the netlify.toml, it will only be available at that new path.
- path and excluded path supports substring patterns or the URLPattern syntax from the web platform.

```
{
  path: string | string[], // Defines the URL path(s) that trigger the function. Can be a single string or an array of paths.
  excludedPath?: string | string[], // Optional. Defines paths that should be excluded from triggering the function.
  preferStatic?: boolean, // Optional. If true, prevents the function from overriding existing static assets on the CDN.
}
```

### Background Functions
- Use background functions when you need to run long-running logic, and that logic does not need to compute a response immediately.
- Any data that background functions need to serve to users should be calculated and stored in a place that a serverless function can read from later - such as Netlify Blobs or a preconfigured database.
- Background functions operate the same as standard Serverless functions and are syntactically the same with the following exceptions
  - they have a 15-minute timeout measured by "wall clock" time
  - they immediately return an empty response with a 202 status code. Return values from these functions are ignored.
  - Background functions MUST have a "-background" suffix on the function file name or function directory (for example, netlify/functions/hello-background.mts or netlify/functions/hello-background/index.mts).

#### Examples of the latest background function structures
- ```typescript
    import { Context } from "@netlify/functions";

    exp