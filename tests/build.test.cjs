const assert = require('node:assert/strict')
const {spawnSync} = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

// ─── Local executable fixtures ────────────────────────────────────────────
// Run the shipped action entry point so failures must reach core.setFailed()
// and fallback must execute a second process. No Depot or Docker is invoked.
const fixture = `#!${process.execPath}
const fs = require('node:fs')
const path = require('node:path')
const executable = path.basename(process.argv[1])
if (executable === 'depot' && process.argv[2] !== 'build') process.exit(0)
fs.appendFileSync(process.env.FIXTURE_CALLS, executable + '\\n')
const mode = process.env[executable === 'depot' ? 'FIXTURE_DEPOT_MODE' : 'FIXTURE_DOCKER_MODE']
if (mode === 'stdout-failure') {
  console.log('build could not complete')
  process.exit(7)
}
if (mode === 'stderr-failure') {
  console.error('build details\\nfatal: build failed')
  process.exit(7)
}
if (mode === 'lint-failure') {
  console.error('linting failed')
  process.exit(7)
}
if (mode === 'signal-failure') process.kill(process.pid, 'SIGTERM')
else if (mode === 'quiet-failure') process.exit(7)
else if (mode === 'warning-success') console.error('nonfatal warning')
`

function runAction(t, {depot = 'quiet-failure', docker = 'success', fallback = false, lint = false} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'depot-action-test-'))
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}))
  for (const name of ['depot', 'docker']) {
    fs.writeFileSync(path.join(dir, name), fixture, {mode: 0o755})
  }
  const callsFile = path.join(dir, 'calls')
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../dist/index.js')], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      PATH: dir,
      TMPDIR: dir,
      GITHUB_REPOSITORY: 'fixture/project',
      GITHUB_REF: 'refs/heads/main',
      INPUT_TOKEN: 'local-fixture-token',
      INPUT_CONTEXT: '.',
      INPUT_PROVENANCE: 'false',
      INPUT_LINT: String(lint),
      INPUT_LOAD: 'false',
      INPUT_PULL: 'false',
      INPUT_PUSH: 'false',
      INPUT_SAVE: 'false',
      'INPUT_NO-CACHE': 'false',
      'INPUT_BUILDX-FALLBACK': String(fallback),
      FIXTURE_CALLS: callsFile,
      FIXTURE_DEPOT_MODE: depot,
      FIXTURE_DOCKER_MODE: docker,
    },
  })
  assert.ifError(result.error)
  assert.equal(result.signal, null, result.stderr)
  return {
    status: result.status,
    output: result.stdout + result.stderr,
    calls: fs.readFileSync(callsFile, 'utf8').trim().split('\n'),
  }
}
// ─── End local executable fixtures ────────────────────────────────────────

for (const mode of ['quiet-failure', 'stdout-failure', 'signal-failure']) {
  test(`${mode} fails the action without fallback`, (t) => {
    const result = runAction(t, {depot: mode})
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /::error::failed with:/)
    assert.match(result.output, mode === 'signal-failure' ? /SIGTERM/ : /exit code 7/)
    assert.deepEqual(result.calls, ['depot'])
  })
}

test('a quiet failure runs an enabled fallback', (t) => {
  const result = runAction(t, {fallback: true})
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /falling back to buildx/)
  assert.deepEqual(result.calls, ['depot', 'docker'])
})

test('a quiet fallback failure fails the action', (t) => {
  const result = runAction(t, {depot: 'stderr-failure', docker: 'quiet-failure', fallback: true})
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /::error::failed with:.*exit code 7/)
  assert.deepEqual(result.calls, ['depot', 'docker'])
})

test('stderr failures keep their final diagnostic', (t) => {
  const result = runAction(t, {depot: 'stderr-failure'})
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /::error::failed with: fatal: build failed/)
  assert.deepEqual(result.calls, ['depot'])
})

test('a lint failure still suppresses fallback', (t) => {
  const result = runAction(t, {depot: 'lint-failure', fallback: true, lint: true})
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /::error::failed with: linting failed/)
  assert.deepEqual(result.calls, ['depot'])
})

for (const mode of ['success', 'warning-success']) {
  test(`${mode} succeeds without running fallback`, (t) => {
    const result = runAction(t, {depot: mode, fallback: true})
    assert.equal(result.status, 0, result.output)
    assert.deepEqual(result.calls, ['depot'])
  })
}
