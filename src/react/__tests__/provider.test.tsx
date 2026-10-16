import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createLocon, L, LoconProvider, useLocon } from '../index'

const loaders = {
  en: async () => ({
    Hallo: 'Hello',
    'Hallo {name}': 'Hello {name}',
    '{count} Bücher': '{count} books',
    '{count} Bücher_one': '{count} book',
    '{count} Bücher_other': '{count} books',
  }),
  de: async () => ({
    Hallo: 'Hallo',
    'Hallo {name}': 'Hallo {name}',
    '{count} Bücher': '{count} Bücher',
    '{count} Bücher_one': '{count} Buch',
    '{count} Bücher_other': '{count} Bücher',
  }),
}

function Example() {
  const { setLocale } = useLocon()
  return <button onClick={() => void setLocale('de')}><L>Hallo</L></button>
}

it('updates localized text after a lazy load without adding DOM wrappers', async () => {
  const instance = createLocon({ loaders, projectLocale: 'de', defaultLocale: 'en' })
  await instance.setLocale('en')
  render(<LoconProvider instance={instance}><Example /></LoconProvider>)
  const button = screen.getByRole('button', { name: 'Hello' })
  expect(button.children.length).toBe(0)
  fireEvent.click(button)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Hallo' })).toBeTruthy())
})

it('supports parameters, plural counts and explicit locale overrides', async () => {
  const instance = createLocon({ loaders, projectLocale: 'de', defaultLocale: 'en' })
  await instance.setLocale('en')
  await instance.loadLocale('de')
  render(<LoconProvider instance={instance}>
    <p><L params={{ name: 'Alex' }}>{'Hallo {name}'}</L></p>
    <p><L count={1}>{'{count} Bücher'}</L></p>
    <p><L count={3}>{'{count} Bücher'}</L></p>
    <p><L locale='de'>Hallo</L></p>
  </LoconProvider>)
  expect(screen.getByText('Hello Alex')).toBeTruthy()
  expect(screen.getByText('1 book')).toBeTruthy()
  expect(screen.getByText('3 books')).toBeTruthy()
  expect(screen.getByText('Hallo')).toBeTruthy()
})

it('uses readable children or an explicit fallback for unresolved asset keys', async () => {
  const instance = createLocon({ loaders, defaultLocale: 'en' })
  await instance.setLocale('en')
  render(<LoconProvider instance={instance}>
    <p><L assetKey='missing'>Readable source</L></p>
    <p><L assetKey='missing' fallback='Explicit fallback'>Other source</L></p>
  </LoconProvider>)
  expect(screen.getByText('Readable source')).toBeTruthy()
  expect(screen.getByText('Explicit fallback')).toBeTruthy()
})

it('renders escaped text and works inside SVG text elements', async () => {
  const instance = createLocon({ loaders, defaultLocale: 'en' })
  await instance.setLocale('en')
  const unsafe = '<script>alert(1)</script>'
  const { container } = render(<LoconProvider instance={instance}>
    <p><L>{unsafe}</L></p>
    <svg><text><L>Hallo</L></text></svg>
  </LoconProvider>)
  expect(screen.getByText(unsafe)).toBeTruthy()
  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('svg text')?.textContent).toBe('Hello')
  expect(container.querySelector('svg text')?.children.length).toBe(0)
})
