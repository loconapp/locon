import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import Locon, { useLocon } from './index'

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
})
