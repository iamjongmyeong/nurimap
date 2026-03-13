import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export const parseCommaSeparatedEmails = (value) =>
  value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

export const parseDenylistFromDotenv = (content) => {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue
    }

    const [key, ...rest] = line.split('=')
    if (key === 'AUTH_BYPASS_EMAILS') {
      return parseCommaSeparatedEmails(rest.join('='))
    }
  }

  return []
}

export const findMetadataMatches = (values, denylist) => {
  const matches = []

  for (const [label, value] of Object.entries(values)) {
    const normalizedValue = value.toLowerCase()
    if (denylist.some((email) => normalizedValue.includes(email))) {
      matches.push(label)
    }
  }

  return matches
}

export const findFileMatches = (fileEntries, denylist) => {
  const matches = []

  for (const [filePath, content] of Object.entries(fileEntries)) {
    const normalizedContent = content.toLowerCase()
    if (denylist.some((email) => normalizedContent.includes(email))) {
      matches.push(filePath)
    }
  }

  return matches
}

const getArgValue = (args, name, defaultValue = null) => {
  const index = args.indexOf(name)
  if (index === -1) {
    return defaultValue
  }

  return args[index + 1] ?? defaultValue
}

const getGitOutput = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

const getDenylist = ({ sourceEnv, sourceFile }) => {
  const envValue = process.env[sourceEnv]
  if (envValue?.trim()) {
    return parseCommaSeparatedEmails(envValue)
  }

  if (!fs.existsSync(sourceFile)) {
    return []
  }

  return parseDenylistFromDotenv(fs.readFileSync(sourceFile, 'utf8'))
}

const collectPaths = (mode) => {
  if (mode === 'staged') {
    const output = getGitOutput(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    return output ? output.split('\n').filter(Boolean) : []
  }

  if (mode === 'tracked') {
    const output = getGitOutput(['ls-files'])
    return output ? output.split('\n').filter(Boolean) : []
  }

  throw new Error(`Unsupported path collection mode: ${mode}`)
}

const collectFileEntries = (mode) => {
  const entries = {}

  for (const filePath of collectPaths(mode)) {
    const absolutePath = path.resolve(filePath)
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue
    }

    try {
      entries[filePath] = fs.readFileSync(absolutePath, 'utf8')
    } catch {
      // Skip binary/unreadable files; the guard focuses on text content.
    }
  }

  return entries
}

const checkMetadata = (denylist) => {
  const metadata = {
    git_config_user_email: getGitOutput(['config', 'user.email']),
    git_author_ident: getGitOutput(['var', 'GIT_AUTHOR_IDENT']),
    git_committer_ident: getGitOutput(['var', 'GIT_COMMITTER_IDENT']),
  }

  return findMetadataMatches(metadata, denylist)
}

const checkHistoryMetadata = (denylist) => {
  const history = getGitOutput(['log', '--all', '--format=%ae%n%ce'])
  const values = { git_history_metadata: history }
  return findMetadataMatches(values, denylist)
}

const main = () => {
  const args = process.argv.slice(2)
  const sourceEnv = getArgValue(args, '--source-env', 'BYPASS_EMAIL_DENYLIST')
  const sourceFile = getArgValue(args, '--source-file', '.env.local')
  const requireDenylist = args.includes('--require-denylist')
  const shouldCheckMetadata = args.includes('--metadata')
  const shouldCheckStaged = args.includes('--staged')
  const shouldCheckTracked = args.includes('--tracked')
  const shouldCheckHistoryMetadata = args.includes('--history-metadata')

  const denylist = getDenylist({ sourceEnv, sourceFile })

  if (denylist.length === 0) {
    if (requireDenylist) {
      console.error(`[guard-bypass-email] denylist is missing. Configure ${sourceEnv} or ${sourceFile}.`)
      process.exit(1)
    }

    console.log(`[guard-bypass-email] denylist not configured; skipping checks (${sourceEnv}, ${sourceFile}).`)
    return
  }

  const violations = []

  if (shouldCheckMetadata) {
    const matches = checkMetadata(denylist)
    if (matches.length > 0) {
      violations.push(`git metadata matched live bypass denylist (${matches.join(', ')})`)
    }
  }

  if (shouldCheckHistoryMetadata) {
    const matches = checkHistoryMetadata(denylist)
    if (matches.length > 0) {
      violations.push('git history metadata still contains a live bypass denylist value')
    }
  }

  if (shouldCheckStaged) {
    const matches = findFileMatches(collectFileEntries('staged'), denylist)
    if (matches.length > 0) {
      violations.push(`staged tracked content matched live bypass denylist (${matches.join(', ')})`)
    }
  }

  if (shouldCheckTracked) {
    const matches = findFileMatches(collectFileEntries('tracked'), denylist)
    if (matches.length > 0) {
      violations.push(`tracked content matched live bypass denylist (${matches.join(', ')})`)
    }
  }

  if (violations.length > 0) {
    console.error('[guard-bypass-email] blocked because a live bypass email would leak into git-managed surfaces:')
    for (const violation of violations) {
      console.error(`- ${violation}`)
    }
    process.exit(1)
  }

  console.log(`[guard-bypass-email] passed ${denylist.length} denylisted email(s) across requested checks.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
