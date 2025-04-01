import { isBrowser } from '../helpers/environment'
import type Settings from '../types/Settings'

// Declare custom properties on global objects
declare global {
  interface Window {
    __LOCON_SETTINGS__: Settings
  }
  var __LOCON_SETTINGS__: Settings
  namespace NodeJS {
    interface Global {
      __LOCON_SETTINGS__: Settings
    }
  }
}

const defaultSettings: Settings = {
  assets: { en: {} },
  currentLocale: 'en',
  defaultLocale: 'en',
  autodetect: true,
}

// Create a global settings object that works across environments
let globalSettings = defaultSettings

// Initialize settings with defaults and custom options
function init(options = {}) {
  // Merge defaults with custom options
  globalSettings = { ...defaultSettings, ...options }

  // Make settings globally accessible based on environment
  if (isBrowser) {
    // Browser global
    window.__LOCON_SETTINGS__ = globalSettings
  } else {
    // global
    global.__LOCON_SETTINGS__ = globalSettings
  }

  return globalSettings
}

// Get settings
function getSettings() {
  if (isBrowser) {
    return window.__LOCON_SETTINGS__ || globalSettings
  } else {
    return global.__LOCON_SETTINGS__ || globalSettings
  }
}

function getAssets() {
  const settings = getSettings()
  const { currentLocale, defaultLocale } = settings
  const assets = settings.assets[currentLocale] ?? settings.assets[defaultLocale]

  return assets ?? {}
}

function getAsset(assetKey: string): string {
  const assets = getAssets()

  return assets[assetKey] ?? ''
}

function setLocale(locale: string) {
  if (!locale) {
    return
  }
  const settings = getSettings()
  settings.currentLocale = locale
  init(settings)
}

export { getAsset, getAssets, getSettings, init, setLocale }
