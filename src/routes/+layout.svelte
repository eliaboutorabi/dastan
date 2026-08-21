<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { settings } from '$lib/settings/store.svelte';
	import { dirOf, translate, type StringKey } from '$lib/i18n';
	import { library } from '$lib/stores/library.svelte';

	let { children } = $props();

	const nativeDir = $derived(dirOf(settings.current.nativeLanguage));
	const t = $derived((key: StringKey, vars?: Record<string, string | number>) =>
		translate(settings.current.nativeLanguage, key, vars)
	);

	// The reader is a full-bleed page with its own chrome; the shelf, the words
	// list and settings share the tab bar.
	const inReader = $derived(page.url.pathname.includes('/read/'));

	$effect(() => {
		const root = document.documentElement;
		root.dataset.theme = settings.current.theme;
		root.dataset.nativeRtl = String(nativeDir === 'rtl');
		root.lang = settings.current.nativeLanguage;
		root.dir = nativeDir;
		root.style.setProperty('--read-size', `${settings.current.textSize}px`);
	});

	$effect(() => {
		if (!library.loaded) library.load();
	});

	const tabs = [
		{ href: `${base}/`, key: 'nav.shelf' as StringKey, glyph: 'shelf' },
		{ href: `${base}/words/`, key: 'nav.words' as StringKey, glyph: 'words' },
		{ href: `${base}/settings/`, key: 'nav.settings' as StringKey, glyph: 'settings' }
	];

	const isActive = (href: string) =>
		href === `${base}/` ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>{t('app.name')} — {t('app.tagline')}</title>
</svelte:head>

<div class="app" class:reading={inReader}>
	<main>
		{@render children()}
	</main>

	{#if !inReader}
		<nav aria-label={t('nav.shelf')}>
			{#each tabs as tab (tab.href)}
				<a href={tab.href} class:active={isActive(tab.href)} aria-current={isActive(tab.href) ? 'page' : undefined}>
					<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
						{#if tab.glyph === 'shelf'}
							<path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5l3.6 1-3 15-3.6-1z" />
						{:else if tab.glyph === 'words'}
							<path d="M4 5h16v2H4zM4 11h11v2H4zM4 17h7v2H4z" />
						{:else}
							<path
								d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m9 4-2.1-1.1.4-2.3-2.2-1.3-1.7 1.6L13 8V5.5h-2V8l-2.4.9-1.7-1.6-2.2 1.3.4 2.3L3 12l2.1 1.1-.4 2.3 2.2 1.3 1.7-1.6L11 16v2.5h2V16l2.4-.9 1.7 1.6 2.2-1.3-.4-2.3z"
							/>
						{/if}
					</svg>
					<span>{t(tab.key)}</span>
				</a>
			{/each}
		</nav>
	{/if}
</div>

<style>
	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		padding-bottom: calc(64px + env(safe-area-inset-bottom));
	}

	.app.reading main {
		padding-bottom: 0;
	}

	nav {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--paper) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--rule);
	}

	nav a {
		flex: 1;
		max-width: 140px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.35rem 0.25rem;
		border-radius: var(--radius);
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 0.72rem;
		font-weight: 500;
	}

	nav a svg {
		fill: currentColor;
	}

	nav a.active {
		color: var(--lapis);
	}
</style>
