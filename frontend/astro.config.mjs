// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://localhost:4321',
  trailingSlash: 'never',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        // El monorepo pnpm eleva dependencias a la raíz; Vite debe poder servirlas.
        allow: ['..']
      }
    }
  },

  adapter: vercel()
});