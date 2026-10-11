import { defineConfig } from 'vite'

export default defineConfig({
  // relative asset URLs so dist/ works under a subpath (e.g. GitHub Pages /soroban-standalone/)
  base: './',
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
})
