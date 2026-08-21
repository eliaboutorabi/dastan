<script lang="ts">
	import { allVocab } from '$lib/db';
	import { dirOf, translate, type StringKey } from '$lib/i18n';
	import { Speaker } from '$lib/reader/tts.svelte';
	import { settings } from '$lib/settings/store.svelte';
	import type { VocabEntry } from '$lib/types';

	const t = $derived((key: StringKey, vars?: Record<string, string | number>) =>
		translate(settings.current.nativeLanguage, key, vars)
	);
	const nativeDir = $derived(dirOf(settings.current.nativeLanguage));

	let words = $state<VocabEntry[]>([]);

	$effect(() => {
		allVocab().then((list) => (words = list));
	});

	const groups = $derived(
		(['new', 'learning', 'known'] as const).map((status) => ({
			status,
			label: t(`words.status.${status}` as StringKey),
			entries: words.filter((word) => word.status === status)
		}))
	);
</script>

<header class="masthead">
	<h1>{t('words.title')}</h1>
	<p>{t('words.count', { n: words.length })}</p>
</header>

{#if !words.length}
	<p class="empty">{t('words.empty')}</p>
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
							</div>
							<p class="meaning" dir={nativeDir}>{entry.meaningNative}</p>
							<p class="context" dir="ltr" lang={settings.current.targetLanguage}>
								<span class="context-label" dir={nativeDir}>{t('words.firstSeen')}</span>
								{entry.firstContext}
							</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
{/if}

<style>
	.masthead {
		padding: 2rem 1.25rem 0.5rem;
	}

	.masthead h1 {
		font-family: var(--font-read);
		font-size: 1.6rem;
	}

	.masthead p {
		margin: 0.35rem 0 0;
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.empty {
		padding: 2rem 1.25rem;
		color: var(--ink-faint);
	}

	section {
		padding: 1.25rem 1.25rem 0;
	}

	section h2 {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-soft);
	}

	ul {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
	}

	li {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--rule);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.context {
		margin: 0.35rem 0 0;
		font-family: var(--font-read);
		font-size: 0.88rem;
		color: var(--ink-soft);
		line-height: 1.55;
	}

	.context-label {
		display: block;
		font-family: var(--font-rtl);
		font-size: 0.75rem;
		color: var(--ink-faint);
	}
</style>
