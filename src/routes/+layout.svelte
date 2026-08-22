<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { settings } from '$lib/settings/store.svelte';
	import type { StringKey } from '$lib/i18n';
	import { t, uiDir } from '$lib/i18n/ui.svelte';
	import { library } from '$lib/stores/library.svelte';

	let { children } = $props();

	// The reader takes the whole window — it is the one screen where the app
	// should disappear and leave only the page.
	const inReader = $derived(page.url.pathname.includes('/read/'));

	$effect(() => {
		const root = document.documentElement;
		root.dataset.theme = settings.current.theme;
		root.lang = settings.current.uiLanguage;
		root.dir = uiDir();
		root.style.setProperty('--read-size', `${settings.current.textSize}px`);
	});

	$effect(() => {
		if (!library.loaded) library.load();
	});

	interface Nav {
		href: string;
		key: StringKey;
		glyph: 'shelf' | 'library' | 'words' | 'settings';
	}

	const navItems: Nav[] = [
		{ href: `${base}/`, key: 'nav.shelf', glyph: 'shelf' },
		{ href: `${base}/library/`, key: 'nav.library', glyph: 'library' },
		{ href: `${base}/words/`, key: 'nav.words', glyph: 'words' },
		{ href: `${base}/settings/`, key: 'nav.settings', glyph: 'settings' }
	];

	const isActive = (href: string) =>
		href === `${base}/` ? page.url.pathname === href : page.url.pathname.startsWith(href);

	const finishedCount = $derived(library.stories.filter((s) => s.status === 'finished').length);
</script>

<svelte:head>
	<title>{t('app.name')} — {t('app.tagline')}</title>
</svelte:head>

{#snippet glyph(name: Nav['glyph'])}
	<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
		{#if name === 'shelf'}
			<path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5l3.6 1-3 15-3.6-1z" />
		{:else if name === 'library'}
			<path d="M4 5h13v2H4zm0 4h13v2H4zm0 4h9v2H4zm15-8 2 .5-2.6 13-2-.5z" />
		{:else if name === 'words'}
			<path d="M4 5h16v2H4zM4 11h11v2H4zM4 17h7v2H4z" />
		{:else}
			<path
				d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m9 4-2.1-1.1.4-2.3-2.2-1.3-1.7 1.6L13 8V5.5h-2V8l-2.4.9-1.7-1.6-2.2 1.3.4 2.3L3 12l2.1 1.1-.4 2.3 2.2 1.3 1.7-1.6L11 16v2.5h2V16l2.4-.9 1.7 1.6 2.2-1.3-.4-2.3z"
			/>
		{/if}
	</svg>
{/snippet}

<div class="app" class:reading={inReader}>
	{#if !inReader}
		<!-- On a laptop this is a permanent sidebar; below 1000px it collapses
		     to the bar at the bottom of the screen, which is where a thumb is. -->
		<aside class="sidebar">
			<a class="wordmark" href="{base}/">
				<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
					<rect width="32" height="32" rx="7" fill="var(--lapis)" />
					<path d="M9 7h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H9z" fill="var(--on-lapis)" />
					<path d="M23 7h-3a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h4z" fill="var(--saffron)" />
				</svg>
				<span>{t('app.name')}</span>
			</a>

			<nav aria-label={t('nav.main')}>
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class:active={isActive(item.href)}
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						{@render glyph(item.glyph)}
						<span>{t(item.key)}</span>
					</a>
				{/each}
			</nav>

			<div class="standing">
				<p class="section-label">{t('nav.standing')}</p>
				<p class="standing-line">
					<span class="pill">{t('common.level')} {settings.current.level}</span>
					<span class="pill pill-gold">{t('nav.finished', { n: finishedCount })}</span>
				</p>
			</div>
		</aside>
	{/if}

	<main>
		{@render children()}
	</main>

	{#if !inReader}
		<nav class="tabbar" aria-label={t('nav.main')}>
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class:active={isActive(item.href)}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{@render glyph(item.glyph)}
					<span>{t(item.key)}</span>
				</a>
			{/each}
		</nav>
	{/if}
</div>

<style>
	.app {
		min-height: 100dvh;
	}

	main {
		min-height: 100dvh;
		padding-bottom: calc(66px + env(safe-area-inset-bottom));
	}

	.app.reading main {
		padding-bottom: 0;
	}

	.sidebar {
		display: none;
	}

	/* --- phone: a bar at the bottom --- */
	.tabbar {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		justify-content: center;
		gap: var(--s1);
		padding: var(--s1) var(--s2) calc(var(--s1) + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--paper) 92%, transparent);
		backdrop-filter: blur(14px);
		border-top: 1px solid var(--rule);
	}

	.tabbar a {
		flex: 1;
		max-width: 120px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--s2) var(--s1);
		border-radius: var(--radius);
		color: var(--ink-soft);
		text-decoration: none;
		font-size: var(--text-xs);
		font-weight: 500;
	}

	.tabbar a :global(svg) {
		fill: currentColor;
	}

	.tabbar a.active {
		color: var(--lapis);
	}

	/* --- laptop: a permanent sidebar, and the tab bar goes away --- */
	@media (min-width: 1000px) {
		.app {
			display: grid;
			grid-template-columns: var(--sidebar) minmax(0, 1fr);
		}

		.app.reading {
			display: block;
		}

		main {
			padding-bottom: 0;
		}

		.tabbar {
			display: none;
		}

		.sidebar {
			position: sticky;
			top: 0;
			display: flex;
			flex-direction: column;
			height: 100dvh;
			padding: var(--s5) var(--s4);
			background: var(--paper-shell);
			border-inline-end: 1px solid var(--rule);
		}

		.wordmark {
			display: flex;
			align-items: center;
			gap: var(--s2);
			margin-bottom: var(--s6);
			padding-inline: var(--s2);
			color: var(--ink);
			text-decoration: none;
			font-family: var(--font-read);
			font-size: var(--text-lg);
			font-weight: 600;
			letter-spacing: 0.01em;
		}

		.sidebar nav {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		.sidebar nav a {
			display: flex;
			align-items: center;
			gap: var(--s3);
			padding: var(--s2) var(--s3);
			border-radius: var(--radius);
			color: var(--ink-soft);
			text-decoration: none;
			font-size: var(--text-base);
			font-weight: 500;
		}

		.sidebar nav a :global(svg) {
			fill: currentColor;
			flex: none;
		}

		.sidebar nav a:hover {
			background: var(--paper-raised);
			color: var(--ink);
		}

		.sidebar nav a.active {
			background: var(--lapis-wash);
			color: var(--lapis);
			font-weight: 600;
		}

		.standing {
			margin-top: auto;
			padding-top: var(--s4);
			border-top: 1px solid var(--rule);
		}

		.standing-line {
			display: flex;
			flex-wrap: wrap;
			gap: var(--s2);
			margin-top: var(--s2);
		}
	}
</style>
