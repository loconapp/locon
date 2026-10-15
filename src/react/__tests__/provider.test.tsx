import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createLocon, LoconProvider, useLocon } from '../index'
function Example() {
  const { l, setLocale } = useLocon()
  return <button onClick={() => void setLocale('de')}>{l('hello')}</button>
}
it('updates React consumers after a lazy resource has loaded', async () => {
  const instance = createLocon({ loaders: { en: async () => ({ hello: 'Hello' }), de: async () => ({ hello: 'Hallo' }) }, defaultLocale: 'en' })
  await instance.setLocale('en')
  render(<LoconProvider instance={instance}><Example /></LoconProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Hello' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Hallo' })).toBeTruthy())
})
