import { access, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(frontendRoot, 'src')
const removed = []

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function hasTypeScriptSource(filePath) {
  const withoutMap = filePath.endsWith('.map') ? filePath.slice(0, -4) : filePath
  if (!withoutMap.endsWith('.js')) return false
  const stem = withoutMap.slice(0, -3)
  return (await exists(`${stem}.ts`)) || (await exists(`${stem}.tsx`))
}

async function cleanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await cleanDirectory(entryPath)
      continue
    }
    if (
      (entry.name.endsWith('.js') || entry.name.endsWith('.js.map'))
      && await hasTypeScriptSource(entryPath)
    ) {
      await rm(entryPath)
      removed.push(path.relative(frontendRoot, entryPath))
    }
  }
}

await cleanDirectory(sourceRoot)

if (removed.length > 0) {
  console.log(`Removed ${removed.length} stale compiled source artifact(s):`)
  for (const file of removed) console.log(`  - ${file}`)
}
