---
description: When writing, testing, running, or deploying code for a Netlify site (also called a Netlify project), you can use the following context for these capabilities: Netlify Image CDN,
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


## Netlify Image CDN
- All Netlify projects have a `/.netlify/images` route supported by their project without any additional enablement.
- Transform images via query parameters in requests to `/.netlify/images`.
- NEVER introduce circular dependencies with urls redirecting to urls that redirect back to the same url in a loop
- when using the ?url={URL} parameter, ensure the url is a URI encoded component.
- Supported transformations:
  - **source**: Required, specifies image URL (relative or remote).
  - **size**: `w` (width) and `h` (height) in pixels.
  - **fit**: Determines how the image is resized (`contain`, `cover`, `fill`).
  - **position**: Cropping alignment (`top`, `bottom`, `left`, `right`, `center`).
  - **format**: Convert to `avif`, `jpg`, `png`, `webp`, `gif`, or `blurhash`.
  - **quality**: Controls lossy format quality (`q`, 1-100, default 75).

### Example transformations
```html
  <!-- get an image hosted on this project and change its size and format -->
  <img src="/.netlify/images?url=/image.jpg&w=100&h=100&fit=cover&fm=webp&q=80" />

  <!-- get an image hosted externally and change its size and format -->
  <img src="/.netlify/images?url=https://example.com/path/to/image&w=40&h=10&fm=jpg&q=80" />
```

### Caching & deployment behavior
- Transformed images are cached at the edge.
- Source images are cached for future transformations.
- After a new deploy cached images are invalidated and so images can be reprocessed in case of changes
- Cache-busting via asset fingerprinting is recommended if you must finely control cache key.
- In order to use externally hosted (aka remote) images the domain pattern must be allowlisted in the Netlify `netlify.toml`.
  - Allow remote sources using:
    ```toml
    [images]
      remote_images = ["https://externalexample.com/.*"]
    ```
    - only absolute urls to external servers need to be in remote_images

### Redirects & Rewrites
- If you do not want to use the default `/.netlify/images` path, a redirect or rewrite can be used to have a different url.
- Define reusable transformation routes in `_redirects` or `netlify.toml` files.
- When doing so, the parameters can remain parameters to pass in or can be statically defined.
- Examples:
  - netlify.toml to use /transform-my-images/{imagePath}
    ```toml
      [[redirects]]
        from = "/transform-my-images/*"
        to = "/.netlify/images?url=/:splat&w=50&h=50"
        status = 200
    ```
  - _redirects to use /transform-all/{...imagePath}
    ```
      /transform-all/* /.netlify/images?url=/:splat&w=50&h=50 200
    ```

### Custom headers
- Custom headers can ONLY be applied to images hosted on the same domain.
- ONLY do this when explicitly asked
- Examples:
  - netlify.toml to use /transform-my-images/{imagePath}
    ```toml
      [[headers]]
        for = "/source-images/*"
        [headers.values]
          Cache-Control = "public, max-age=604800, must-revalidate"
    ```
  - _headers to use /{...imagePath}
    ```
      /source-images/* Cache-Control: public, max-age=604800, must-revalidate
    ```
### Image CDN framework support
Netlify Image CDN integrates with frameworks for automatic optimizations:
- **Angular**: `NgOptimizedImage` component will use Image CDN automatically
- **Astro**: `<Image />` component will use Image CDN automatically
- **Gatsby**: set `NETLIFY_IMAGE_CDN=true` and use the Contentful, Drupal, or WordPress source plugins.
- **Next.js**: set `remotePatterns` in `next.config.js`
- **Nuxt**: `nuxt/image` module will use Image CDN automatically



</ProviderContext>
