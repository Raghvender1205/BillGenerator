import { spawn } from 'node:child_process'
import { localEnvironment } from './local-supabase-env.mjs'

const child = spawn(
  'npm',
  ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000'],
  {
    env: localEnvironment('http://127.0.0.1:3000'),
    stdio: 'inherit',
  },
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal))
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
