import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import Locon, { LText, useLocon } from '../index'

jest.mock('react-native', () => ({ Text: 'span' }), { virtual: true })
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const assets = {
  de: { greeting: 'Guten Morgen' },
  en: { greeting: 'Good morning' },
  fr: { greeting: 'Bonjour' },
}

function LocaleControls() {
  const { currentLocale, setLocale } = useLocon()

  return (
    <>
      <span data-testid='locale'>{currentLocale}</span>
      <button onClick={() => setLocale('de')}>Switch to German</button>
    </>
  )
}

describe('Locon locale changes', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('keeps an imperative locale change when the currentLocale prop is unchanged', () => {
    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale='en'
          autodetect={false}
        >
          <LocaleControls />
        </Locon>,
      )
    })

    act(() => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe('de')
  })

  it('syncs the locale when the currentLocale prop changes', () => {
    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale='en'
          autodetect={false}
        >
          <LocaleControls />
        </Locon>,
      )
    })

    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale='fr'
          autodetect={false}
        >
          <LocaleControls />
        </Locon>,
      )
    })

    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe('fr')
  })

  /**
   * Apps that persist "follow the system" as `null` need detection to switch
   * back on immediately. Before this, `null` was indistinguishable from an
   * uncontrolled provider, so the previous locale stuck until an app restart.
   */
  it('reverts to the detected device language when currentLocale becomes null', () => {
    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale='fr'
        >
          <LocaleControls />
        </Locon>,
      )
    })

    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe('fr')

    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale={null}
        >
          <LocaleControls />
        </Locon>,
      )
    })

    // jsdom reports en-US, which matches the shipped 'en'.
    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe('en')
  })

  it('falls back to defaultLocale for null when autodetect is off', () => {
    act(() => {
      root.render(
        <Locon
          assets={assets}
          currentLocale={null}
          defaultLocale='de'
          autodetect={false}
        >
          <LocaleControls />
        </Locon>,
      )
    })

    expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe('de')
  })
})

describe('Locon context values', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function Probe() {
    const { systemLocale, isRTL, locales, lIn } = useLocon()

    return (
      <>
        <span data-testid='system'>{String(systemLocale)}</span>
        <span data-testid='rtl'>{String(isRTL)}</span>
        <span data-testid='locales'>{locales.join(',')}</span>
        <span data-testid='in-german'>{lIn('de', 'greeting')}</span>
      </>
    )
  }

  it('exposes the detected locale, direction, locale list and cross-locale lookup', () => {
    act(() => {
      root.render(
        <Locon
          assets={{ ...assets, ar: { greeting: 'صباح الخير' } }}
          currentLocale='ar'
          projectLocale='de'
        >
          <Probe />
        </Locon>,
      )
    })

    expect(container.querySelector('[data-testid="system"]')?.textContent).toBe('en')
    expect(container.querySelector('[data-testid="rtl"]')?.textContent).toBe('true')
    expect(container.querySelector('[data-testid="locales"]')?.textContent).toBe('de,en,fr,ar')
    expect(container.querySelector('[data-testid="in-german"]')?.textContent).toBe('Guten Morgen')
  })
})

describe('LText explicit-key fallback', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders children only when an explicit key is genuinely unresolved', () => {
    act(() => {
      root.render(
        <Locon
          assets={{ en: { literal: 'literal' } }}
          currentLocale='en'
          autodetect={false}
        >
          <LText
            data-testid='missing'
            assetKey='missing_key'
          >
            Human fallback
          </LText>
          <LText
            data-testid='literal'
            assetKey='literal'
          >
            Must not replace a real translation
          </LText>
        </Locon>,
      )
    })

    expect(container.querySelector('[data-testid="missing"]')?.textContent).toBe('Human fallback')
    expect(container.querySelector('[data-testid="literal"]')?.textContent).toBe('literal')
  })
})
