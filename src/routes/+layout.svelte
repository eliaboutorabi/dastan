<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { settings } from '$lib/settings/store.svelte';
	import type { StringKey } from '$lib/i18n';
	import { t, uiDir } from '$lib/i18n/ui.svelte';
	import { library } from '$lib/stores/library.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconSvgElement } from '@hugeicons/svelte';
	import Bookshelf03Icon from '@hugeicons/core-free-icons/Bookshelf03Icon';
	import LibraryIcon from '@hugeicons/core-free-icons/LibraryIcon';
	import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon';
	import TranslateIcon from '@hugeicons/core-free-icons/TranslateIcon';

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
		icon: IconSvgElement;
	}

	const navItems: Nav[] = [
		{ href: `${base}/`, key: 'nav.shelf', icon: Bookshelf03Icon },
		{ href: `${base}/library/`, key: 'nav.library', icon: LibraryIcon },
		{ href: `${base}/words/`, key: 'nav.words', icon: TranslateIcon },
		{ href: `${base}/settings/`, key: 'nav.settings', icon: Settings02Icon }
	];

	const isActive = (href: string) =>
		href === `${base}/` ? page.url.pathname === href : page.url.pathname.startsWith(href);

	const finishedCount = $derived(library.stories.filter((s) => s.status === 'finished').length);
</script>

<svelte:head>
	<title>{t('app.name')} — {t('app.tagline')}</title>
</svelte:head>


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
						<Icon icon={item.icon} size={20} />
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
					<Icon icon={item.icon} size={20} />
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

	/* Hugeicons are stroke-drawn on `fill="none"`. Forcing a fill here would
	   turn every outline glyph into a solid blob; colour inherits instead. */
	.tabbar a :global(svg) {
		flex: none;
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
