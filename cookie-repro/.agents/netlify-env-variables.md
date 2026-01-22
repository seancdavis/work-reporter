---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Environment variables,
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


## Environment Variables
- securely create, manage, and use environment variables across projects. These variables can be set via the UI, CLI, API, or configuration files.
- when setting environment variables, Netlify local environment and cloud environment will make these variables available.
- **Precedence**: `netlify.toml` overrides UI/CLI/API variables, and project-specific variables take precedence over shared ones.

### Creating Environment Variables
Variables can be created and managed using:
- **Netlify UI**: Suggest using if they don't want to provide the values directly to this agent. They can navigate to it via the path "Project configuration > Environment variables".
- **Netlify CLI**: Prefer using this if the agent can run commands. This requires the project to be linked.
- **Netlify Configuration (`netlify.toml`)**: Defines variables at the repository level. ONLY use this for environment variables where the project is not linked yet and the values are not sensitive.

### Netlify CLI Command
- The project must be linked first before the CLI will add variables. See the rules for initializing and linking projects for how to do this.
- Use `env:set` for changes, `env:unset` to delete. `env:import` to import from a dotenv`.env` file.

#### Example usage of env var CLI
- Basic setting an environment variable for the project
  ```sh
    netlify env:set API_KEY "not-a-secret"
  ```
- Setting an environment variable that should be treated as a secret
  ```sh
      netlify env:set API_KEY "secret-value" --secret
  ```

### Example `netlify.toml` Configuration
- Using the netlify.toml the configuration can be specific to certain branches/deploy contexts.
- examples
  ```toml
    # Production context: all deploys from the Production branch
    # set in your project’s Branches settings in the Netlify UI will inherit
    # these settings. You can define environment variables
    # here but we recommend using the Netlify UI for sensitive
    # values to keep them out of your source repository.
    [context.production]
      publish = "output/"
      command = "make publish"
      environment = { NODE_VERSION = "14.15.3" }

    # Here is an example of how to define context-specific
    # environment variables. Be mindful when using this
    # option and avoid committing sensitive values to public
    # source repositories.
    [context.deploy-preview.environment]
      NOT_PRIVATE_ITEM = "not so secret"

    # Branch Deploy context: all deploys that are not from
    # a pull/merge request or from the Production branch
    # will inherit these settings.
    [context.branch-deploy.environment]
      NODE_ENV = "development"

    # Dev context: environment variables set here
    # are available for local development environments
    # run using Netlify Dev. These values can be
    # overwritten on branches that have a more specific
    # branch context configured.
    [context.dev.environment]
      NODE_ENV = "development"

    # Specific branch context: all deploys from
    # this specific branch will inherit these settings.
    [context.staging.environment] # “staging” is a branch name
      NODE_ENV = "development"
  ```

### `.env` File Handling
- Netlify builds do not read `.env` files directly
- Import `.env` variables into Netlify using the UI or CLI (`netlify env:import .env`).
- Export Netlify variables to `.env` files via UI or CLI (`env:list`).

### Export `.env` Variables
```sh
# list the production deploy context values in .env format
netlify env:list --plain --context production

# list the production deploy context values in .env format
# and pipe results into a .env file
netlify env:list --plain --context production > .env
```

</ProviderContext>
