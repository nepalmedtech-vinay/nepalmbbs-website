// Single source of truth for the site's routes.
//
// The old single-page build addressed sections by a pane id ('process', 'why',
// …). Those ids are still all over the markup — in nav buttons, the mobile
// menu, CTAs inside copy, and the chatbot's replies — so rather than rewriting
// every call site by hand, the id is kept as the key and mapped to a real URL
// here. navigation.js reads the same map at runtime, which means a stray
// switchTab('faq') from anywhere still lands on /faq instead of doing nothing.

export const ROUTES = {
  process:    '/admission-process',
  colleges:   '/colleges',
  why:        '/why-nepal',
  calculator: '/neet-calculator',
  guidelines: '/guidelines',
  videos:     '/videos',
  faq:        '/faq',
  lifestyle:  '/life-in-nepal',
  counsel:    '/counseling',
};

export const SITE = 'https://nepalmbbs.in';

// Nav order is deliberate: it follows the question a family actually asks, in
// order — how does this work, where can I go, is it worth it, do I qualify —
// rather than grouping by content type.
export const PRIMARY_NAV = ['process', 'colleges', 'why', 'calculator', 'guidelines', 'faq'];
