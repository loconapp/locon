import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

function runChecker(root: string, strict = false) {
  return spawnSync(
    process.execPath,
    [
      checker,
      '--root',
      root,
      '--source',
      'de',
      '--assets',
      'assets',
      '--src',
      'src',
      ...(strict ? ['--strict-orphans'] : []),
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

    const result = runChecker(root, true)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('✓ assets and code agree')
  })

  it('reports orphans by default and makes them fatal on request', () => {
    const root = temporaryProject()
    writeJson(join(root, 'assets/de.json'), { used: 'Benutzt', orphan: 'Verwaist' })
    writeJson(join(root, 'assets/en.json'), { used: 'Used', orphan: 'Orphaned' })
    writeFileSync(join(root, 'src/example.ts'), "l('Benutzt')\n")

    const advisory = runChecker(root)
    const strict = runChecker(root, true)

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
    const generated = spawnSync('python3', ['-c', `import runpy; runpy.run_path(${JSON.stringify(writer)})`], {
      encoding: 'utf8',
      env: { ...process.env, LOCON_ASSETS: assets, LOCON_SOURCE: 'de' },
    })

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
      day_zero: 'Нет дней',
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
      day_zero: 'Keine Tage',
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
})
