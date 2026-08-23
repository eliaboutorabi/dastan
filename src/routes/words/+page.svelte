<script lang="ts">
	import { allVocab, attachMeaning, removeVocab, saveWordManually } from '$lib/db';
	import { lookupWord } from '$lib/agents/translator';
	import { MissingKeyError } from '$lib/llm/provider';
	import type { StringKey } from '$lib/i18n';
	import { nativeDir, t, targetDir, uiDir } from '$lib/i18n/ui.svelte';
	import { Speaker } from '$lib/reader/tts.svelte';
	import { settings } from '$lib/settings/store.svelte';
	import type { VocabEntry } from '$lib/types';


	let words = $state<VocabEntry[]>([]);
	let draft = $state('');
	let notice = $state<string | null>(null);
	let busy = $state<string | null>(null);
	let failure = $state<string | null>(null);

	$effect(() => {
		allVocab().then((list) => (words = list));
	});

	async function reload() {
		words = await allVocab();
	}

	/** For a word met outside the app — on a form, in a shop, at an interview. */
	async function addByHand(event: SubmitEvent) {
		event.preventDefault();
		const word = draft.trim();
		if (!word) return;
		await saveWordManually({ word });
		draft = '';
		notice = t('words.add.done', { word });
		await reload();
	}

	/**
	 * A word kept without a lookup has no meaning yet. This fetches one on
	 * demand, using the sentence it was first met in so the meaning is still
	 * the contextual one rather than a dictionary entry.
	 */
	async function findMeaning(entry: VocabEntry) {
		busy = entry.word;
		failure = null;
		try {
			const sense = await lookupWord(entry.word, entry.firstContext || entry.word);
			await attachMeaning(entry.word, { native: sense.native, simple: sense.simple });
			await reload();
		} catch (caught) {
			failure =
				caught instanceof MissingKeyError
					? t('reader.noKey')
					: caught instanceof Error
						? caught.message
						: String(caught);
		} finally {
			busy = null;
		}
	}

	async function remove(entry: VocabEntry) {
		if (!confirm(t('words.remove.confirm', { word: entry.word }))) return;
		await removeVocab(entry.word);
		await reload();
	}

	const groups = $derived(
		(['new', 'learning', 'known'] as const).map((status) => ({
			status,
			label: t(`words.status.${status}` as StringKey),
			entries: words.filter((word) => word.status === status)
		}))
	);
</script>

<div class="page">
	<header class="page-head">
		<h1>{t('words.title')}</h1>
		<p>{t('words.count', { n: words.length })}</p>
	</header>

	<form class="adder card" onsubmit={addByHand}>
		<label class="field">
			<span class="field-label">{t('words.add')}</span>
			<div class="adder-row">
				<input
					type="text"
					bind:value={draft}
					placeholder={t('words.add.placeholder')}
					dir={targetDir()}
					lang={settings.current.targetLanguage}
					spellcheck="false"
				/>
				<button class="btn btn-primary" type="submit" disabled={!draft.trim()}>
					{t('words.add.button')}
				</button>
			</div>
		</label>
		{#if notice}<p class="notice notice-ok">{notice}</p>{/if}
		{#if failure}<p class="notice notice-bad">{failure}</p>{/if}
	</form>

{#if !words.length}
	<p class="empty-state">{t('words.empty')}</p>
{:else}
	{#each groups as group (group.status)}
		{#if group.entries.length}
			<section>
				<h2>{group.label} · {group.entries.length}</h2>
				<ul>
					{#each group.entries as entry (entry.word)}
						<li>
							<div class="row">
								<span class="word" dir="ltr" lang={settings.current.targetLanguage}
									>{entry.word}</span
								>
								<button
									class="icon"
									type="button"
									aria-label={t('reader.speak')}
									onclick={() =>
										Speaker.say(
											entry.word,
											settings.current.targetLanguage,
											settings.current.voiceURI,
											0.85
										)}
								>
									<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
										<path
											d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4"
										/>
									</svg>
								</button>
								<button
									class="icon remove"
									type="button"
									aria-label={t('words.remove')}
									title={t('words.remove')}
									onclick={() => remove(entry)}
								>
									<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
										<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" />
									</svg>
								</button>
							</div>
							{#if entry.meaningSimple}
								<p class="meaning simple" lang={settings.current.targetLanguage}>
									{entry.meaningSimple}
								</p>
							{/if}
							<p class="meaning native" dir={nativeDir()} lang={settings.current.nativeLanguage}>
								{entry.meaningNative}
							</p>
							{#if !entry.meaningNative && !entry.meaningSimple}
								<p class="no-meaning">
									<span>{t('words.noMeaning')}</span>
									<button
										class="btn btn-sm"
										type="button"
										onclick={() => findMeaning(entry)}
										disabled={busy === entry.word}
									>
										{busy === entry.word ? t('words.lookup.busy') : t('words.lookup')}
									</button>
								</p>
							{/if}

							{#if entry.firstContext}
								<p class="context" dir={targetDir()} lang={settings.current.targetLanguage}>
									<span class="context-label" dir={uiDir()}>{t('words.firstSeen')}</span>
									{entry.firstContext}
								</p>
							{:else}
								<p class="context-label" dir={uiDir()}>{t('words.noContext')}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
{/if}
</div>

<style>
	section {
		margin-top: var(--s5);
	}

	.adder {
		margin-bottom: var(--s5);
	}

	.adder .field {
		margin-bottom: 0;
	}

	.adder-row {
		display: flex;
		gap: var(--s2);
	}

	.adder-row input {
		flex: 1;
	}

	.adder .notice {
		margin-top: var(--s3);
	}

	.no-meaning {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s2);
		margin: var(--s2) 0 0;
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}

	.remove {
		background: transparent;
		fill: none;
		stroke: var(--ink-faint);
		width: 28px;
		height: 28px;
	}

	.remove:hover {
		background: var(--alarm-wash);
		stroke: var(--alarm);
	}

	section h2 {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-soft);
	}

	ul {
		list-style: none;
		margin: var(--s3) 0 0;
		padding: 0;
		display: grid;
		gap: 0;
		grid-template-columns: 1fr;
	}

	@media (min-width: 820px) {
		ul {
			grid-template-columns: 1fr 1fr;
			column-gap: var(--s6);
		}
	}

	li {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--rule);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--s2);
	}

	.row .word {
		margin-inline-end: auto;
	}

	.word {
		font-family: var(--font-read);
		font-size: 1.1rem;
		font-weight: 600;
	}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 50%;
		background: var(--lapis-wash);
		fill: var(--lapis);
		cursor: pointer;
	}

	.meaning {
		margin: 0.25rem 0 0;
		font-size: 0.98rem;
	}

	.meaning.simple {
		font-family: var(--font-read);
		color: var(--ink);
	}

	.meaning.native {
		color: var(--ink-soft);
	}

	.context {
		margin: 0.35rem 0 0;
		font-family: var(--font-read);
		font-size: 0.88rem;
		color: var(--ink-soft);
		line-height: 1.55;
	}

	.context-label {
		display: block;
		font-size: 0.75rem;
		color: var(--ink-faint);
	}
</style>
