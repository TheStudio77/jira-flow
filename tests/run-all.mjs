// npm test: every tests/*.test.mjs in its own process; no network, no Jira.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
// Every process says its start and end as a lane block, like the claude-module runner («» block 1 · name» and
// «« block 1 · name · 12.3 s · ok | fail»): pr-works draws the run as a lane. Asynchronous — the start line goes out at
// once, not with the end. One process at a time — one block.
const lane = (name, cmd, args, opts = {}) =>
  new Promise((ok) => {
    const t0 = Date.now()
    console.log(`» block 1 · ${name}`)
    const out = []
    const err = []
    const p = spawn(cmd, args, opts)
    p.stdout?.on('data', (d) => out.push(d))
    p.stderr?.on('data', (d) => err.push(d))
    const end = (status) => {
      console.log(`« block 1 · ${name} · ${((Date.now() - t0) / 1000).toFixed(1)} s · ${status === 0 ? 'ok' : 'fail'}`)
      ok({ status, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') })
    }
    p.on('error', (e) => (err.push(Buffer.from(`${e.message}\n`)), end(null)))
    p.on('close', end)
  })
let failed = 0
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  const r = await lane(f, process.execPath, [`${dir}${f}`], { stdio: 'inherit' })
  if (r.status !== 0) failed++
}
process.exit(failed ? 1 : 0)
