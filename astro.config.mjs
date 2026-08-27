import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nepalmbbs.in',
  output: 'static',
  trailingSlash: 'never',

  integrations: [
    sitemap({
      // Four routes are deliberately not public content, and robots.txt plus a
      // noindex header already say so — keep them out of the sitemap too, so
      // all three agree. The tracker apps are internal staff tools copied
      // verbatim from public/; /staff is the counselor console; /portal is a
      // student's own application, reachable only with their token and
      // pointless to a crawler that does not have one.
      filter: (page) => !['/wrc-tracker', '/cmc-tracker', '/staff', '/portal']
        .some((p) => page.includes(p)),
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
