import { render, screen } from '@testing-library/react'

import App from './App'

test('renders shell UI', () => {
  render(<App />)
  expect(screen.getByText('Snailer')).toBeInTheDocument()
})

