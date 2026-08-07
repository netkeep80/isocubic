import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = join(repositoryRoot, 'src')
const maxLines = 1500
const sourceExtensions = new Set(['.ts', '.tsx', '.vue', '.js', '.jsx'])

// Legacy debt is explicit and bounded. A grandfathered file may not grow.
// Remove entries as soon as the corresponding refactoring issue is completed.
const legacyAllowlist = new Map([
  ['src/lib/tinyLLM.ts', { maxLines: 2848, issue: '#309' }],
])

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)))
    } else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(absolutePath)
    }
  }

  return files
}

function countLines(content) {
  if (content.length === 0) return 0
  return content.split(/\r?\n/).length
}

const files = await collectSourceFiles(sourceRoot)
const violations = []
const grandfathered = []

for (const absolutePath of files) {
  const repositoryPath = relative(repositoryRoot, absolutePath).replaceAll('\\', '/')
  const lineCount = countLines(await readFile(absolutePath, 'utf8'))

  if (lineCount <= maxLines) continue

  const legacy = legacyAllowlist.get(repositoryPath)
  if (legacy && lineCount <= legacy.maxLines) {
    grandfathered.push({ repositoryPath, lineCount, ...legacy })
    continue
  }

  violations.push({
    repositoryPath,
    lineCount,
    reason: legacy
      ? `legacy file grew beyond its temporary cap of ${legacy.maxLines} lines (${legacy.issue})`
      : `exceeds the ${maxLines}-line source-file limit`,
  })
}

for (const file of grandfathered) {
  console.warn(
    `LEGACY DEBT: ${file.repositoryPath} has ${file.lineCount} lines; temporary cap ${file.maxLines}, tracked by ${file.issue}`
  )
}

if (violations.length > 0) {
  console.error('\nSource file size gate failed:')
  for (const violation of violations) {
    console.error(`- ${violation.repositoryPath}: ${violation.lineCount} lines — ${violation.reason}`)
  }
  console.error('\nSplit the file or explicitly track pre-existing debt before merging.')
  process.exitCode = 1
} else {
  console.log(
    `File size gate passed: ${files.length} source files checked, ${grandfathered.length} explicitly grandfathered.`
  )
}
