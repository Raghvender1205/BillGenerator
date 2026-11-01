export function supabaseConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key)
    throw new Error(
      'Supabase is not configured. Set the variables in .env.local using .env.example.',
    )
  return { url, key }
}
export function authConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  )
}
