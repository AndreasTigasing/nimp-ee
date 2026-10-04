import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { streamerSitePlugin } from './build/streamer-site-plugin.ts'
import { normalizeBasePath, resolveConfig } from './src/config/resolve.ts'

/** Origins of the given URLs, skipping empty or malformed values. */
function origins(...urls: (string | undefined)[]): string[] {
  return urls.flatMap((url) => {
    try {
      return url?.trim() ? [new URL(url.trim()).origin] : []
    } catch {
      return []
    }
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // "/" for a custom domain or user site, "/<repository>/" for a GitHub project
  // site. The deploy workflow sets this automatically; never hardcode it.
  const base = normalizeBasePath(env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      streamerSitePlugin({
        config: resolveConfig(env),
        base,
        apiOrigins: origins(env.VITE_SUPABASE_URL, env.VITE_TWITCH_STATUS_URL),
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
