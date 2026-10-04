/*
 * Runtime configuration — edit this file on the web server, no rebuild needed.
 *
 * Fill in the two values from your Supabase project
 * (Dashboard → Project Settings → API). Both are public by design: what
 * visitors may do is decided by the database's Row Level Security.
 * NEVER put the "service_role" / secret key here.
 *
 * Leave the values empty when the site is built with VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY (for example by the GitHub Actions workflow).
 */
window.__STREAMER_SITE__ = {
  supabaseUrl: '',
  supabaseAnonKey: '',
}
