import { readFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'

// Use the linked project's credentials only in the test process. Never write an
// administrative key into .env.local, browser code, artifacts, or test logs.
const ref = readFileSync('supabase/.temp/project-ref', 'utf8').trim()
if (ref !== 'hcxglckmzvqwejgyyuec')
  throw new Error('Integration tests require the linked BillGenerator project.')
const lookup = spawnSync(
  'npx',
  [
    'supabase',
    'projects',
    'api-keys',
    '--project-ref',
    ref,
    '--reveal',
    '--output',
    'json',
  ],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 },
)
let keys
try {
  keys = JSON.parse(lookup.stdout)
} catch {
  throw new Error(
    'Could not load test credentials. Run npx supabase login, then try again.',
  )
}
if (!Array.isArray(keys)) keys = keys.api_keys || keys.keys
const admin =
  keys.find((key) => key.name === 'service_role') ||
  keys.find((key) => key.type === 'secret')
if (!admin)
  throw new Error(
    'An administrative key is required to create and clean up temporary integration-test accounts.',
  )
const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SUPABASE_TEST_ADMIN_KEY: admin.api_key || admin.key,
    SUPABASE_TEST_URL: `https://${ref}.supabase.co`,
  },
})
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal))
child.on('exit', (code) => (process.exitCode = code ?? 1))
