import { readFileSync } from 'node:fs'
import { spawnSync, spawn } from 'node:child_process'
import { localEnvironment } from './local-supabase-env.mjs'

const env = localEnvironment('http://127.0.0.1:3100')
for (const file of [
  'account_isolation.sql',
  'landlord_isolation.sql',
  'charge_rate_isolation.sql',
  'onboarding_isolation.sql',
]) {
  const check = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_BillGenerator',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: readFileSync(`supabase/tests/${file}`),
      stdio: ['pipe', 'inherit', 'inherit'],
      env,
    },
  )
  if (check.status !== 0) process.exit(check.status || 1)
}
const build = spawnSync('npm', ['run', 'build'], { env, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status || 1)
const child = spawn(
  'npx',
  ['--no-install', 'playwright', 'test', ...process.argv.slice(2)],
  { env, stdio: 'inherit' },
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal))
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
