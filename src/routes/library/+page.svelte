<script lang="ts">
	import { base } from '$app/paths';
	import type { StringKey } from '$lib/i18n';
	import { t } from '$lib/i18n/ui.svelte';
	import { library } from '$lib/stores/library.svelte';
	import type { Book } from '$lib/types';

	/**
	 * The guarantee this screen exists to make: starting something new never
	 * costs you something old. Every book you have ever approved is here, with
	 * the material it was written from, and archiving only moves a book off the
	 * bookshelf — it stays readable from this page for good.
	 */

	const live = $derived(library.books.filter((b) => b.status !== 'archived'));
	const archived = $derived(library.books.filter((b) => b.status === 'archived'));

	function sourceLabel(book: Book): string {
		const source = library.sourceOf(book);
		return source ? t(`library.source.${source.kind}` as StringKey) : '';
	}

	function firstUnread(book: Book): string | undefined {
		const stories = library.bookStories(book);
		return (stories.find((s) => s.status !== 'finished') ?? stories[0])?.id;
	}

	const dateOf = (iso: string) =>
		new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
</script>

<div class="page">
	<header class="page-head">
		<h1>{t('library.title')}</h1>
		<p>{t('library.blurb')}</p>
	</header>

	{#if !library.books.length}
		<p class="empty-state">{t('library.empty')}</p>
	{/if}

	{#if live.length}
		<h2 class="section-label">{t('library.books')}</h2>
		<div class="grid">
			{#each live as book (book.id)}
				{@const progress = library.progressOf(book)}
				{@const source = library.sourceOf(book)}
				{@const next = firstUnread(book)}
				<article class="book card">
					<header>
						<h3>{book.title}</h3>
						{#if book.titleNative}
							<p class="native" dir="auto">{book.titleNative}</p>
						{/if}
					</header>

					<p class="meta">
						<span class="pill">{sourceLabel(book)}</span>
						<span class="pill pill-gold">{t('book.stories', { n: book.outline.length })}</span>
						<span class="date">{dateOf(book.createdAt)}</span>
					</p>

					{#if source?.file}
						<p class="filename" title={source.file.name}>{source.file.name}</p>
					{/if}

					<div class="bar" aria-hidden="true">
						<span style:width="{progress.total ? (progress.done / progress.total) * 100 : 0}%"
						></span>
					</div>
					<p class="progress">
						{t('library.progress', { done: progress.done, total: progress.total })}
					</p>

					<div class="actions">
						{#if next}
							<a class="btn btn-sm btn-primary" href="{base}/read/{next}/">{t('book.openFirst')}</a>
						{/if}
						{#if source}
							<a class="btn btn-sm" href="{base}/new/?kind={source.kind}">{t('library.remake')}</a>
						{/if}
						<button class="btn btn-sm btn-quiet" onclick={() => library.setArchived(book, true)}>
							{t('library.archive')}
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}

	{#if archived.length}
		<h2 class="section-label archived-head">{t('library.archived')}</h2>
		<div class="grid">
			{#each archived as book (book.id)}
				{@const next = firstUnread(book)}
				<article class="book card faded">
					<header><h3>{book.title}</h3></header>
					<p class="meta">
						<span class="pill">{sourceLabel(book)}</span>
						<span class="date">{dateOf(book.createdAt)}</span>
					</p>
					<div class="actions">
						{#if next}
							<a class="btn btn-sm" href="{base}/read/{next}/">{t('book.openFirst')}</a>
						{/if}
						<button class="btn btn-sm" onclick={() => library.setArchived(book, false)}>
							{t('library.restore')}
						</button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.grid {
		display: grid;
		gap: var(--s4);
		margin-top: var(--s3);
		margin-bottom: var(--s6);
		grid-template-columns: 1fr;
	}

	.book h3 {
		font-family: var(--font-read);
		font-size: var(--text-lg);
	}

	.native {
		margin-top: 2px;
		color: var(--ink-soft);
		font-size: var(--text-sm);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s2);
		margin: var(--s3) 0;
	}

	.date {
		color: var(--ink-faint);
		font-size: var(--text-xs);
	}

	.filename {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		margin-bottom: var(--s3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bar {
		height: 5px;
		border-radius: 999px;
		background: var(--paper-sunken);
		overflow: hidden;
	}

	.bar span {
		display: block;
		height: 100%;
		background: var(--saffron);
		border-radius: 999px;
		transition: width 400ms ease;
	}

	.progress {
		margin: var(--s2) 0 var(--s4);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s2);
	}

	.faded {
		opacity: 0.72;
	}

	.archived-head {
		display: block;
		margin-top: var(--s6);
	}

	@media (min-width: 720px) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		}
	}
</style>
