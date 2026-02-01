/**
 * Tests for MetaNet preprocessor validation logic.
 *
 * Tests the core metanet.json validation: schema compliance,
 * file existence checks, directory reference checks, and sync warnings.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

// We test the preprocessor by executing it as a child process
import { execSync } from 'node:child_process'

// Increased timeout for tests that spawn child processes (npx tsx is slow on macOS/Windows CI)
const PROCESS_TIMEOUT = 30000

describe('MetaNet Preprocessor', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metanet-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeJson(relPath: string, data: object) {
    const fullPath = path.join(tmpDir, relPath)
    const dir = path.dirname(fullPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2))
  }

  function writeFile(relPath: string, content: string = '') {
    const fullPath = path.join(tmpDir, relPath)
    const dir = path.dirname(fullPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fullPath, content)
  }

  describe('Schema validation', () => {
    it(
      'should validate a minimal valid metanet.json',
      () => {
        // Copy schema to tmpDir
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        writeJson('metanet.json', {
          name: 'test-project',
          description: 'A test project',
        })

        const result = execSync(
          `npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`,
          { cwd: tmpDir, encoding: 'utf-8' }
        )
        expect(result).toContain('All metanet.json files are valid')
      },
      PROCESS_TIMEOUT
    )

    it(
      'should detect missing required fields',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        // Missing "description" which is required
        writeJson('metanet.json', {
          name: 'test-project',
        })

        try {
          execSync(`npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`, {
            cwd: tmpDir,
            encoding: 'utf-8',
          })
          // Should not reach here
          expect.unreachable('Should have thrown')
        } catch (error: unknown) {
          const err = error as { stdout: string }
          expect(err.stdout).toContain('Schema error')
        }
      },
      PROCESS_TIMEOUT
    )
  })

  describe('File reference checks', () => {
    it(
      'should pass when referenced files exist',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        writeFile('index.ts', 'export {}')
        writeJson('metanet.json', {
          name: 'test',
          description: 'test',
          files: {
            'index.ts': { description: 'Entry point' },
          },
        })

        const result = execSync(
          `npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`,
          { cwd: tmpDir, encoding: 'utf-8' }
        )
        expect(result).toContain('All metanet.json files are valid')
      },
      PROCESS_TIMEOUT
    )

    it(
      'should error when referenced file does not exist',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        writeJson('metanet.json', {
          name: 'test',
          description: 'test',
          files: {
            'nonexistent.ts': { description: 'Does not exist' },
          },
        })

        try {
          execSync(`npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`, {
            cwd: tmpDir,
            encoding: 'utf-8',
          })
          expect.unreachable('Should have thrown')
        } catch (error: unknown) {
          const err = error as { stdout: string }
          expect(err.stdout).toContain('Referenced file does not exist')
          expect(err.stdout).toContain('nonexistent.ts')
        }
      },
      PROCESS_TIMEOUT
    )
  })

  describe('Directory reference checks', () => {
    it(
      'should recursively validate subdirectory metanet.json',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true })
        writeJson('metanet.json', {
          name: 'root',
          description: 'root dir',
          directories: {
            sub: { description: 'sub dir', metanet: 'sub/metanet.json' },
          },
        })
        writeJson('sub/metanet.json', {
          name: 'sub',
          description: 'sub directory',
        })

        const result = execSync(
          `npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`,
          { cwd: tmpDir, encoding: 'utf-8' }
        )
        expect(result).toContain('All metanet.json files are valid')
      },
      PROCESS_TIMEOUT
    )

    it(
      'should error when referenced subdirectory metanet.json does not exist',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true })
        writeJson('metanet.json', {
          name: 'root',
          description: 'root dir',
          directories: {
            sub: { description: 'sub dir', metanet: 'sub/metanet.json' },
          },
        })
        // No sub/metanet.json

        try {
          execSync(`npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`, {
            cwd: tmpDir,
            encoding: 'utf-8',
          })
          expect.unreachable('Should have thrown')
        } catch (error: unknown) {
          const err = error as { stdout: string }
          expect(err.stdout).toContain('Referenced metanet.json does not exist')
        }
      },
      PROCESS_TIMEOUT
    )
  })

  describe('Sync warnings', () => {
    it(
      'should warn about files not described in metanet.json when verbose',
      () => {
        const schemaPath = path.resolve('metanet.schema.json')
        fs.copyFileSync(schemaPath, path.join(tmpDir, 'metanet.schema.json'))

        writeFile('index.ts', 'export {}')
        writeFile('utils.ts', 'export {}')
        writeJson('metanet.json', {
          name: 'test',
          description: 'test',
          files: {
            'index.ts': { description: 'Entry point' },
          },
        })

        const result = execSync(
          `npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --verbose`,
          { cwd: tmpDir, encoding: 'utf-8' }
        )
        expect(result).toContain('File not described in metanet.json: utils.ts')
      },
      PROCESS_TIMEOUT
    )
  })
})

describe('MetaNet on actual project', () => {
  it(
    'should validate the actual project metanet.json files without errors',
    () => {
      const result = execSync(
        `npx tsx ${path.resolve('scripts/metanet-preprocessor.ts')} --check`,
        { cwd: path.resolve('.'), encoding: 'utf-8' }
      )
      expect(result).toContain('All metanet.json files are valid')
    },
    PROCESS_TIMEOUT
  )
})
