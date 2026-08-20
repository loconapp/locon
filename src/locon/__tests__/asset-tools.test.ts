import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve(__dirname, '../../../skills/locon-sync/scripts/check-locon-assets.mjs')
const writer = resolve(__dirname, '../../../skills/locon-sync/scripts/write_locale.py')
const temporaryDirectories: string[] = []

function temporaryProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'locon-tools-'))
  temporaryDirectories.push(root)
  mkdirSync(join(root, 'assets'))
  mkdirSync(join(root, 'src'))

  return root
}

function writeJson(path: string, value: object): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

type CheckerOptions = {
  allowImplicitCount?: string
  allowKeys?: string
  locales?: string
  source?: string
  strictOrphans?: boolean
  strictPlurals?: boolean
}

function runChecker(root: string, options: CheckerOptions = {}) {
  return spawnSync(
    process.execPath,
    [
      checker,
      '--root',
      root,
      '--source',
      options.source ?? 'de',
      '--assets',
      'assets',
      '--src',
      'src',
      ...(options.locales ? ['--locales', options.locales] : []),
      ...(options.allowKeys ? ['--allow-keys', options.allowKeys] : []),
      ...(options.allowImplicitCount ? ['--allow-implicit-count', options.allowImplicitCount] : []),
      ...(options.strictOrphans ? ['--strict-orphans'] : []),
      ...(options.strictPlurals ? ['--strict-plurals'] : []),
    ],
    { encoding: 'utf8' },
  )
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('shipped asset tools', () => {
  it('audits static quote styles, lIn, JSX attributes, assetKey and plural bases', () => {
    const root = temporaryProject()
    const source = {
      double_quote: 'Hallo',
      template: "Wie geht's?",
      scoped: 'Bericht',
      jsx: 'Mehrzeiliger Text',
      duplicate_first: 'Gleich',
      duplicate_second: 'Gleich',
      day_one: '{count} Tag',
      day_other: '{count} Tage',
    }
    const english = {
      double_quote: 'Hello',
      template: 'How are you?',
      scoped: 'Report',
      jsx: 'Multiline text',
      duplicate_first: 'Same',
      duplicate_second: 'Same',
      day_other: '{count} days',
      day_one: '{count} day',
    }

    writeJson(join(root, 'assets/de.json'), source)
    writeJson(join(root, 'assets/en.json'), english)
    writeFileSync(
      join(root, 'src/example.tsx'),
      [
        'l("Hallo")',
        "l(`Wie geht's?`)",
        'lIn(locale, "Bericht")',
        "l('Gleich')",
        '<LText tone="quiet">',
        '  Mehrzeiliger Text',
        '</LText>',
        '<LText assetKey={"duplicate_second"}>Fallback</LText>',
        'l("day", { count: 2 })',
      ].join('\n'),
    )

    const result = runChecker(root, { strictOrphans: true })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('✓ assets and code agree')
  })

  it('reports orphans by default and makes them fatal on request', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { used: 'Benutzt', orphan: 'Verwaist' })
    writeJson(join(root, 'assets/en.json'), { used: 'Used', orphan: 'Orphaned' })
    writeFileSync(join(root, 'src/example.ts'), "l('Benutzt')\n")

    const advisory = runChecker(root)
    const strict = runChecker(root, { strictOrphans: true })

    expect(advisory.status).toBe(0)
    expect(advisory.stdout).toContain('orphaned keys (1)')
    expect(strict.status).toBe(1)
    expect(strict.stdout).toContain('1 orphaned key(s)')
  })

  it('rejects a source plural family without the mandatory other category', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    writeJson(join(assets, 'de.json'), { day_one: '{count} Tag' })
    writeJson(join(assets, 'en.json'), { day_one: '{count} day' })
    writeFileSync(join(root, 'src/example.ts'), "l('day', { count: 1 })\n")

    const audit = runChecker(root)
    const generated = spawnSync(
      'python3',
      [
        '-c',
        [
          'import pathlib, runpy',
          `module = runpy.run_path(${JSON.stringify(writer)})`,
          `module['write']('en', {'day_one': '{count} day'}, assets=pathlib.Path(${JSON.stringify(assets)}), source_locale='de')`,
        ].join('\n'),
      ],
      { encoding: 'utf8' },
    )

    expect(audit.status).toBe(1)
    expect(audit.stdout).toContain('must define day_other')
    expect(generated.status).not.toBe(0)
    expect(generated.stderr).toContain('plural families must define an _other catch-all: day')
  })

  it('writes every target plural category even when the source only has other', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    const values = {
      day_other: '{count} дней',
      day_zero: '{count} дней',
      day_one: '{count} день',
      day_two: '{count} дня',
      day_few: '{count} дня',
      day_many: '{count} дней',
    }
    writeJson(join(assets, 'en.json'), { day_other: '{count} days' })

    const python = [
      'import runpy',
      `module = runpy.run_path(${JSON.stringify(writer)})`,
      `module['write']('ru', ${JSON.stringify(values)})`,
    ].join('\n')
    const result = spawnSync('python3', ['-c', python], {
      encoding: 'utf8',
      env: { ...process.env, LOCON_ASSETS: assets, LOCON_SOURCE: 'en' },
    })
    const written = JSON.parse(readFileSync(join(assets, 'ru.json'), 'utf8'))

    expect(result.status).toBe(0)
    expect(written).toEqual(values)
    expect(Object.keys(written)).toHaveLength(6)
  })

  it('writes a multi-form source family exactly once in stable category order', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    const values = {
      day_one: '{count} Tag',
      day_other: '{count} Tage',
      day_zero: '{count} Tage',
      day_two: '{count} Tage',
      day_few: '{count} Tage',
      day_many: '{count} Tage',
    }
    writeJson(join(assets, 'en.json'), { day_one: '{count} day', day_other: '{count} days' })

    const python = [
      'import runpy',
      `module = runpy.run_path(${JSON.stringify(writer)})`,
      `module['write']('de', ${JSON.stringify(values)})`,
    ].join('\n')
    const result = spawnSync('python3', ['-c', python], {
      encoding: 'utf8',
      env: { ...process.env, LOCON_ASSETS: assets, LOCON_SOURCE: 'en' },
    })
    const raw = readFileSync(join(assets, 'de.json'), 'utf8')
    const written = JSON.parse(raw)

    expect(result.status).toBe(0)
    expect(Object.keys(written)).toEqual(['day_one', 'day_zero', 'day_two', 'day_few', 'day_many', 'day_other'])
    expect(raw.match(/"day_other"/g)).toHaveLength(1)
  })

  it('requires an explicit allowance before a plural form can omit count', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    writeJson(join(assets, 'de.json'), { day_one: '{count} Tag', day_other: '{count} Tage' })
    writeJson(join(assets, 'ru.json'), {
      day_one: 'день',
      day_few: '{count} дня',
      day_many: '{count} дней',
      day_other: '{count} дня',
    })
    writeFileSync(join(root, 'src/example.ts'), "l('day', { count: 21 })\n")

    const rejected = runChecker(root)
    const allowed = runChecker(root, { allowImplicitCount: 'ru:day_one' })

    expect(rejected.status).toBe(1)
    expect(rejected.stdout).toContain('ru.json missing placeholder in day_one: {count}')
    expect(allowed.status).toBe(0)
  })

  it('lets the writer omit count only for explicitly allowed target keys', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    const values = { day_one: 'يوم واحد', day_other: '{count} يوم' }
    writeJson(join(assets, 'en.json'), { day_one: '{count} day', day_other: '{count} days' })

    const python = (allow: boolean) =>
      [
        'import pathlib, runpy',
        `module = runpy.run_path(${JSON.stringify(writer)})`,
        `module['write']('ar', ${JSON.stringify(values)}, assets=pathlib.Path(${JSON.stringify(assets)}), source_locale='en'${
          allow ? ", allow_implicit_count={'day_one'}" : ''
        })`,
      ].join('\n')
    const rejected = spawnSync('python3', ['-c', python(false)], { encoding: 'utf8' })
    const allowed = spawnSync('python3', ['-c', python(true)], { encoding: 'utf8' })

    expect(rejected.status).not.toBe(0)
    expect(rejected.stderr).toContain('ar.day_one: missing placeholders')
    expect(allowed.status).toBe(0)
  })

  it('cross-checks declared locale codes against files in both directions', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { greeting: 'Hallo' })
    writeJson(join(root, 'assets/en.json'), { greeting: 'Hello' })
    writeFileSync(join(root, 'src/example.ts'), "l('Hallo')\n")

    const result = runChecker(root, { locales: 'de,fr' })

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('declared locales missing asset files: fr')
    expect(result.stdout).toContain('asset files not present in declared locales: en')
  })

  it('distinguishes Han, Japanese Kana and Hangul', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { greeting: 'Hallo' })
    writeJson(join(root, 'assets/zh-Hans.json'), { greeting: '你好かな' })
    writeJson(join(root, 'assets/ja.json'), { greeting: 'こんにちは한글' })
    writeFileSync(join(root, 'src/example.ts'), "l('Hallo')\n")

    const result = runChecker(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('zh-Hans.json contains Japanese Kana')
    expect(result.stdout).toContain('ja.json contains Hangul')
  })

  it('rejects duplicate JSON keys instead of silently keeping the last value', () => {
    const root = temporaryProject()
    writeFileSync(join(root, 'assets/de.json'), '{"greeting":"Hallo","greeting":"Moin"}\n')
    writeJson(join(root, 'assets/en.json'), { greeting: 'Hello' })
    writeFileSync(join(root, 'src/example.ts'), "l('Hallo')\n")

    const result = runChecker(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('de.json has duplicate key: greeting')
  })

  it('ignores localization-looking calls inside comments and string examples', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { greeting: 'Hallo' })
    writeJson(join(root, 'assets/en.json'), { greeting: 'Hello' })
    writeFileSync(
      join(root, 'src/example.ts'),
      ["// l('Nicht vorhanden')", 'const example = "l(\'Auch nicht vorhanden\')"', "l('Hallo')"].join('\n'),
    )

    const result = runChecker(root, { strictOrphans: true })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('✓ assets and code agree')
  })

  it('reports missing selectable plural categories and can enforce them', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { day_one: '{count} Tag', day_other: '{count} Tage' })
    writeJson(join(root, 'assets/ru.json'), { day_one: '{count} день', day_other: '{count} дня' })
    writeFileSync(join(root, 'src/example.ts'), "l('day', { count: 5 })\n")

    const advisory = runChecker(root)
    const strict = runChecker(root, { strictPlurals: true })

    expect(advisory.status).toBe(0)
    expect(advisory.stdout).toContain('ru:day missing few, many')
    expect(strict.status).toBe(1)
    expect(strict.stdout).toContain('plural category gap(s)')
  })

  it('writes a locale through the command-line interface', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    const input = join(root, 'fr-input.json')
    writeJson(join(assets, 'en.json'), { greeting: 'Hello' })
    writeJson(input, { greeting: 'Bonjour' })

    const result = spawnSync(
      'python3',
      [writer, '--locale', 'fr', '--input', input, '--assets', assets, '--source', 'en'],
      { encoding: 'utf8' },
    )

    expect(result.status).toBe(0)
    expect(JSON.parse(readFileSync(join(assets, 'fr.json'), 'utf8')).greeting).toBe('Bonjour')
    expect(statSync(join(assets, 'fr.json')).mode & 0o777).toBe(0o644)
  })

  it('makes the writer reject duplicate input keys and unsafe locale paths', () => {
    const root = temporaryProject()
    const assets = join(root, 'assets')
    const input = join(root, 'fr-input.json')
    writeJson(join(assets, 'en.json'), { greeting: 'Hello' })
    writeFileSync(input, '{"greeting":"Bonjour","greeting":"Salut"}\n')

    const duplicate = spawnSync(
      'python3',
      [writer, '--locale', 'fr', '--input', input, '--assets', assets, '--source', 'en'],
      { encoding: 'utf8' },
    )
    const unsafe = spawnSync(
      'python3',
      [writer, '--locale', '../fr', '--input', input, '--assets', assets, '--source', 'en'],
      { encoding: 'utf8' },
    )

    expect(duplicate.status).not.toBe(0)
    expect(duplicate.stderr).toContain('duplicate key: greeting')
    expect(unsafe.status).not.toBe(0)
    expect(unsafe.stderr).toContain("invalid locale name: '../fr'")
  })
})
