import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Without this, an unconsumed `mockImplementationOnce` queued by one
    // test (every test currently sets one up fresh, but nothing enforces
    // that) would survive into the next test and get consumed by its
    // first apiFetch call instead — the same class of cross-test leakage
    // as the DOM cleanup fix in test-setup.ts, for mocks instead of the DOM.
    mockReset: true,
  },
})
