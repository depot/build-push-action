import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as http from '@actions/http-client'
import * as csv from 'csv-parse/sync'
import * as fs from 'fs'
import * as handlebars from 'handlebars'
import * as path from 'path'
import type {Inputs} from './context'
import * as context from './context'

const client = new http.HttpClient('depot-build-push-action')

export async function isInstalled(): Promise<boolean> {
  try {
    const {exitCode} = await exec.getExecOutput('depot', [], {ignoreReturnCode: true, silent: true})
    return exitCode === 0
  } catch {
    return false
  }
}

export async function version() {
  await exec.exec('depot', ['version'], {failOnStdErr: false})
}

export async function build(inputs: Inputs) {
  const defaultContext = context.getDefaultBuildContext()
  const args = [
    'build',
    ...flag('--add-host', inputs.addHosts),
    ...flag('--allow', inputs.allow.join(',')),
    ...flag('--build-arg', inputs.buildArgs),
    ...flag('--build-context', inputs.buildContexts),
    ...flag('--cache-from', inputs.cacheFrom),
    ...flag('--cache-to', inputs.cacheTo),
    ...flag('--cgroup-parent', inputs.cgroupParent),
    ...flag('--file', inputs.file),
    ...flag('--iidfile', isLocalOrTarOutput(inputs.outputs) ? false : getImageIDFile()),
    ...flag('--label', inputs.labels),
    ...flag('--load', inputs.load),
    ...flag('--metadata-file', getMetadataFile()),
    ...flag('--network', inputs.network),
    ...flag('--no-cache', inputs.noCache),
    ...flag('--output', inputs.outputs),
    ...flag('--platform', inputs.platforms.join(',')),
    ...flag('--project', inputs.project),
    ...flag('--pull', inputs.pull),
    ...flag('--push', inputs.push),
    ...flag('--shm-size', inputs.shmSize),
    ...flag('--ssh', inputs.ssh),
    ...flag('--tag', inputs.tags),
    ...flag('--target', inputs.target),
    ...flag('--ulimit', inputs.ulimit),

    // Secrets
    ...flag(
      '--secret',
      inputs.secrets.map((secret) => getSecret(secret)).filter((i): i is string => Boolean(i)),
    ),
    ...flag(
      '--secret',
      inputs.secretFiles.map((secret) => getSecret(secret, true)).filter((i): i is string => Boolean(i)),
    ),
    ...flag(
      '--secret',
      inputs.githubToken && !hasGitAuthTokenSecret(inputs.secrets) && inputs.context == defaultContext
        ? getSecret(`GIT_AUTH_TOKEN=${inputs.githubToken}`)
        : false,
    ),

    // Build context
    handlebars.compile(inputs.context)({defaultContext}),
  ]

  // Attempt to exchange GitHub Actions OIDC token for temporary Depot trust relationship token
  let token = inputs.token ?? process.env.DEPOT_TOKEN
  if (!token) {
    try {
      const odicToken = await core.getIDToken('https://depot.dev')
      const res = await client.postJson<{ok: boolean; token: string}>(
        'https://depot.dev/api/auth/oidc/github-actions',
        {token: odicToken},
      )
      if (res.result && res.result.token) {
        token = res.result.token
        core.info(`Exchanged GitHub Actions OIDC token for temporary Depot token`)
      }
    } catch (err) {
      core.info(`Unable to exchange GitHub OIDC token for temporary Depot token: ${err}`)
    }
  }

  const res = await exec.getExecOutput('depot', args, {
    ignoreReturnCode: true,
    env: {
      ...process.env,
      ...(token ? {DEPOT_TOKEN: token} : {}),
    },
  })
  if (res.stderr.length > 0 && res.exitCode != 0) {
    throw new Error(`depot failed with: ${res.stderr.match(/(.*)\s*$/)?.[0]?.trim() ?? 'unknown error'}`)
  }
}

function flag(name: string, value: string | string[] | boolean | undefined): string[] {
  if (!value) return []
  if (value === true) return [name]
  if (Array.isArray(value)) return value.flatMap((item) => [name, item])
  return [name, value]
}

function isLocalOrTarOutput(outputs: string[]) {
  const rows: string[][] = csv.parse(outputs.join('\n'), {
    columns: false,
    relaxColumnCount: true,
    trim: true,
  })
  for (const row of rows) {
    if (row.length === 1 && !row[0].startsWith('type=')) return true
    for (const [key, value] of row.map((item) => item.split('=').map((item) => item.trim()))) {
      if (key === 'type' && (value === 'local' || value === 'tar')) return true
    }
  }
  return false
}

function hasGitAuthTokenSecret(secrets: string[]): boolean {
  return secrets.some((secret) => secret.startsWith('GIT_AUTH_TOKEN='))
}

function getSecret(secret: string, isFile?: boolean) {
  try {
    const idx = secret.indexOf('=')
    const key = secret.substring(0, idx)
    let value = secret.substring(idx + 1)
    if (!key || !value) throw new Error(`Invalid secret: ${secret}`)

    if (isFile) {
      if (!fs.existsSync(value)) throw new Error(`Secret file not found: ${value}`)
      value = fs.readFileSync(value, 'utf8')
    }

    const secretFile = context.getTempFile()
    fs.writeFileSync(secretFile, value)
    return `id=${key},src=${secretFile}`
  } catch (error: any) {
    core.warning(error.message)
  }
}

function getImageIDFile(): string {
  return path.join(context.getTempDir(), 'iidfile').split(path.sep).join(path.posix.sep)
}

export function getImageID(): string | undefined {
  const iidFile = getImageIDFile()
  if (!fs.existsSync(iidFile)) return undefined
  return fs.readFileSync(iidFile, {encoding: 'utf-8'}).trim()
}

export function getMetadataFile(): string {
  return path.join(context.getTempDir(), 'metadata-file').split(path.sep).join(path.posix.sep)
}

export function getMetadata(): string | undefined {
  const metadataFile = getMetadataFile()
  if (!fs.existsSync(metadataFile)) return undefined
  const content = fs.readFileSync(metadataFile, {encoding: 'utf-8'}).trim()
  if (content === 'null') return undefined
  return content
}

export function getDigest(source?: string): string | undefined {
  if (source === undefined) return undefined
  const metadata = JSON.parse(source)
  return metadata['containerimage.digest']
}
