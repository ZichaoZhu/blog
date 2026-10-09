import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import svelte from '@astrojs/svelte';
import icon from 'astro-icon';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  adapter: vercel({ includeFiles: ['.generated/papers.json'] }),
  integrations: [svelte(), icon({ include: { 'material-symbols': ['*'] } })],
  devToolbar: { enabled: false },
  vite: { plugins: [tailwind()], server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } }, resolve: { dedupe: ['svelte'] } },
});
