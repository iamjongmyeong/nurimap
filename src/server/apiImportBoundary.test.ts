import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const apiRoot = path.resolve(process.cwd(), 'api')

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

describe('api import boundary', () => {
  const apiFiles = collectTsFiles(apiRoot)

  it('keeps route and helper imports inside api/ or external packages', () => {
    for (const file of apiFiles) {
      const source = readFileSync(file, 'utf8')
      const imports = extractImportSpecifiers(source)

      for (const specifier of imports) {
        if (!specifier.startsWith('.')) {
          continue
        }

        expect(specifier, `${path.relative(apiRoot, file)} imports from src`).not.toMatch(/(^|\/)\.\.\/src\//)
        expect(specifier, `${path.relative(apiRoot, file)} imports from src`).not.toMatch(/(^|\/)\.\.\/\.\.\/src\//)

        const resolved = resolveRelativeImport(file, specifier)
        expect(resolved, `${path.relative(apiRoot, file)} has unresolved import ${specifier}`).toBeTruthy()
      }
    }
  })
})
