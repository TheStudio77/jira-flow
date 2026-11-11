// npm test: every tests/*.test.mjs in its own process, one suite after another; no network, no Jira. A big or slow
// suite runs in parts (rule Zh7 of claude-module): planSuite of the core decides whether and how, the parts of a suite
// run at once, each in its own process; the core keeps the time of the suites itself (saveSecs). No core package (a copy
// without node_modules) — every suite whole.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
// Every process says its start and end as a lane block, like the claude-module runner («» block k · name[ · part]» and
// «« block k · name[ · part] · 12.3 s · ok | fail»): pr-works draws the run as lanes. Asynchronous — the start line goes
// out at once, not with the end. A part runs in block k (its number), a whole suite in block 1. The output of a process
// goes out in one piece at its end — parts at once do not mix their lines; a listing run's output is for planSuite only,
// and a failed listing is no failure (the suite runs whole).
const lane = (name, env = {}, part = '', k = 1) =>
  new Promise((ok) => {
    const t0 = Date.now()
    const listing = part === ' · list'
    console.log(`» block ${k} · ${name}${part}`)
    let out = ''
    const p = spawn(process.execPath, [`${dir}${name}`], { env: { ...process.env, ...env }, windowsHide: true })
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
    // On a failed start Node sends both 'error' and 'close' — the end line goes out once, on the first.
    let ended = false
    const end = (status) => {
      if (ended) return
      ended = true
      const ms = Date.now() - t0
      if (out && !listing) process.stdout.write(out.endsWith('\n') ? out : `${out}\n`)
      console.log(`« block ${k} · ${name}${part} · ${(ms / 1000).toFixed(1)} s · ${status === 0 || listing ? 'ok' : 'fail'}`)
      ok({ status, out, ms })
    }
    p.on('error', (e) => ((out += `${e.message}\n`), end(null)))
    p.on('close', end)
  })
const parts = await import('claude-module/testing/parts').catch(() => null)
const JOBS = os.availableParallelism()
// the usual reasons to run whole — no line
const QUIET = new Set(['one place', 'small and quick', 'run-all: together'])
const times = []
let failed = 0
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  const file = `${dir}${f}`
  let plan = parts ? await parts.planSuite(file, { jobs: JOBS, list: (more) => lane(f, more, ' · list') }).catch((e) => ({ whole: true, why: `planSuite failed: ${e.message.split('\n')[0]}` })) : { whole: true }
  if (plan.failed) plan = { whole: true, why: `the listing run failed (exit ${plan.failed.status})` }
  if (plan.whole && plan.why && !QUIET.has(plan.why)) console.log(`parts: ${f} — whole: ${plan.why}`)
  let rs
  if (plan.whole) rs = [await lane(f)]
  else {
    console.log(`parts: ${f} — ${plan.parts.length} parts of ${plan.n} checks: ${plan.why}`)
    rs = await Promise.all(plan.parts.map((p, i) => lane(f, p.env, ` · ${p.label}`, i + 1)))
    // a red part — the suite once more whole: checks tied by what the code does not show (a shared folder, a server)
    // do not make the suite red; the result is the whole one's
    if (rs.some((r) => r.status !== 0)) {
      console.log(`parts: ${f} — a part failed, the suite once more whole`)
      rs = [await lane(f)]
      if (rs[0].status === 0) console.log(`parts: ${f} — passed whole: its checks are tied by what the code does not show; mark the ties — node node_modules/claude-module/testing/run-all.mjs tests --check-parts ${f} --write`)
    }
  }
  times.push({ file, secs: rs.reduce((a, r) => a + r.ms, 0) / 1000 })
  if (rs.some((r) => r.status !== 0)) failed++
}
parts?.saveSecs(times)
process.exit(failed ? 1 : 0)
