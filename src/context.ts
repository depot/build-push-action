import * as core from '@actions/core'
import * as github from '@actions/github'
import * as crypto from 'crypto'
import * as csv from 'csv-parse/sync'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export interface Inputs {
  addHosts: string[]
  allow: string[]
  attests: string[]
  buildArgs: string[]
  buildContexts: string[]
  buildPlatform: string
  buildxFallback: boolean
  cacheFrom: string[]
  cacheTo: string[]
  cgroupParent: string
  context: string
  file: string
  githubToken: string
  labels: string[]
  lint: boolean
  lintFailOn: string
  load: boolean
  network: string
  noCache: boolean
  noCacheFilters: string[]
  outputs: string[]
  platforms: string[]
  project: string
  provenance: string
  pull: boolean
  push: boolean
  save: boolean
  saveTag: string
  sbom: string
  sbomDir: string
  secretFiles: string[]
  secrets: string[]
  shmSize: string
  ssh: string[]
  tags: string[]
  target: string
  token?: string
  ulimit: string[]
}

export function getInputs(): Inputs {
  const defaultContext = getDefaultBuildContext()
  return {
    addHosts: getListInput('add-hosts'),
    allow: getListInput('allow'),
    attests: getListInput('attests', {ignoreComma: true}),
    buildArgs: getListInput('build-args', {ignoreComma: true}),
    buildContexts: getListInput('build-contexts', {ignoreComma: true}),
    buildPlatform: core.getInput('build-platform'),
    buildxFallback: core.getBooleanInput('buildx-fallback'),
    cacheFrom: getListInput('cache-from', {ignoreComma: true}),
    cacheTo: getListInput('cache-to', {ignoreComma: true}),
    cgroupParent: core.getInput('cgroup-parent'),
    context: core.getInput('context') || defaultContext,
    file: core.getInput('file'),
    githubToken: core.getInput('github-token'),
    labels: getListInput('labels', {ignoreComma: true}),
    lint: core.getBooleanInput('lint'),
    lintFailOn: core.getInput('lint-fail-on'),
    load: core.getBooleanInput('load'),
    network: core.getInput('network'),
    noCache: core.getBooleanInput('no-cache'),
    noCacheFilters: getListInput('no-cache-filters', {ignoreComma: true}),
    outputs: getListInput('outputs', {ignoreComma: true}),
    platforms: getListInput('platforms'),
    project: core.getInput('project'),
    provenance: getProvenanceInput(),
    pull: core.getBooleanInput('pull'),
    push: core.getBooleanInput('push'),
    save: core.getBooleanInput('save'),
    saveTag: core.getInput('save-tag'),
    sbom: core.getInput('sbom'),
    sbomDir: core.getInput('sbom-dir'),
    secretFiles: getListInput('secret-files', {ignoreComma: true}),
    secrets: getListInput('secrets', {ignoreComma: true}),
    shmSize: core.getInput('shm-size'),
    ssh: getListInput('ssh', {ignoreComma: true}),
    tags: getListInput('tags'),
    target: core.getInput('target'),
    token: core.getInput('token') || process.env.DEPOT_TOKEN,
    ulimit: getListInput('ulimit', {ignoreComma: true}),
  }
}

let defaultContext: string
export function getDefaultBuildContext(): string {
  if (defaultContext) return defaultContext
  const gitServer = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const ref = resolveRef()
  defaultContext = `${gitServer}/${github.context.repo.owner}/${github.context.repo.repo}.git#${ref}`
  return defaultContext
}

function getProvenanceInput(): string {
  const input = core.getInput('provenance')
  if (!input) return input

  try {
    return core.getBooleanInput('provenance') ? `builder-id=${provenanceBuilderID()}` : 'false'
  } catch {
    return resolveProvenanceAttrs(input)
  }
}

export function resolveProvenanceAttrs(input: string): string {
  // parse attributes from input
  const fields: string[][] = csv.parse(input, {
    relaxColumnCount: true,
    skipEmptyLines: true,
  })[0]

  // check if builder-id attribute exists in the input
  for (const field of fields) {
    const parts = field
      .toString()
      .split(/(?<=^[^=]+?)=/)
      .map((item) => item.trim())
    if (parts[0] == 'builder-id') {
      return input
    }
  }

  // if not add builder-id attribute
  return `${input},builder-id=${provenanceBuilderID()}`
}

function provenanceBuilderID(): string {
  const serverURL = process.env.GITHUB_SERVER_URL || 'https://github.com'
  return `${serverURL}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`
}

function resolveRef(): string {
  let ref = github.context.ref
  if (github.context.sha && ref && !ref.startsWith('refs/')) ref = `refs/heads/${github.context.ref}`
  if (github.context.sha && !ref.startsWith(`refs/pull/`)) ref = github.context.sha
  return ref
}

let tempDir: string
export function getTempDir(): string {
  if (tempDir) return tempDir
  if (core.getState('tempDir')) return core.getState('tempDir')
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'depot-build-push-').split(path.sep).join(path.posix.sep))
  core.saveState('tempDir', tempDir)
  return tempDir
}

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export function getTempFile(): string {
  let tries = 0
  while (tries < 20) {
    let random
    try {
      random = crypto.randomBytes(16)
    } catch {
      random = crypto.pseudoRandomBytes(16)
    }

    const chars = []
    for (let i = 0; i < 10; i++) {
      chars.push(alphabet[random.readUInt8(i) % alphabet.length])
    }

    const filename = path.join(getTempDir(), chars.join(''))
    if (!fs.existsSync(filename)) return filename
    tries += 1
  }

  throw new Error('Unable to generate a temporary file')
}

export const isPost = !!core.getState('isPost')
if (!isPost) {
  core.saveState('isPost', 'true')
}

interface ListOptions {
  ignoreComma?: boolean
}

function getListInput(name: string, options: ListOptions = {}): string[] {
  const source = core.getInput(name).trim()
  if (source === '') return []

  const items: string[][] = csv.parse(source, {
    columns: false,
    relaxColumnCount: true,
    relaxQuotes: true,
    skipEmptyLines: true,
  })

  const list: string[] = []

  for (const item of items) {
    if (item.length === 1) {
      if (options.ignoreComma) {
        list.push(item[0])
      } else {
        list.push(...item[0].split(','))
      }
    } else if (options.ignoreComma) {
      list.push(item.join(','))
    } else {
      list.push(...item)
    }
  }

  return list.map((i) => i.trim()).filter((i) => i)
}
