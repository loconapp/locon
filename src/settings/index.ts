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

const defaultSettings = {
  defaultLocale: 'en',
  locales: { en: {} },
  autodetect: true,
}

// Create a global settings object that works across environments
let globalSettings = defaultSettings

// Initialize settings with defaults and custom options
const init = (options = {}) => {
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
const getSettings = () => {
  if (isBrowser) {
    return window.__LOCON_SETTINGS__ || globalSettings
  } else {
    return global.__LOCON_SETTINGS__ || globalSettings
  }
}

export { getSettings, init }
