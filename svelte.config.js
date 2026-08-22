import adapter from '@sveltejs/adapter-static';

// GitHub Pages serves the site from https://<user>.github.io/<repo>/, so every
// asset and route needs that prefix. The deploy workflow sets BASE_PATH to
// "/<repo>"; in local dev it is empty and the app lives at the root.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// SPA mode: unknown deep links fall back to the app shell, which lets
			// the client router take over. GitHub Pages serves 404.html for any
			// path it does not recognise, which is exactly the hook we need.
			fallback: '404.html',
			precompress: false,
			strict: false
		}),
		paths: { base },
		prerender: {
			// Shells only — `ssr` is off, so these are empty documents that boot
			// the SPA. Prerendering them means real 200s for the common routes
			// instead of leaning on the 404 fallback for everything.
			entries: ['/', '/new', '/library', '/words', '/settings', '/settings/level']
		}
	}
};
