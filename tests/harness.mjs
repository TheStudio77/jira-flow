// Shared by the test files: check() collects results, done() prints the total and sets the exit code. A line "✗ …"
// is a failure.
import assert from 'node:assert/strict'

const results = []
// The part of a suite (rule Zh7 of claude-module): which checks run in this process, and the runner's listing run —
// partGate of the core, one protocol for the core and the runner. No core package (a copy without node_modules) — the
// whole suite. partGate takes the part's variables off the environment before the suite's code runs.
const gate = await import('claude-module/testing/parts').then(
  (m) => m.partGate(),
  () => null,
)
export async function check(name, fn) {
  const g = gate ? gate.take(name) : 'run'
  if (g === 'skip') return
  if (g !== 'run') {
    results.push(false)
    console.log(`✗ ${g}`)
    return
  }
  try {
    await fn()
    results.push(true)
  } catch (e) {
    results.push(false)
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`)
  }
}
export function done(suite) {
  // a listing run: the names of the checks and their lines go to the runner (planSuite), no check ran
  if (gate?.listing) return process.stdout.write(`${gate.listingText(suite)}\n`, () => process.exit(0))
  // a check of the part the suite never reached (a check under a condition) is a failure, not 0 of 0
  for (const t of gate?.missing() || []) results.push(false), console.log(`✗ ${t}`)
  const ok = results.filter(Boolean).length
  console.log(`${suite}: ${ok} of ${results.length} passed`)
  if (ok !== results.length) process.exitCode = 1
}
export { assert }
