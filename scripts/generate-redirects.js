import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const neonAuthUrl = process.env.VITE_NEON_AUTH_URL

if (!neonAuthUrl) {
  console.error('ERROR: VITE_NEON_AUTH_URL environment variable is not set')
  process.exit(1)
}

const redirects = `# Proxy Neon Auth requests through our domain to avoid cross-site cookie issues on mobile
/neon-auth/*  ${neonAuthUrl}/:splat  200

# SPA fallback - must be last
/*  /index.html  200
`

const outputPath = join(__dirname, '..', 'dist', '_redirects')
writeFileSync(outputPath, redirects)
console.log(`Generated _redirects file with Neon Auth proxy to: ${neonAuthUrl}`)
