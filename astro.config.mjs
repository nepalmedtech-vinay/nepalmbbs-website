import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nepalmbbs.in',
  output: 'static',
  trailingSlash: 'never',

  integrations: [
    sitemap({
      // The two tracker apps live in public/ and are copied verbatim. They are
      // internal staff tools, not public content, and robots.txt already
      // excludes them — keep them out of the sitemap too so the two agree.
      filter: (page) => !page.includes('/wrc-tracker') && !page.includes('/cmc-tracker'),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
        // trailingSlash:'never' makes the integration emit the root as
        // "https://nepalmbbs.in" while the canonical tag says
        // "https://nepalmbbs.in/". Normalising here sets the priority branch
        // below correctly, but the emitted URL keeps the bare form because the
        // integration re-applies trailingSlash after serialize. That is fine
        // and not worth working around: per RFC 3986 §6.2.3 an empty path is
        // equivalent to "/", and search engines treat the two as one URL.
        if (item.url === 'https://nepalmbbs.in') item.url = 'https://nepalmbbs.in/';

        // The home page stays the strongest URL: it holds every link and every
        // share the site has ever earned.
        if (item.url === 'https://nepalmbbs.in/') item.priority = 1.0;
        else if (item.url.includes('/colleges/')) item.priority = 0.7;
        else item.priority = 0.8;
        return item;
      },
    }),
  ],

  build: {
    // Content-hashed filenames for anything Astro emits, so a future
    // long-cache header is safe. The hand-maintained files in public/assets
    // are NOT hashed and must keep a revalidating cache policy — see
    // docs/DEPLOYMENT.md before setting any header rules.
    assets: '_assets',
  },

  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
