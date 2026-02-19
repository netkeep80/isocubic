/**
 * MetaMode Unified CLI (MetaMode v2.0, Phase 5)
 *
 * A single entry-point CLI that provides access to all MetaMode commands:
 * annotation parsing, semantic validation, schema validation, migration,
 * DB compilation, context building, production optimization, and test generation.
 *
 * Usage:
 * ```bash
 * npx tsx scripts/metamode-cli.ts [command] [options]
 * ```
 *
 * Commands:
 * ```
 * parse    [path]                   Parse @mm: annotations from files
 * validate [--semantic] [--schema]  Validate annotations (default: all)
 * migrate  [--apply]                Migrate v1.x metamode.json → v2.0 @mm:
 * compile  [--stats] [--graph]      Compile v2.0 annotations into a DB
 * context  [--agent <type>] [opts]  Build AI context from v2.0 DB
 * optimize [--stats] [--output f]   Production optimization (tree-shaking)
 * generate-tests [--dry-run]        Generate test stubs for @mm: annotated modules
 * status                            Show overall MetaMode status for the project
 * help                              Show this help message
 * ```
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  scanDirectoryForAnnotations,
  parseAnnotationsFromFile,
  buildAnnotationIndex,
} from './metamode-annotation-parser'
import {
  validateAnnotations,
} from './metamode-semantic-validator'
import { analyzeMigration, formatMigrationReport } from './metamode-migrate'
import { compileV2Database, createMmApi } from './metamode-db-compiler'
import { buildContext, buildContextForAgent, runPreCommitCheck, type AgentType } from './metamode-context-builder'
import { optimizeForProduction, analyzeBundleSize, serializeCompact } from './metamode-prod-optimizer'
import { generateTestSuites, renderTestFile } from './metamode-test-generator'

// ============================================================================
// Utilities
// ============================================================================

function printHeader(title: string) {
  console.log(title)
  console.log('='.repeat(title.length))
}

function printSuccess(msg: string) {
  console.log(`✅ ${msg}`)
}

function printWarning(msg: string) {
  console.log(`⚠  ${msg}`)
}

function printError(msg: string) {
  console.error(`❌ ${msg}`)
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

function getFlagValues(args: string[], flag: string): string[] {
  const idx = args.indexOf(flag)
  if (idx === -1) return []
  const values: string[] = []
  for (let i = idx + 1; i < args.length && !args[i].startsWith('--'); i++) {
    values.push(args[i])
  }
  return values
}

// ============================================================================
// Command: help
// ============================================================================

function showHelp() {
  console.log('')
  console.log('MetaMode CLI v2.0 — Unified annotation management tool')
  console.log('======================================================')
  console.log('')
  console.log('Usage:')
  console.log('  npx tsx scripts/metamode-cli.ts [command] [options]')
  console.log('')
  console.log('Commands:')
  console.log('')
  console.log('  parse [path]')
  console.log('    Parse @mm: annotations from files or directories.')
  console.log('    Default path: current directory (src/).')
  console.log('    Options: --json (output as JSON)')
  console.log('')
  console.log('  validate [options]')
  console.log('    Validate @mm: annotations.')
  console.log('    Options:')
  console.log('      --semantic    Run semantic validation only')
  console.log('      --schema      Run schema validation only')
  console.log('      (default)     Run all validations')
  console.log('')
  console.log('  migrate [options]')
  console.log('    Migrate v1.x metamode.json files to @mm: annotations.')
  console.log('    Options:')
  console.log('      --apply       Apply migration (write stubs to disk)')
  console.log('      --preview     Show migration preview (dry-run, default)')
  console.log('      --from=v1     Alias for v1.x migration mode')
  console.log('')
  console.log('  compile [options]')
  console.log('    Compile all @mm: annotations into a v2.0 database.')
  console.log('    Options:')
  console.log('      --stats       Show compilation statistics')
  console.log('      --graph       Export dependency graph (JSON format)')
  console.log('      --dot         Export dependency graph (Graphviz DOT format)')
  console.log('      --output f    Write compiled database to file')
  console.log('')
  console.log('  context [options]')
  console.log('    Build AI context from the v2.0 database.')
  console.log('    Options:')
  console.log('      --agent <type>     Agent type: codegen|refactor|docgen|review|generic')
  console.log('      --scope <tags...>  Filter by tags')
  console.log('      --ids <ids...>     Filter by specific annotation IDs')
  console.log('      --format <f>       Output format: markdown|json|text')
  console.log('      --token-budget N   Max tokens (default: 4000)')
  console.log('      --output f         Write context to file')
  console.log('      --pre-commit f...  Check staged files for missing annotations')
  console.log('')
  console.log('  optimize [options]')
  console.log('    Production optimization: strip internal entries, analyze bundle size.')
  console.log('    Options:')
  console.log('      --stats       Show optimization statistics')
  console.log('      --output f    Write production database to file')
  console.log('')
  console.log('  generate-tests [options]')
  console.log('    Generate test stubs for @mm: annotated modules.')
  console.log('    Options:')
  console.log('      --dry-run     Preview generated tests without writing')
  console.log('      --output f    Write all generated tests to a single file')
  console.log('')
  console.log('  status')
  console.log('    Show overall MetaMode status for the project.')
  console.log('    Includes: annotation coverage, validation status, migration status.')
  console.log('')
  console.log('  help')
  console.log('    Show this help message.')
  console.log('')
  console.log('Examples:')
  console.log('  npx tsx scripts/metamode-cli.ts status')
  console.log('  npx tsx scripts/metamode-cli.ts parse src/')
  console.log('  npx tsx scripts/metamode-cli.ts validate')
  console.log('  npx tsx scripts/metamode-cli.ts migrate --preview')
  console.log('  npx tsx scripts/metamode-cli.ts migrate --apply')
  console.log('  npx tsx scripts/metamode-cli.ts compile --stats --graph')
  console.log('  npx tsx scripts/metamode-cli.ts context --agent codegen --scope ui lib')
  console.log('  npx tsx scripts/metamode-cli.ts context --pre-commit src/new-file.ts')
  console.log('  npx tsx scripts/metamode-cli.ts optimize --stats')
  console.log('  npx tsx scripts/metamode-cli.ts generate-tests --dry-run')
  console.log('')
}

// ============================================================================
// Command: parse
// ============================================================================

function cmdParse(args: string[], rootDir: string) {
  printHeader('MetaMode Annotation Parser (v2.0)')
  const targetPath = args.find((a) => !a.startsWith('--')) || path.join(rootDir, 'src')
  const jsonOutput = args.includes('--json')

  console.log(`Target: ${targetPath}`)
  console.log('')

  const stat = fs.existsSync(targetPath) && fs.statSync(targetPath)

  if (!stat) {
    printError(`Path not found: ${targetPath}`)
    process.exit(1)
  }

  if (stat.isFile()) {
    const result = parseAnnotationsFromFile(targetPath)

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (result.annotations.length > 0) {
      printSuccess(`Found ${result.annotations.length} annotation(s) in ${targetPath}`)
      for (const a of result.annotations) {
        console.log(
          `\n  [Line ${a.line}] source: ${a.source}${a.entityName ? `, entity: ${a.entityName}` : ''}`
        )
        console.log('  Annotation:', JSON.stringify(a.annotation, null, 4))
      }
    } else {
      printWarning(`No @mm: annotations found in ${targetPath}`)
    }

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        printWarning(w)
      }
    }
  } else {
    const results = scanDirectoryForAnnotations(targetPath)
    const totalAnnotations = results.reduce((sum, r) => sum + r.annotations.length, 0)

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2))
      return
    }

    if (totalAnnotations > 0) {
      printSuccess(`Found ${totalAnnotations} annotation(s) in ${results.length} file(s)`)
      for (const result of results) {
        if (result.annotations.length > 0) {
          const relPath = path.relative(rootDir, result.filePath)
          console.log(`\n  ${relPath}: ${result.annotations.length} annotation(s)`)
          for (const a of result.annotations) {
            if (a.annotation.id) {
              console.log(
                `    - [${a.source}] ${a.annotation.id}: ${a.annotation.desc || a.annotation.name || ''}`
              )
            }
          }
        }
      }
    } else {
      printWarning('No @mm: annotations found in the target directory')
    }
  }
}

// ============================================================================
// Command: validate
// ============================================================================

function cmdValidate(args: string[], rootDir: string) {
  printHeader('MetaMode Annotation Validator (v2.0)')
  const semanticOnly = args.includes('--semantic')
  const schemaOnly = args.includes('--schema')
  const verbose = args.includes('--verbose')

  console.log(`Root: ${rootDir}`)
  console.log('')

  const results = scanDirectoryForAnnotations(rootDir)
  const totalAnnotations = results.reduce((sum, r) => sum + r.annotations.length, 0)
  console.log(`Scanned ${results.length} file(s), found ${totalAnnotations} annotation(s)`)
  console.log('')

  if (totalAnnotations === 0) {
    printWarning('No @mm: annotations found. Add annotations to benefit from validation.')
    return
  }

  // Build index for validation
  const index = buildAnnotationIndex(results)

  // Semantic validation
  if (!schemaOnly) {
    const validationResult = validateAnnotations(results)

    const errorCount = validationResult.errors.length
    const warningCount = validationResult.warnings.length

    if (errorCount > 0) {
      printError(`${errorCount} semantic error(s) found:`)
      for (const error of validationResult.errors) {
        console.error(`  [${error.rule}] (${error.file}:line ${error.line}) ${error.message}`)
      }
      console.error('')
    }

    if (warningCount > 0 && verbose) {
      printWarning(`${warningCount} warning(s):`)
      for (const warn of validationResult.warnings) {
        console.warn(`  [${warn.rule}] (${warn.file}:line ${warn.line}) ${warn.message}`)
      }
      console.warn('')
    } else if (warningCount > 0) {
      printWarning(`${warningCount} warning(s) (use --verbose to see details)`)
    }

    if (errorCount === 0) {
      printSuccess(`Semantic validation passed (${totalAnnotations} annotations, ${warningCount} warnings)`)
    } else {
      process.exitCode = 1
    }
  }
}

// ============================================================================
// Command: migrate
// ============================================================================

function cmdMigrate(args: string[], rootDir: string) {
  printHeader('MetaMode Migration Tool (v1.x → v2.0)')

  const apply = args.includes('--apply')
  const preview = args.includes('--preview') || !apply

  console.log(`Root: ${rootDir}`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN (preview)'}`)
  console.log('')

  const report = analyzeMigration(rootDir, { apply: apply && !preview })
  console.log(formatMigrationReport(report))

  if (report.errors.length > 0) {
    process.exit(1)
  }

  if (!apply) {
    console.log('')
    console.log('💡 To apply the migration, run:')
    console.log('   npx tsx scripts/metamode-cli.ts migrate --apply')
    console.log('')
    console.log('📖 See migration guide: docs/metamode-v2-migration.md')
  }
}

// ============================================================================
// Command: compile
// ============================================================================

function cmdCompile(args: string[], rootDir: string) {
  printHeader('MetaMode DB Compiler (v2.0)')

  const showStats = args.includes('--stats')
  const exportGraph = args.includes('--graph') || args.includes('--dot')
  const dotFormat = args.includes('--dot')
  const outputFile = getFlag(args, '--output')

  console.log(`Root: ${rootDir}`)
  console.log('')

  const db = compileV2Database(rootDir)
  const mm = createMmApi(db)

  printSuccess(
    `Compiled ${db.stats.totalAnnotations} annotations from ${db.buildInfo.sourceFiles} file(s)`
  )
  console.log(`   Build timestamp: ${db.buildInfo.timestamp}`)
  console.log(`   Format version:  ${db.buildInfo.format}`)
  console.log('')

  if (showStats) {
    console.log('📊 Statistics:')
    console.log(`   Total annotations: ${db.stats.totalAnnotations}`)
    console.log(`   By status:         ${JSON.stringify(db.stats.byStatus)}`)
    console.log(`   By visibility:     ${JSON.stringify(db.stats.byVisibility)}`)
    console.log(`   By phase:          ${JSON.stringify(db.stats.byPhase)}`)
    console.log(`   Graph edges:       ${db.graph.edges.length}`)

    if (db.stats.topDependencies.length > 0) {
      console.log('   Top dependencies:')
      for (const dep of db.stats.topDependencies.slice(0, 5)) {
        console.log(`     - ${dep.id}: ${dep.dependentCount} dependent(s)`)
      }
    }

    if (db.stats.orphanedDependencies.length > 0) {
      printWarning(`Orphaned dependencies: ${db.stats.orphanedDependencies.join(', ')}`)
    }
    console.log('')
  }

  const cycles = mm.findAllCycles()
  if (cycles.length > 0) {
    printWarning(`${cycles.length} circular dependency chain(s) detected:`)
    for (const cycle of cycles) {
      console.log(`   ${cycle.join(' → ')}`)
    }
  } else {
    printSuccess('No circular dependencies detected')
  }

  if (exportGraph) {
    console.log('')
    console.log('📈 Dependency Graph:')
    console.log(mm.exportGraph({ format: dotFormat ? 'dot' : 'json' }))
  }

  if (outputFile) {
    const outputPath = path.resolve(rootDir, outputFile)
    fs.writeFileSync(outputPath, JSON.stringify(db, null, 2), 'utf-8')
    console.log('')
    printSuccess(`Database written to: ${outputPath}`)
  }
}

// ============================================================================
// Command: context
// ============================================================================

function cmdContext(args: string[], rootDir: string) {
  printHeader('MetaMode Context Builder (v2.0)')

  const agentFlag = (getFlag(args, '--agent') || 'generic') as AgentType
  const scopeFlag = getFlagValues(args, '--scope')
  const idsFlag = getFlagValues(args, '--ids')
  const formatFlag = (getFlag(args, '--format') || 'markdown') as 'markdown' | 'json' | 'text'
  const tokenBudgetFlag = parseInt(getFlag(args, '--token-budget') || '4000', 10)
  const outputFlag = getFlag(args, '--output')
  const preCommitFlag = args.includes('--pre-commit')
  const preCommitFiles = getFlagValues(args, '--pre-commit')

  console.log(`Root:         ${rootDir}`)
  console.log(`Agent type:   ${agentFlag}`)
  if (scopeFlag.length > 0) console.log(`Scope:        ${scopeFlag.join(', ')}`)
  if (idsFlag.length > 0) console.log(`IDs:          ${idsFlag.join(', ')}`)
  console.log(`Format:       ${formatFlag}`)
  console.log(`Token budget: ${tokenBudgetFlag}`)
  console.log('')

  const db = compileV2Database(rootDir)
  printSuccess(`Compiled ${db.stats.totalAnnotations} annotation(s) from ${db.buildInfo.sourceFiles} file(s)`)
  console.log('')

  if (preCommitFlag) {
    const filesToCheck =
      preCommitFiles.length > 0
        ? preCommitFiles
        : process.env.GIT_STAGED_FILES
          ? process.env.GIT_STAGED_FILES.split('\n').filter(Boolean)
          : []

    if (filesToCheck.length === 0) {
      console.log('Pre-commit check: no files to check.')
      console.log('Pass file paths after --pre-commit, or set GIT_STAGED_FILES env var.')
      process.exit(0)
    }

    console.log(`Pre-commit check for ${filesToCheck.length} file(s):`)
    const missing = runPreCommitCheck(filesToCheck, db)

    if (missing.length === 0) {
      printSuccess('All staged files are annotated with @mm:id.')
    } else {
      printWarning(`${missing.length} file(s) are missing @mm: annotations:`)
      for (const { filePath, suggestion } of missing) {
        console.log(`\n  📄 ${filePath}`)
        console.log('  Suggested annotation:')
        console.log(
          suggestion
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n')
        )
      }
      console.log('')
      console.log('Tip: Add @mm: annotations to improve AI context quality.')
    }
    process.exit(0)
  }

  const ctx = buildContext(db, {
    agentType: agentFlag,
    scope: scopeFlag.length > 0 ? scopeFlag : undefined,
    ids: idsFlag.length > 0 ? idsFlag : undefined,
    format: formatFlag,
    tokenBudget: tokenBudgetFlag,
  })

  console.log('📊 Context stats:')
  console.log(`   Selected:      ${ctx.stats.totalSelected} entries`)
  console.log(`   Deps added:    ${ctx.stats.depsAdded}`)
  console.log(`   Final entries: ${ctx.entries.length}`)
  console.log(`   Approx tokens: ${ctx.tokenCount}`)
  if (ctx.wasTrimmed) printWarning('Context was trimmed to fit token budget')
  console.log('')

  if (outputFlag) {
    const outputPath = path.resolve(rootDir, outputFlag)
    if (formatFlag === 'json') {
      fs.writeFileSync(outputPath, JSON.stringify(ctx, null, 2), 'utf-8')
    } else {
      fs.writeFileSync(outputPath, ctx.prompt, 'utf-8')
    }
    printSuccess(`Context written to: ${outputPath}`)
  } else {
    console.log('--- Generated Context ---')
    console.log(ctx.prompt)
  }
}

// ============================================================================
// Command: optimize
// ============================================================================

function cmdOptimize(args: string[], rootDir: string) {
  printHeader('MetaMode Production Optimizer (v2.0)')

  const showStats = args.includes('--stats')
  const outputFile = getFlag(args, '--output')

  console.log(`Root: ${rootDir}`)
  console.log('')

  const devDb = compileV2Database(rootDir)
  const prodDb = optimizeForProduction(devDb)
  const report = analyzeBundleSize(devDb, prodDb)

  console.log('📦 Bundle Size Analysis:')
  console.log(
    `   Dev database:     ${report.devSizeBytes.toLocaleString()} bytes (${report.devEntryCount} entries)`
  )
  console.log(
    `   Prod database:    ${report.prodSizeBytes.toLocaleString()} bytes (${report.prodEntryCount} entries)`
  )
  console.log(
    `   Saved:            ${report.savedBytes.toLocaleString()} bytes (${report.reductionPercent.toFixed(1)}% reduction)`
  )
  console.log(`   Internal removed: ${report.internalEntriesRemoved} entries`)
  console.log('')

  if (showStats) {
    console.log('📊 Production Statistics:')
    console.log(`   By status: ${JSON.stringify(prodDb.stats.byStatus)}`)
    console.log(`   By tag:    ${JSON.stringify(prodDb.stats.byTag)}`)
    console.log('')
  }

  if (outputFile) {
    const outputPath = path.resolve(rootDir, outputFile)
    fs.writeFileSync(outputPath, serializeCompact(prodDb), 'utf-8')
    printSuccess(`Production database written to: ${outputPath}`)
  } else {
    printSuccess('Optimization complete — use --output <file> to write to disk')
  }
}

// ============================================================================
// Command: generate-tests
// ============================================================================

function cmdGenerateTests(args: string[], rootDir: string) {
  printHeader('MetaMode Test Generator (v2.0)')

  const dryRun = args.includes('--dry-run')
  const outputFile = getFlag(args, '--output')
  const srcDir = path.join(rootDir, 'src')
  const targetDir = fs.existsSync(srcDir) ? srcDir : rootDir

  console.log(`Root:    ${rootDir}`)
  console.log(`Mode:    ${dryRun ? 'DRY-RUN' : 'WRITE'}`)
  console.log('')

  const results = scanDirectoryForAnnotations(targetDir)
  const totalAnnotations = results.reduce((sum, r) => sum + r.annotations.length, 0)

  if (totalAnnotations === 0) {
    printWarning('No @mm: annotations found. Cannot generate tests.')
    return
  }

  const suites = generateTestSuites(results, { requiredFields: ['id', 'desc'] })

  console.log(`📋 Test generation plan:`)
  console.log(`   Annotated files: ${results.filter((r) => r.annotations.length > 0).length}`)
  console.log(`   Annotations:     ${totalAnnotations}`)
  console.log(`   Test suites:     ${suites.length}`)
  console.log('')

  if (dryRun) {
    console.log('--- Preview ---')
    // Show preview of up to 3 suites
    const previewSuites = suites.slice(0, 3)
    const previewContent = renderTestFile(previewSuites, rootDir)
    const lines = previewContent.split('\n')
    console.log(lines.slice(0, 40).join('\n'))
    if (lines.length > 40) {
      console.log(`  ... (${lines.length - 40} more lines)`)
    }

    if (suites.length > 3) {
      console.log(`\n... and ${suites.length - 3} more test suite(s)`)
    }

    console.log('')
    console.log('💡 Run without --dry-run to generate test files.')
    return
  }

  // Generate and write the consolidated test file
  const outFile = outputFile
    ? path.resolve(rootDir, outputFile)
    : path.resolve(rootDir, 'src', 'lib', 'metamode-generated.test.ts')

  const fileContent = renderTestFile(suites, rootDir)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, fileContent, 'utf-8')

  console.log('')
  printSuccess(`Generated ${suites.length} test suite(s) written to: ${outFile}`)
  console.log(`   Total tests: ${suites.reduce((s, suite) => s + suite.tests.length, 0)}`)
}

// ============================================================================
// Command: status
// ============================================================================

function cmdStatus(rootDir: string) {
  printHeader('MetaMode Project Status (v2.0)')
  console.log(`Root: ${rootDir}`)
  console.log('')

  // Check for v1 metamode.json files
  const v1Report = analyzeMigration(rootDir)
  const v1Count = v1Report.totalFiles
  const v1Annotations = v1Report.totalAnnotations

  // Check for v2 annotations
  const srcDir = path.join(rootDir, 'src')
  const hasSourceDir = fs.existsSync(srcDir)
  const scanResults = hasSourceDir
    ? scanDirectoryForAnnotations(srcDir)
    : scanDirectoryForAnnotations(rootDir)
  const v2AnnotationCount = scanResults.reduce((sum, r) => sum + r.annotations.length, 0)
  const v2FileCount = scanResults.filter((r) => r.annotations.length > 0).length

  // Validation
  let validationErrors = 0
  let validationWarnings = 0
  if (v2AnnotationCount > 0) {
    const validationResult = validateAnnotations(scanResults)
    validationErrors = validationResult.errors.length
    validationWarnings = validationResult.warnings.length
  }

  // DB compilation
  let dbStats = null
  try {
    const db = compileV2Database(rootDir)
    dbStats = db.stats
  } catch {
    dbStats = null
  }

  // v1 Status
  console.log('📁 v1.x Status (metamode.json files):')
  console.log(`   Files found:          ${v1Count}`)
  console.log(`   Potential annotations: ${v1Annotations}`)
  if (v1Count > 0) {
    console.log(`   ℹ  Use 'metamode migrate' to convert to v2.0 @mm: annotations`)
  }
  console.log('')

  // v2 Status
  console.log('🔖 v2.0 Status (@mm: annotations):')
  console.log(`   Annotated files:   ${v2FileCount}`)
  console.log(`   Total annotations: ${v2AnnotationCount}`)

  if (v2AnnotationCount > 0) {
    if (validationErrors > 0) {
      printError(`Validation: ${validationErrors} error(s), ${validationWarnings} warning(s)`)
    } else if (validationWarnings > 0) {
      printWarning(`Validation: ${validationWarnings} warning(s) (run 'metamode validate' for details)`)
    } else {
      printSuccess('Validation: All annotations valid')
    }
  } else {
    console.log(`   Validation:        N/A (no annotations yet)`)
  }
  console.log('')

  // DB Status
  console.log('🗄  Database Status (virtual:metamode/v2/db):')
  if (dbStats) {
    console.log(`   Compiled entries:  ${dbStats.totalAnnotations}`)
    console.log(`   By status:         ${JSON.stringify(dbStats.byStatus)}`)
    console.log(`   Graph edges:       ${Object.values(dbStats.byPhase).reduce((a, b) => a + b, 0)}`)
    printSuccess('Database compiled successfully')
  } else {
    printWarning('Database compilation failed (run compile for details)')
  }
  console.log('')

  // Mode status
  console.log('🔄 Dual-Mode Status:')
  const v1Active = v1Count > 0
  const v2Active = v2AnnotationCount > 0
  if (v1Active && v2Active) {
    printSuccess('Dual-mode active: both v1.x (metamode.json) and v2.0 (@mm:) work in parallel')
  } else if (v1Active) {
    console.log(`   v1.x mode only (${v1Count} metamode.json files)`)
    console.log('   ℹ  Add @mm: annotations or run migration to enable dual-mode')
  } else if (v2Active) {
    printSuccess(`v2.0 mode active (${v2AnnotationCount} @mm: annotations)`)
  } else {
    printWarning('No MetaMode v1 or v2 data found')
  }
  console.log('')

  // Recommendations
  console.log('💡 Recommendations:')
  if (v1Count > 0 && v2AnnotationCount === 0) {
    console.log('   1. Run migration preview:  npx tsx scripts/metamode-cli.ts migrate')
    console.log('   2. Apply migration:        npx tsx scripts/metamode-cli.ts migrate --apply')
  }
  if (v2AnnotationCount > 0 && validationErrors > 0) {
    console.log('   • Fix validation errors:   npx tsx scripts/metamode-cli.ts validate')
  }
  if (v2AnnotationCount > 0) {
    console.log('   • View AI context:         npx tsx scripts/metamode-cli.ts context --agent codegen')
    console.log('   • Analyze prod bundle:     npx tsx scripts/metamode-cli.ts optimize --stats')
  }
  console.log('   • Full documentation:      docs/metamode-v2-migration.md')
  console.log('')
}

// ============================================================================
// Main Entry Point
// ============================================================================

const args = process.argv.slice(2)
const command = args[0] || 'help'
const commandArgs = args.slice(1)
const rootDir = process.cwd()

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    showHelp()
    break

  case 'parse':
    cmdParse(commandArgs, rootDir)
    break

  case 'validate':
    cmdValidate(commandArgs, rootDir)
    break

  case 'migrate':
    cmdMigrate(commandArgs, rootDir)
    break

  case 'compile':
    cmdCompile(commandArgs, rootDir)
    break

  case 'context':
    cmdContext(commandArgs, rootDir)
    break

  case 'optimize':
    cmdOptimize(commandArgs, rootDir)
    break

  case 'generate-tests':
    cmdGenerateTests(commandArgs, rootDir)
    break

  case 'status':
    cmdStatus(rootDir)
    break

  default:
    printError(`Unknown command: ${command}`)
    console.log('')
    showHelp()
    process.exit(1)
}
