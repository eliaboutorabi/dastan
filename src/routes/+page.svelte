<script lang="ts">
	import { base } from '$app/paths';
	import Spine from '$lib/components/Spine.svelte';
	import { library, SHELVES } from '$lib/stores/library.svelte';
	import { settings } from '$lib/settings/store.svelte';
	import type { StringKey } from '$lib/i18n';
	import { t } from '$lib/i18n/ui.svelte';
	import type { Shelf, SourceKind } from '$lib/types';

	const shelfTitle = (shelf: Shelf) => `shelf.${shelf}` as StringKey;
	const shelfBlurb = (shelf: Shelf) => `shelf.${shelf}.blurb` as StringKey;

	// Every shelf is really a kind of source, so the "+" on each one goes
	// straight to the right way of starting something.
	const NEW_FOR_SHELF: Record<Shelf, SourceKind> = {
		'my-story': 'life',
		'my-career': 'career',
		documents: 'document',
		curiosity: 'topic'
	};

	const sourceCards: SourceKind[] = ['document', 'life', 'career', 'topic'];
</script>

<div class="page">
	<header class="page-head">
		<h1>{t('shelf.title')}</h1>
		<p>{t('app.tagline')}</p>
	</header>

	{#if !settings.hasKey}
		<div class="key-notice card">
			<p>{t('shelf.needsKey')}</p>
			<a class="btn btn-primary" href="{base}/settings/">{t('shelf.addKey')}</a>
		</div>
	{/if}

	{#each SHELVES as shelf (shelf)}
		{@const books = library.activeBooks(shelf)}
		{@const loose = library.looseStories(shelf)}
		<section class="shelf">
			<div class="shelf-head">
				<div>
					<h2>{t(shelfTitle(shelf))}</h2>
					<p>{t(shelfBlurb(shelf))}</p>
				</div>
				<a
					class="btn btn-sm add"
					href="{base}/new/?kind={NEW_FOR_SHELF[shelf]}"
					aria-label={t('shelf.new')}
					title={t('shelf.new')}
				>
					<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
						><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" /></svg
					>
					<span class="add-label">{t('shelf.new')}</span>
				</a>
			</div>

			{#if books.length || loose.length}
				<div class="rail">
					{#each books as book (book.id)}
						{@const stories = library.bookStories(book)}
						{@const progress = library.progressOf(book)}
						<div class="book">
							<p class="book-title" title={book.title}>{book.title}</p>
							<div class="spines">
								{#each stories as story (story.id)}
									<Spine
										{story}
										href="{base}/read/{story.id}/"
										label={story.status}
										locked={story.status === 'locked'}
										lockedHint={t('shelf.locked')}
									/>
								{/each}
								{#each book.outline.slice(stories.length) as planned (planned.seq)}
									<Spine
										story={{
											id: `plan-${book.id}-${planned.seq}`,
											shelf,
											seq: planned.seq,
											level: planned.level,
											title: planned.title,
											titleNative: planned.titleNative,
											body: '',
											targetWords: [],
											glossary: {},
											status: 'locked',
											tapCount: 0
										}}
										label="planned"
										locked
										lockedHint={t('shelf.locked')}
									/>
								{/each}
							</div>
							<p class="book-progress">
								{t('library.progress', { done: progress.done, total: progress.total })}
							</p>
						</div>
					{/each}

					{#each loose as story (story.id)}
						<div class="book">
							<div class="spines">
								<Spine {story} href="{base}/read/{story.id}/" label={story.status} />
							</div>
							{#if story.bundled}
								<p class="book-progress">{t('shelf.empty.sample')}</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<a class="shelf-empty" href="{base}/new/?kind={NEW_FOR_SHELF[shelf]}">
					{t(`shelf.empty.${shelf}` as StringKey)}
				</a>
			{/if}
		</section>
	{/each}

	<section class="starters">
		<h2>{t('shelf.new')}</h2>
		<p class="starters-blurb">{t('shelf.new.blurb')}</p>
		<div class="starter-grid">
			{#each sourceCards as kind (kind)}
				<a class="starter" href="{base}/new/?kind={kind}">
					<span class="starter-title">{t(`source.${kind}` as StringKey)}</span>
					<span class="starter-blurb">{t(`source.${kind}.blurb` as StringKey)}</span>
				</a>
			{/each}
		</div>
	</section>
</div>

<style>
	.key-notice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--s3);
		margin-bottom: var(--s6);
		border-color: var(--saffron);
		background: var(--saffron-wash);
	}

	.shelf {
		margin-bottom: var(--s6);
	}

	.shelf-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s4);
	}

	/* On a phone this is a round + beside the shelf name; there is no room for
	   a three-word label, and wrapping it to three lines looked broken. */
	.add {
		flex: none;
		width: 34px;
		padding: 0;
		border-radius: 50%;
	}

	.add-label {
		display: none;
	}

	@media (min-width: 620px) {
		.add {
			width: auto;
			padding: 0 var(--s3);
			border-radius: var(--radius);
		}

		.add-label {
			display: inline;
		}
	}

	.shelf-head h2 {
		font-family: var(--font-read);
		font-size: var(--text-lg);
	}

	.shelf-head p {
		margin-top: 2px;
		color: var(--ink-soft);
		font-size: var(--text-sm);
		max-width: 46ch;
	}

	/*
	 * The rail is a real shelf: books stand on a board with a shadow under
	 * them. On a phone it scrolls sideways; on a laptop it wraps into rows so
	 * a wide window shows a whole library at once instead of one long strip.
	 */
	.rail {
		display: flex;
		gap: var(--s5);
		align-items: flex-end;
		margin-top: var(--s4);
		padding: var(--s4) var(--s2) var(--s4);
		overflow-x: auto;
		border-bottom: 2px solid var(--rule-strong);
		border-radius: 0 0 var(--radius) var(--radius);
		background: linear-gradient(to bottom, transparent 70%, color-mix(in srgb, var(--rule) 25%, transparent));
	}

	.book {
		flex: 0 0 auto;
		max-width: 260px;
	}

	.book-title {
		font-family: var(--font-read);
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: var(--s2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.spines {
		display: flex;
		gap: 3px;
		align-items: flex-end;
	}

	.book-progress {
		margin-top: var(--s2);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.shelf-empty {
		display: block;
		margin-top: var(--s4);
		padding: var(--s5);
		border: 1px dashed var(--rule-strong);
		border-radius: var(--radius);
		color: var(--ink-soft);
		font-size: var(--text-sm);
		text-decoration: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.shelf-empty:hover {
		border-color: var(--lapis);
		background: var(--lapis-wash);
		color: var(--lapis-deep);
	}

	.starters {
		margin-top: var(--s7);
		padding-top: var(--s6);
		border-top: 1px solid var(--rule);
	}

	.starters h2 {
		font-family: var(--font-read);
		font-size: var(--text-lg);
	}

	.starters-blurb {
		margin-top: var(--s1);
		color: var(--ink-soft);
		font-size: var(--text-sm);
	}

	.starter-grid {
		display: grid;
		gap: var(--s3);
		margin-top: var(--s4);
		grid-template-columns: 1fr;
	}

	.starter {
		display: flex;
		flex-direction: column;
		gap: var(--s1);
		padding: var(--s4);
		border: 1px solid var(--rule);
		border-radius: var(--radius-lg);
		background: var(--paper-raised);
		text-decoration: none;
		color: var(--ink);
		transition: border-color 0.15s ease, transform 0.15s ease;
	}

	.starter:hover {
		border-color: var(--lapis);
		transform: translateY(-2px);
	}

	.starter-title {
		font-family: var(--font-read);
		font-weight: 600;
		font-size: var(--text-base);
	}

	.starter-blurb {
		color: var(--ink-soft);
		font-size: var(--text-sm);
		line-height: 1.55;
	}

	@media (min-width: 600px) {
		.starter-grid {
			grid-template-columns: 1fr 1fr;
		}

		.rail {
			flex-wrap: wrap;
			overflow-x: visible;
			row-gap: var(--s6);
		}
	}

	@media (min-width: 1100px) {
		.starter-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
