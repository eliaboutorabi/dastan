import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Called with no arguments so SvelteKit reads svelte.config.js — passing
	// options here would make it ignore that file entirely.
	plugins: [sveltekit()]
});
