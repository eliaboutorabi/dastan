<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { createApprovedBook, planBook } from '$lib/agents/author';
	import {
		extractDocument,
		isSupported,
		MAX_FILE_BYTES,
		type ExtractedDocument
	} from '$lib/files/extract';
	import type { StringKey } from '$lib/i18n';
	import { t } from '$lib/i18n/ui.svelte';
	import { MissingKeyError } from '$lib/llm/provider';
	import { library } from '$lib/stores/library.svelte';
	import { Dictation } from '$lib/speech/dictation.svelte';
	import { languageName } from '$lib/i18n';
	import { settings } from '$lib/settings/store.svelte';
	import type { Book, Source, SourceKind } from '$lib/types';

	type Stage = 'choose' | 'ready' | 'planning' | 'approve' | 'writing' | 'done';

	const kinds: SourceKind[] = ['document', 'life', 'career', 'topic'];
	const kind = $derived((page.url.searchParams.get('kind') as SourceKind) ?? 'document');

	let stage = $state<Stage>('choose');
	let error = $state<string | null>(null);

	// --- document ---------------------------------------------------------
	let extracted = $state<ExtractedDocument | null>(null);
	let reading = $state(false);
	let dragging = $state(false);

	// --- typed sources ----------------------------------------------------
	let topic = $state('');
	let pastedText = $state('');

	// --- spoken sources ---------------------------------------------------
	// Recognised speech is appended to whatever is already in the box, never
	// substituted for it, so a story can be half spoken and half typed and
	// nothing the learner wrote by hand is ever overwritten.
	const dictation = new Dictation((text) => {
		if (!text) return;
		pastedText = pastedText ? `${pastedText.trimEnd()} ${text}` : text;
	});

	const voiceSupported = Dictation.supported;

	function toggleDictation() {
		if (dictation.listening) dictation.stop();
		else dictation.start(settings.current.nativeLanguage);
	}

	// --- planning & approval ---------------------------------------------
	let source = $state<Source | null>(null);
	let book = $state<Book | null>(null);
	let requestedCount = $state<number | null>(null);
	let written = $state(0);

	function friendlyError(caught: unknown): string {
		if (caught instanceof MissingKeyError) return t('reader.noKey');
		return caught instanceof Error ? caught.message : String(caught);
	}

	async function readFile(file: File) {
		error = null;
		if (!isSupported(file)) {
			error = t('upload.readFail', { msg: file.name });
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			error = t('upload.readFail', { msg: `${Math.round(file.size / 1e6)} MB` });
			return;
		}
		reading = true;
		try {
			const result = await extractDocument(file);
			if (!result.wordCount) {
				error = t('upload.empty');
				return;
			}
			extracted = result;
			stage = 'ready';
		} catch (caught) {
			error = t('upload.readFail', { msg: friendlyError(caught) });
		} finally {
			reading = false;
		}
	}

	function onFileInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) readFile(file);
		input.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) readFile(file);
	}

	function buildSource(): Source {
		const now = new Date().toISOString();
		const id = `src-${crypto.randomUUID().slice(0, 8)}`;
		if (kind === 'document' && extracted) {
			return {
				id,
				kind: 'document',
				title: extracted.name,
				content: extracted.text,
				file: {
					name: extracted.name,
					mime: extracted.mime,
					size: extracted.size,
					pages: extracted.pages
				},
				createdAt: now
			};
		}
		return {
			id,
			kind,
			title: topic.trim() || t(`source.${kind}` as StringKey),
			content: pastedText.trim() || topic.trim(),
			createdAt: now
		};
	}

	async function plan() {
		error = null;
		stage = 'planning';
		try {
			const built = source ?? buildSource();
			source = built;
			const result = await planBook(built, requestedCount ? { targetCount: requestedCount } : {});
			book = result.book;
			stage = 'approve';
		} catch (caught) {
			error = t('book.planFail', { msg: friendlyError(caught) });
			stage = extracted || topic ? 'ready' : 'choose';
		}
	}

	async function approve() {
		if (!book || !source) return;
		error = null;
		stage = 'writing';
		written = 0;
		try {
			const saved = await createApprovedBook({
				source,
				book,
				onProgress: (done) => (written = done)
			});
			await library.load();
			book = saved;
			stage = 'done';
		} catch (caught) {
			error = t('book.planFail', { msg: friendlyError(caught) });
			stage = 'approve';
		}
	}

	function adjust(delta: number) {
		if (!book) return;
		requestedCount = Math.max(3, Math.min(40, book.outline.length + delta));
	}

	const canPlan = $derived(
		kind === 'document'
			? Boolean(extracted)
			: kind === 'life'
				? pastedText.trim().length > 40
				: topic.trim().length > 1
	);
</script>

<div class="page page-narrow">
	<header class="page-head">
		<a class="back" href="{base}/">← {t('nav.shelf')}</a>
		<h1>{t(`source.${kind}` as StringKey)}</h1>
		<p>{t(`source.${kind}.blurb` as StringKey)}</p>
	</header>

	{#if stage === 'choose' || stage === 'ready'}
		<nav class="kind-switch" aria-label={t('shelf.new')}>
			{#each kinds as option (option)}
				<a href="{base}/new/?kind={option}" class:on={option === kind}>
					{t(`source.${option}` as StringKey)}
				</a>
			{/each}
		</nav>
	{/if}

	{#if error}
		<p class="notice notice-bad">{error}</p>
	{/if}

	{#if stage === 'choose' || stage === 'ready'}
		{#if kind === 'document'}
			{#if extracted}
				<div class="card">
					<h2>{t('upload.preview')}</h2>
					<p class="found">
						{t('upload.found', { n: extracted.wordCount, name: extracted.name })}
						{#if extracted.pages}<span class="pill">{extracted.pages} pages</span>{/if}
					</p>
					<pre class="excerpt">{extracted.text.slice(0, 900)}{extracted.text.length > 900
							? '\n…'
							: ''}</pre>
					<div class="row">
						<button class="btn btn-primary" onclick={plan} disabled={!canPlan}>
							{t('upload.makeBook')}
						</button>
						<button class="btn" onclick={() => { extracted = null; stage = 'choose'; }}>
							{t('upload.remove')}
						</button>
					</div>
				</div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="dropzone"
					class:dragging
					ondragover={(e) => {
						e.preventDefault();
						dragging = true;
					}}
					ondragleave={() => (dragging = false)}
					ondrop={onDrop}
				>
					<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
						<path
							d="M12 3l4 4h-3v7h-2V7H8zM5 17h14v2H5z"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
						/>
					</svg>
					<p class="drop-title">{t('upload.drop')}</p>
					<p class="drop-types">{t('upload.types')}</p>
					<label class="btn btn-primary">
						{reading ? t('upload.reading') : t('upload.choose')}
						<input
							class="visually-hidden"
							type="file"
							accept=".pdf,.docx,.txt,.md,.markdown,.csv,text/*,application/pdf"
							onchange={onFileInput}
							disabled={reading}
						/>
					</label>
					<p class="privacy">{t('upload.privacy')}</p>
				</div>
			{/if}
		{:else}
			<div class="card">
				{#if kind !== 'life'}
					<!-- A life needs no subject line; the other two are *about*
					     something, and that something is the whole input. -->
					<label class="field">
						<span class="field-label">{t(`source.${kind}` as StringKey)}</span>
						<input
							type="text"
							bind:value={topic}
							placeholder={kind === 'career' ? 'accounts payable' : 'how bridges are built'}
						/>
						<span class="field-hint">{t(`source.${kind}.blurb` as StringKey)}</span>
					</label>
				{/if}

				{#if kind === 'life'}
					<div class="field">
						<span class="field-label">{t('source.life.label')}</span>

						<div class="tell">
							<textarea bind:value={pastedText} rows="10" placeholder={t('source.life.placeholder')}
							></textarea>

							{#if voiceSupported}
								<button
									type="button"
									class="mic"
									class:on={dictation.listening}
									onclick={toggleDictation}
									aria-pressed={dictation.listening}
									aria-label={dictation.listening ? t('voice.stop') : t('voice.speak')}
									title={dictation.listening ? t('voice.stop') : t('voice.speak')}
								>
									{#if dictation.listening}
										<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
											<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
											<path
												d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3z"
												fill="currentColor"
											/>
											<path
												d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												stroke-linecap="round"
											/>
										</svg>
									{/if}
								</button>
							{/if}
						</div>

						{#if dictation.listening}
							<p class="listening" role="status" aria-live="polite">
								<span class="pulse" aria-hidden="true"></span>
								{t('voice.listening')}
								{#if dictation.interim}<em>{dictation.interim}</em>{/if}
							</p>
						{/if}

						{#if dictation.error}
							<p class="notice notice-bad">{t(`voice.${dictation.error}` as StringKey)}</p>
						{:else if voiceSupported}
							<span class="field-hint">
								{t('voice.hint', { lang: languageName(settings.current.targetLanguage) })}
								{t('voice.quality')}
							</span>
						{:else}
							<span class="field-hint">{t('voice.unsupported')}</span>
						{/if}
					</div>
				{/if}

				<button class="btn btn-primary" onclick={plan} disabled={!canPlan}>
					{t('upload.makeBook')}
				</button>
			</div>
		{/if}
	{:else if stage === 'planning'}
		<div class="card working">
			<span class="spinner" aria-hidden="true"></span>
			<p>{t('book.planning')}</p>
		</div>
	{:else if stage === 'approve' && book}
		<!-- The approval gate. The learner is the editor of their own book:
		     nothing is written until they say so, and the count is theirs. -->
		<div class="card">
			<h2>{t('book.approve.title')}</h2>
			<p class="intro">{t('book.approve.intro', { n: book.outline.length })}</p>
			{#if book.note}
				<p class="author-note">{book.note}</p>
			{/if}

			<ol class="outline">
				{#each book.outline as entry (entry.seq)}
					<li>
						<span class="seq">{entry.seq}</span>
						<span class="outline-body">
							<span class="outline-title">{entry.title}</span>
							{#if entry.titleNative}
								<span class="outline-native" dir="auto">{entry.titleNative}</span>
							{/if}
							<span class="outline-summary">{entry.summary}</span>
						</span>
						<span class="pill">{t('common.level')} {entry.level}</span>
					</li>
				{/each}
			</ol>

			<div class="row">
				<button class="btn btn-primary" onclick={approve}>{t('book.approve.go')}</button>
				<button class="btn" onclick={() => { adjust(-3); plan(); }}>
					{t('book.approve.fewer')}
				</button>
				<button class="btn" onclick={() => { adjust(3); plan(); }}>
					{t('book.approve.more')}
				</button>
				<a class="btn btn-quiet" href="{base}/">{t('book.approve.cancel')}</a>
			</div>
		</div>
	{:else if stage === 'writing'}
		<div class="card working">
			<span class="spinner" aria-hidden="true"></span>
			<p>{t('book.writing')}</p>
			<p class="muted">{written} / 2</p>
		</div>
	{:else if stage === 'done' && book}
		<div class="card done">
			<h2>{t('book.ready')}</h2>
			<p class="intro">{book.title}</p>
			<div class="row">
				{#if book.storyIds[0]}
					<a class="btn btn-primary" href="{base}/read/{book.storyIds[0]}/">
						{t('book.openFirst')}
					</a>
				{/if}
				<a class="btn" href="{base}/">{t('nav.shelf')}</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: var(--s3);
		color: var(--ink-soft);
		text-decoration: none;
		font-size: var(--text-sm);
	}

	.kind-switch {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s1);
		margin-bottom: var(--s5);
		padding: var(--s1);
		background: var(--paper-sunken);
		border-radius: var(--radius);
	}

	.kind-switch a {
		flex: 1;
		min-width: 120px;
		padding: var(--s2) var(--s3);
		border-radius: var(--radius-sm);
		text-align: center;
		text-decoration: none;
		color: var(--ink-soft);
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.kind-switch a.on {
		background: var(--paper-raised);
		color: var(--lapis);
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}

	.dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--s3);
		padding: var(--s7) var(--s5);
		text-align: center;
		border: 2px dashed var(--rule-strong);
		border-radius: var(--radius-lg);
		background: var(--paper-raised);
		color: var(--ink-faint);
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.dropzone.dragging {
		border-color: var(--lapis);
		background: var(--lapis-wash);
	}

	.drop-title {
		font-family: var(--font-read);
		font-size: var(--text-lg);
		color: var(--ink);
	}

	.drop-types {
		font-size: var(--text-sm);
	}

	.dropzone label {
		cursor: pointer;
	}

	.privacy {
		max-width: 46ch;
		font-size: var(--text-xs);
		line-height: 1.6;
	}

	.found {
		display: flex;
		align-items: center;
		gap: var(--s2);
		font-size: var(--text-base);
		margin-bottom: var(--s3);
	}

	.excerpt {
		max-height: 260px;
		overflow: auto;
		margin: 0 0 var(--s4);
		padding: var(--s3);
		background: var(--paper-sunken);
		border-radius: var(--radius);
		font-family: var(--font-read);
		font-size: var(--text-sm);
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s2);
	}

	/* The microphone sits inside the corner of the box it fills, so the two
	   read as one instrument rather than a button that happens to be nearby. */
	.tell {
		position: relative;
	}

	.tell textarea {
		padding-inline-end: 60px;
	}

	.mic {
		position: absolute;
		inset-inline-end: var(--s2);
		top: var(--s2);
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border: 1px solid var(--rule-strong);
		border-radius: 50%;
		background: var(--paper-raised);
		color: var(--ink-soft);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.mic:hover {
		border-color: var(--lapis);
		color: var(--lapis);
	}

	.mic.on {
		background: var(--alarm);
		border-color: var(--alarm);
		color: var(--paper-raised);
	}

	.listening {
		display: flex;
		align-items: center;
		gap: var(--s2);
		margin-top: var(--s2);
		font-size: var(--text-sm);
		color: var(--ink-soft);
	}

	.listening em {
		font-style: normal;
		color: var(--ink-faint);
	}

	.pulse {
		flex: none;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--alarm);
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.35;
			transform: scale(0.8);
		}
	}

	.working {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--s3);
		padding: var(--s7);
		text-align: center;
	}

	.spinner {
		width: 26px;
		height: 26px;
		border: 2px solid var(--rule-strong);
		border-top-color: var(--lapis);
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	.muted {
		color: var(--ink-faint);
		font-size: var(--text-sm);
	}

	.intro {
		color: var(--ink-soft);
		font-size: var(--text-base);
		line-height: 1.6;
		margin-bottom: var(--s3);
	}

	.author-note {
		padding: var(--s3);
		margin-bottom: var(--s4);
		background: var(--saffron-wash);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		line-height: 1.7;
	}

	.outline {
		list-style: none;
		margin: 0 0 var(--s5);
		padding: 0;
	}

	.outline li {
		display: flex;
		align-items: flex-start;
		gap: var(--s3);
		padding: var(--s3) 0;
		border-bottom: 1px solid var(--rule);
	}

	.seq {
		flex: none;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--lapis-wash);
		color: var(--lapis);
		font-size: var(--text-xs);
		font-weight: 700;
	}

	.outline-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.outline-title {
		font-family: var(--font-read);
		font-weight: 600;
	}

	.outline-native {
		font-size: var(--text-sm);
		color: var(--ink-soft);
	}

	.outline-summary {
		font-size: var(--text-sm);
		color: var(--ink-faint);
		line-height: 1.55;
	}
</style>
