import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const apiRoot = path.resolve(projectRoot, 'api')
const srcRoot = path.resolve(projectRoot, 'src')
const allowedSrcImportRoots = [
  path.resolve(projectRoot, 'src/server-core'),
  path.resolve(projectRoot, 'src/shared'),
]

const collectTsFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      return collectTsFiles(fullPath)
    }

    return fullPath.endsWith('.ts') ? [fullPath] : []
  })
}

const extractImportSpecifiers = (source: string) => {
  const specifiers = new Set<string>()
  const fromRegex = /from\s+['"]([^'"]+)['"]/g
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g

  for (const regex of [fromRegex, sideEffectRegex]) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(source)) !== null) {
      specifiers.add(match[1])
    }
  }

  return [...specifiers]
}

const resolveRelativeImport = (fromFile: string, specifier: string) => {
  const resolvedPath = path.resolve(path.dirname(fromFile), specifier)
  const jsToTsPath = resolvedPath.endsWith('.js') ? resolvedPath.slice(0, -3) + '.ts' : null
  const candidates = [resolvedPath, jsToTsPath, `${resolvedPath}.ts`, path.join(resolvedPath, 'index.ts')].filter(Boolean)
  return candidates.find((candidate) => {
    try {
      return statSync(candidate as string).isFile()
    } catch {
      return false
    }
  })
}

const isAllowedSrcImport = (resolvedImportPath: string) =>
  allowedSrcImportRoots.some((allowedRoot) =>
    resolvedImportPath === allowedRoot || resolvedImportPath.startsWith(`${allowedRoot}${path.sep}`))

describe('api import boundary', () => {
  const apiFiles = collectTsFiles(apiRoot)

  it('keeps route imports inside api/, approved shared server roots, or external packages', () => {
    for (const file of apiFiles) {
      const source = readFileSync(file, 'utf8')
      const imports = extractImportSpecifiers(source)

      for (const specifier of imports) {
        if (!specifier.startsWith('.')) {
          continue
        }

        expect(specifier, `${path.relative(apiRoot, file)} should not use legacy api/_lib`).not.toContain('/_lib/')

        const resolved = resolveRelativeImport(file, specifier)
        expect(resolved, `${path.relative(apiRoot, file)} has unresolved import ${specifier}`).toBeTruthy()

        if (!resolved) {
          continue
        }

        const normalizedResolved = path.resolve(resolved)
        if (normalizedResolved.startsWith(`${srcRoot}${path.sep}`)) {
          expect(
            isAllowedSrcImport(normalizedResolved),
            `${path.relative(apiRoot, file)} imports disallowed src module ${specifier}`,
          ).toBe(true)
        }
      }
    }
  })

  it('uses explicit .js extensions for all relative imports', () => {
    for (const file of apiFiles) {
      const source = readFileSync(file, 'utf8')
      const imports = extractImportSpecifiers(source)

      for (const specifier of imports) {
        if (!specifier.startsWith('.')) {
          continue
        }

        expect(specifier, `${path.relative(apiRoot, file)} should use explicit .js extensions`).toMatch(/\.js$/)
      }
    }
  })
})
