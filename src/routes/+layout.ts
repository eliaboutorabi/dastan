// Every agent, the whole database and the speech engine live in the browser,
// so there is nothing to render on a server — and GitHub Pages has no server
// to render it on. These pages are prerendered as empty shells that boot the
// SPA; deep links fall back to 404.html, which does the same.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';
