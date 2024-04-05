import * as core from '@actions/core'
import * as fs from 'fs'
import * as context from './context'
import * as depot from './depot'

async function main() {
  if (!(await depot.isInstalled())) {
    return core.setFailed(
      'Depot CLI is not installed. See https://github.com/depot/setup-action to install it before this step.',
    )
  }

  await core.group('Depot version', async () => {
    await depot.version()
  })

  const inputs = context.getInputs()
  core.info(JSON.stringify(core.getInput('secrets'), null, 2))
  core.info(JSON.stringify(inputs, null, 2))
  await depot.build(inputs)

  const imageID = depot.getImageID()
  const metadata = depot.getMetadata()
  const digest = depot.getDigest(metadata)

  if (imageID) {
    await core.group('ImageID', async () => {
      core.info(imageID)
      core.setOutput('imageid', imageID)
    })
  }

  if (digest) {
    await core.group(`Digest`, async () => {
      core.info(digest)
      core.setOutput('digest', digest)
    })
  }

  if (metadata) {
    await core.group(`Metadata`, async () => {
      core.info(metadata)
      core.setOutput('metadata', metadata)

      try {
        const parsed = JSON.parse(metadata)
        if (parsed?.['depot.build']?.buildID) {
          core.setOutput('build-id', parsed['depot.build'].buildID)
        }
        if (parsed?.['depot.build']?.projectID) {
          core.setOutput('project-id', parsed['depot.build'].projectID)
        }
      } catch {}
    })
  }
}

async function cleanup() {
  const tempDir = context.getTempDir()
  if (tempDir.length === 0) return
  core.startGroup(`Removing temp folder ${tempDir}`)
  fs.rmSync(tempDir, {recursive: true})
  core.endGroup()
}

;(context.isPost ? cleanup() : main()).catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error.message)
  } else {
    core.setFailed(`${error}`)
  }
})
