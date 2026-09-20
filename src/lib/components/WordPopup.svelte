<script lang="ts">
	import { settings } from '$lib/settings/store.svelte';
	import { nativeDir, t, targetDir } from '$lib/i18n/ui.svelte';
	import { Speaker } from '$lib/reader/tts.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Tick02Icon, VolumeHighIcon } from '@hugeicons/core-free-icons';
	import type { WordSense } from '$lib/types';

	interface Props {
		word: string;
		sense: WordSense | null;
		loading: boolean;
		error: string | null;
		/** Where the tapped word sits on screen, for the anchored layout. */
		anchor: { x: number; y: number } | null;
		/** True when this word is already in the learner's word list. */
		kept: boolean;
		onkeep: () => void;
		onclose: () => void;
	}

	let { word, sense, loading, error, anchor, kept, onkeep, onclose }: Props = $props();


	let card = $state<HTMLDivElement | null>(null);
	let placement = $state<{ left: number; top: number } | null>(null);

	// Under 640px the card is a sheet at the bottom of the screen, which never
	// covers the word being read and never clips off the edge. Above that it
	// sits next to the word, where the eye already is.
	$effect(() => {
		if (!card || !anchor) return;
		if (window.innerWidth < 640) {
			placement = null;
			return;
		}
		const width = card.offsetWidth;
		const height = card.offsetHeight;
		const margin = 12;
		const left = Math.min(
			Math.max(margin, anchor.x - width / 2),
			window.innerWidth - width - margin
		);
		const above = anchor.y - height - 14;
		placement = { left, top: above > margin ? above : anchor.y + 26 };
	});

	$effect(() => {
		card?.focus();
	});

	function speak() {
		Speaker.say(word, settings.current.targetLanguage, settings.current.voiceURI, 0.85);
	}
</script>

<div
	class="scrim"
	role="presentation"
	onclick={onclose}
	onkeydown={(event) => event.key === 'Escape' && onclose()}
></div>

<div
	bind:this={card}
	class="card"
	class:anchored={placement !== null}
	style:left={placement ? `${placement.left}px` : undefined}
	style:top={placement ? `${placement.top}px` : undefined}
	role="dialog"
	aria-modal="true"
	aria-label={word}
	tabindex="-1"
	onkeydown={(event) => event.key === 'Escape' && onclose()}
>
	<div class="head">
		<span class="word" lang={settings.current.targetLanguage} dir="ltr">{word}</span>
		<button class="icon" type="button" onclick={speak} aria-label={t('reader.speak')}>
			<Icon icon={VolumeHighIcon} size={20} />
		</button>
	</div>

	<div class="body">
		{#if loading}
			<p class="muted">{t('reader.thinking')}</p>
		{:else if sense}
			<!-- The plain-language meaning comes first: it is the one that
			     teaches, because it keeps the learner inside the language they
			     are learning. The native meaning sits underneath as the safety
			     net, so a hard word never becomes a stuck moment. -->
			{#if sense.simple}
				<p class="label">{t('reader.meaning.simple')}</p>
				<p class="meaning simple" dir={targetDir()} lang={settings.current.targetLanguage}>
					{sense.simple}
				</p>
			{/if}
			{#if sense.native}
				<p class="label">{t('reader.meaning.native')}</p>
				<p class="meaning native" dir={nativeDir()} lang={settings.current.nativeLanguage}>
					{sense.native}
				</p>
			{/if}
			{#if sense.partOfSpeech}
				<p class="pos" dir={targetDir()}>{sense.partOfSpeech}</p>
			{/if}
			{#if sense.note}
				<p class="note" dir={nativeDir()} lang={settings.current.nativeLanguage}>{sense.note}</p>
			{/if}
		{:else if error}
			<p class="error">{error}</p>
		{/if}
	</div>

	<div class="foot">
		<!-- Looking a word up files it automatically, so this is mostly a state
		     to read rather than a button to press — but it stays pressable for
		     the case where a word was never looked up at all. -->
		<button class="btn keep" class:on={kept} type="button" onclick={onkeep} disabled={kept}>
			{#if kept}
				<Icon icon={Tick02Icon} size={16} />
				{t('reader.kept')}
			{:else}
				{t('reader.keep')}
			{/if}
		</button>
		<button class="btn btn-primary got-it" type="button" onclick={onclose}>
			{t('reader.gotIt')}
		</button>
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--ink) 18%, transparent);
	}

	.card {
		position: fixed;
		z-index: 41;
		inset-inline: 0;
		bottom: 0;
		margin-inline: auto;
		width: min(100%, 420px);
		padding: 1rem 1.1rem calc(1rem + env(safe-area-inset-bottom));
		background: var(--paper-raised);
		border: 1px solid var(--rule);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: var(--shadow-pop);
	}

	.card.anchored {
		inset-inline: auto;
		bottom: auto;
		width: min(340px, calc(100vw - 24px));
		border-radius: var(--radius-lg);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--rule);
	}

	.word {
		font-family: var(--font-read);
		font-size: 1.3rem;
		font-weight: 600;
	}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: var(--lapis-wash);
		color: var(--lapis);
		cursor: pointer;
	}

	.body {
		min-height: 3.2rem;
		padding: 0.7rem 0 0.3rem;
	}

	.body p {
		margin: 0 0 0.35rem;
	}

	.label {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-faint);
		margin: 0.55rem 0 0.1rem !important;
	}

	.label:first-child {
		margin-top: 0 !important;
	}

	.meaning {
		font-size: 1.02rem;
		line-height: 1.6;
	}

	.meaning.simple {
		font-family: var(--font-read);
	}

	.pos {
		font-size: 0.82rem;
		color: var(--ink-faint);
	}

	.note {
		font-size: 0.88rem;
		color: var(--ink-soft);
		padding-inline-start: 0.6rem;
		border-inline-start: 2px solid var(--saffron);
		line-height: 1.55;
	}

	.muted {
		color: var(--ink-faint);
	}

	.error {
		color: var(--alarm);
		font-size: 0.92rem;
		line-height: 1.55;
	}

	.foot {
		display: flex;
		gap: var(--s2);
		margin-top: var(--s2);
	}

	.got-it {
		flex: 1;
	}

	.keep {
		flex: 1;
		font-size: var(--text-sm);
	}

	.keep.on {
		color: var(--lapis);
		border-color: var(--lapis-wash);
		background: var(--lapis-wash);
		opacity: 1;
	}

	.keep.on :global(svg) {
		flex: none;
	}
</style>
