import { copyFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function publishOfficialInvite() {
  return {
    name: 'publish-official-invite',
    async closeBundle() {
      const generatedInvite = resolve(import.meta.dirname, 'dist/public/convite/index.html')
      const publicInvite = resolve(import.meta.dirname, 'dist/convite/index.html')

      await copyFile(generatedInvite, publicInvite)
      await rm(resolve(import.meta.dirname, 'dist/public'), { recursive: true, force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publishOfficialInvite()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        convite: resolve(import.meta.dirname, 'public/convite/index.html'),
      },
    },
  },
})
