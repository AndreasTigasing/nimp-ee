import { PostgrestClient } from '@supabase/postgrest-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import type { Database } from '@/types/database'
import { AppError } from './errors'

/*
 * Two clients, both using ONLY the public anon key. What a caller may do is
 * decided by Row Level Security in the database, never by this code.
 *
 *   getPublicApi()  Anonymous Data API client for the public site. It is just
 *                   the small PostgREST client, so visitors never download
 *                   the auth / storage / realtime parts of the Supabase SDK.
 *
 *   getSupabase()   Full, session-aware client (Auth + Storage + Data API) for
 *                   the admin panel. Loaded on demand as a separate chunk.
 *
 * Both throw AppError("not_configured") when the Supabase env variables are
 * missing, which the UI turns into graceful empty / error states.
 */

export type PublicApi = PostgrestClient<Database>
export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * Give up on a hanging request so the UI can show an error state instead of
 * loading forever. (Failed reads are first retried by the client with a short
 * backoff, which rides out brief network or database hiccups.)
 */
const PUBLIC_TIMEOUT_MS = 12_000

let publicApi: PublicApi | null = null

export function getPublicApi(): PublicApi {
  if (!env.isSupabaseConfigured) throw new AppError('not_configured')

  publicApi ??= new PostgrestClient<Database>(`${env.supabaseUrl}/rest/v1`, {
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    timeout: PUBLIC_TIMEOUT_MS,
  })
  return publicApi
}

let fullClient: Promise<TypedSupabaseClient> | null = null

export function getSupabase(): Promise<TypedSupabaseClient> {
  if (!env.isSupabaseConfigured) return Promise.reject(new AppError('not_configured'))

  fullClient ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Only e-mail + password sign-in is used; no OAuth / magic-link redirects.
        detectSessionInUrl: false,
      },
    }),
  )
  return fullClient
}
