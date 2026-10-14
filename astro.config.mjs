import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://momentos.genm.com',
  integrations: [sitemap()],
  output: 'static',
});
