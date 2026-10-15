import { createLocon, matchLocale } from '../resources'
import { execFileSync } from 'node:child_process'

describe('portable resources', () => {
  it('matches ordered regional preferences', () => {
    expect(matchLocale(['fr-FR', 'de-AT', 'en'], ['en', 'de'], 'en')).toBe('de')
    expect(matchLocale(['en_GB'], ['de', 'en'], 'de')).toBe('en')
  })
  it('only loads the selected locale and caches successful resources', async () => {
    const de = jest.fn(async () => ({ hello: 'Hallo {name}' }))
    const en = jest.fn(async () => ({ default: { hello: 'Hello {name}' } }))
    const store = createLocon({ loaders: { de, en }, defaultLocale: 'en', languages: ['de-AT'] })
    expect(de).not.toHaveBeenCalled()
    await store.setLocale(null)
    expect(store.l('hello', { params: { name: 'Sam' } })).toBe('Hallo Sam')
    expect(en).not.toHaveBeenCalled()
    await store.setLocale('en')
    await store.setLocale('de')
    expect(de).toHaveBeenCalledTimes(1)
    expect(en).toHaveBeenCalledTimes(1)
  })
  it('coalesces parallel loads and the last selection wins', async () => {
    let finish!: (value: Record<string, string>) => void
    const de = jest.fn(() => new Promise<Record<string, string>>((resolve) => { finish = resolve }))
    const store = createLocon({ loaders: { de, en: async () => ({ hi: 'Hello' }) }, defaultLocale: 'en' })
    const slow = store.setLocale('de')
    const duplicate = store.loadLocale('de')
    await store.setLocale('en')
    finish({ hi: 'Hallo' })
    expect(await slow).toBe(false)
    await duplicate
    expect(de).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().currentLocale).toBe('en')
    expect(store.l('hi')).toBe('Hello')
  })
  it('keeps the current language on failure and permits retry', async () => {
    const de = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ hi: 'Hallo' })
    const store = createLocon({ loaders: { de, en: async () => ({ hi: 'Hello' }) }, defaultLocale: 'en' })
    await store.setLocale('en')
    await expect(store.setLocale('de')).rejects.toThrow('offline')
    expect(store.l('hi')).toBe('Hello')
    expect(store.getSnapshot().loading).toBe(false)
    await store.setLocale('de')
    expect(store.l('hi')).toBe('Hallo')
  })
  it('runs the built Node entry without loading React or React Native', () => {
    const output = execFileSync(process.execPath, ['-e', `
      const Module = require('node:module');
      const load = Module._load;
      Module._load = function(id, ...args) {
        if (/^(react|react-native|expo)(\\/|$)/.test(id)) throw new Error('Platform import: '+id);
        return load.call(this, id, ...args);
      };
      const {createTranslator} = require('./dist/core.js');
      console.log(createTranslator({assets:{en:{hi:'Hello'}},locale:'en'})('hi'));
    `], { cwd: process.cwd(), encoding: 'utf8' })
    expect(output.trim()).toBe('Hello')
  })
})
