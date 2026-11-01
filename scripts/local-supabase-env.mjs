import { spawnSync } from 'node:child_process'

export function localEnvironment(siteUrl) {
  const result = spawnSync(
    'npx',
    ['--no-install', 'supabase', 'status', '--output', 'json'],
    { encoding: 'utf8' },
  )
  let config
  try {
    config = JSON.parse(result.stdout)
  } catch {
    throw Error(
      'Start local Supabase first. See README → Local development and testing.',
    )
  }
  const url = config.API_URL
  if (
    !url ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)
  )
    throw Error(
      'A local Supabase stack is required. Hosted targets are refused.',
    )
  const key = config.ANON_KEY || config.PUBLISHABLE_KEY
  const adminKey = config.SERVICE_ROLE_KEY || config.SECRET_KEY
  if (!key || !adminKey)
    throw Error('Could not read local Supabase configuration.')
  return {
    ...process.env,
    SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    SUPABASE_TEST_URL: url,
    SUPABASE_TEST_ADMIN_KEY: adminKey,
  }
}
