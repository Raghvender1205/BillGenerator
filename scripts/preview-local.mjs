import { spawn } from 'node:child_process'
import { localEnvironment } from './local-supabase-env.mjs'

const child = spawn(
  'npm',
  ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', '3100'],
  {
    env: localEnvironment('http://127.0.0.1:3100'),
    stdio: 'inherit',
  },
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal))
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
