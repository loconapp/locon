import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'

// Deliberately the BUILT output, not src: the app runs dist, and the test
// suite has only ever exercised src.
const dist = require('../../../dist/index.js')
const Locon = dist.default
const useLocon = dist.useLocon

jest.mock('react-native', () => ({ Text: 'span' }), { virtual: true })
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const assets = {
  de: { home_start_work: 'Arbeit beginnen', home_status_off: 'Feierabend' },
  en: { home_start_work: 'Start work', home_status_off: 'Off the clock' },
}

function Probe() {
  const { l, currentLocale } = useLocon()
  return (
    <>
      <span data-testid='locale'>{currentLocale}</span>
      <span data-testid='byValue'>{l('Arbeit beginnen')}</span>
      <span data-testid='byKey'>{l('home_status_off')}</span>
    </>
  )
}

describe('built dist wiring', () => {
  it('delivers the provider value to consumers', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <Locon assets={assets} currentLocale='en' defaultLocale='en' projectLocale='de'>
          <Probe />
        </Locon>,
      )
    })

    const read = (id: string) => container.querySelector(`[data-testid="${id}"]`)?.textContent
    console.log('locale=', read('locale'), 'byValue=', read('byValue'), 'byKey=', read('byKey'))

    expect(read('locale')).toBe('en')
    expect(read('byValue')).toBe('Start work')
    expect(read('byKey')).toBe('Off the clock')
  })
})
