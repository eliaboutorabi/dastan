<script lang="ts">
	import { base } from '$app/paths';
	import { eraseAll, exportAll, importAll, type DastanBackup } from '$lib/db';
	import { languageOptions, uiLanguageOptions, type StringKey } from '$lib/i18n';
	import { t, uiDir } from '$lib/i18n/ui.svelte';
	import { runHarnessSelfTest } from '$lib/agents/harness';
	import { testConnection } from '$lib/llm/provider';
	import { Speaker } from '$lib/reader/tts.svelte';
	import { settings, type ProviderId, type ThemeId } from '$lib/settings/store.svelte';
	import { library } from '$lib/stores/library.svelte';


	type Outcome = { kind: 'ok' | 'fail'; message: string } | null;

	let connectionState = $state<'idle' | 'running'>('idle');
	let connectionResult = $state<Outcome>(null);
	let harnessState = $state<'idle' | 'running'>('idle');
	let harnessResult = $state<Outcome>(null);
	let dataResult = $state<Outcome>(null);

	let voices = $state<SpeechSynthesisVoice[]>([]);
	$effect(() => {
		voices = Speaker.voices();
		return Speaker.onVoicesChanged(() => (voices = Speaker.voices()));
	});

	const targetVoices = $derived(
		voices.filter((voice) =>
			voice.lang.toLowerCase().startsWith(settings.current.targetLanguage.split('-')[0])
		)
	);

	const providers: ProviderId[] = ['anthropic', 'openai', 'mock'];
	const themes: ThemeId[] = ['paper', 'sepia', 'night'];

	function errorMessage(error: unknown): string {
		const raw = error instanceof Error ? error.message : String(error);
		return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
	}

	async function runConnectionTest() {
		connectionState = 'running';
		connectionResult = null;
		try {
			const reply = await testConnection();
			connectionResult = { kind: 'ok', message: `${t('settings.test.ok')} (${reply})` };
		} catch (error) {
			connectionResult = { kind: 'fail', message: t('settings.test.fail', { msg: errorMessage(error) }) };
		} finally {
			connectionState = 'idle';
		}
	}

	async function runHarness() {
		harnessState = 'running';
		harnessResult = null;
		try {
			const result = await runHarnessSelfTest();
			const files = result.files.length ? ` [${result.files.join(', ')}]` : '';
			harnessResult = {
				kind: 'ok',
				message: t('settings.harnessTest.ok', { msg: result.text + files })
			};
		} catch (error) {
			harnessResult = { kind: 'fail', message: t('settings.test.fail', { msg: errorMessage(error) }) };
		} finally {
			harnessState = 'idle';
		}
	}

	async function exportData() {
		const backup = await exportAll();
		const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `dastan-backup-${backup.exportedAt.slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function importData(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const backup = JSON.parse(await file.text()) as DastanBackup;
			const count = await importAll(backup);
			await library.load();
			dataResult = { kind: 'ok', message: t('settings.import.ok', { n: count }) };
		} catch {
			dataResult = { kind: 'fail', message: t('settings.import.fail') };
		} finally {
			input.value = '';
		}
	}

	async function startOver() {
		if (!confirm(t('settings.startOver.confirm1'))) return;
		if (!confirm(t('settings.startOver.confirm2'))) return;
		await eraseAll();
		await library.load();
		dataResult = { kind: 'ok', message: t('settings.startOver.done') };
	}
</script>

<div class="wrap" dir={uiDir()}>
	<header class="masthead">
		<h1>{t('settings.title')}</h1>
	</header>

	<section class="card">
		<h2>{t('settings.ai')}</h2>

		<label class="field">
			<span class="field-label">{t('settings.provider')}</span>
			<select
				value={settings.current.provider}
				onchange={(event) => settings.setProvider(event.currentTarget.value as ProviderId)}
			>
				{#each providers as provider (provider)}
					<option value={provider}>{t(`settings.provider.${provider}` as StringKey)}</option>
				{/each}
			</select>
		</label>

		{#if settings.current.provider !== 'mock'}
			<label class="field">
				<span class="field-label">{t('settings.apiKey')}</span>
				<input
					type="password"
					autocomplete="off"
					spellcheck="false"
					dir="ltr"
					value={settings.current.apiKey}
					oninput={(event) => settings.set('apiKey', event.currentTarget.value)}
				/>
				<span class="field-hint">{t('settings.apiKey.hint')}</span>
			</label>

			<label class="field">
				<span class="field-label">{t('settings.model')}</span>
				<input
					type="text"
					dir="ltr"
					spellcheck="false"
					value={settings.current.model}
					oninput={(event) => settings.set('model', event.currentTarget.value)}
				/>
				<span class="field-hint">{t('settings.model.hint')}</span>
			</label>
		{/if}

		<div class="actions">
			<button
				class="btn btn-primary"
				type="button"
				onclick={runConnectionTest}
				disabled={connectionState === 'running'}
			>
				{connectionState === 'running' ? t('settings.test.running') : t('settings.test')}
			</button>
			<button class="btn" type="button" onclick={runHarness} disabled={harnessState === 'running'}>
				{harnessState === 'running' ? t('settings.test.running') : t('settings.harnessTest')}
			</button>
		</div>
		<p class="field-hint">{t('settings.harnessTest.hint')}</p>

		{#if connectionResult}
			<p class="outcome {connectionResult.kind}">{connectionResult.message}</p>
		{/if}
		{#if harnessResult}
			<p class="outcome {harnessResult.kind}">{harnessResult.message}</p>
		{/if}
	</section>

	<section class="card">
		<h2>{t('level.title')}</h2>
		<p class="level-now">
			<span class="pill pill-gold">{t('level.current', { n: settings.current.level })}</span>
			<span class="level-when">
				{settings.current.levelCheckedAt
					? t('level.checked', {
							date: new Date(settings.current.levelCheckedAt).toLocaleDateString()
						})
					: t('level.never')}
			</span>
		</p>
		<p class="field-hint level-blurb">{t('level.blurb')}</p>
		<div class="actions">
			<a class="btn btn-primary" href="{base}/settings/level/">
				{settings.current.levelCheckedAt ? t('level.redo') : t('level.start')}
			</a>
		</div>

		<label class="field manual">
			<span class="field-label">{t('level.manual')}</span>
			<input
				type="range"
				min="1"
				max="20"
				step="1"
				value={settings.current.level}
				oninput={(event) => settings.set('level', Number(event.currentTarget.value))}
			/>
		</label>
	</section>

	<section class="card">
		<h2>{t('settings.languages')}</h2>

		<label class="field">
			<span class="field-label">{t('settings.appLanguage')}</span>
			<select
				value={settings.current.uiLanguage}
				onchange={(event) => settings.set('uiLanguage', event.currentTarget.value)}
			>
				{#each uiLanguageOptions as option (option.code)}
					<option value={option.code}>{option.label}</option>
				{/each}
			</select>
			<span class="field-hint">{t('settings.appLanguage.hint')}</span>
		</label>

		<div class="pair">
			<label class="field">
				<span class="field-label">{t('settings.nativeLanguage')}</span>
				<select
					value={settings.current.nativeLanguage}
					onchange={(event) => settings.set('nativeLanguage', event.currentTarget.value)}
				>
					{#each languageOptions as option (option.code)}
						<option value={option.code}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label class="field">
				<span class="field-label">{t('settings.targetLanguage')}</span>
				<select
					value={settings.current.targetLanguage}
					onchange={(event) => settings.set('targetLanguage', event.currentTarget.value)}
				>
					{#each languageOptions as option (option.code)}
						<option value={option.code}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
		<p class="field-hint">{t('settings.nativeLanguage.hint')}</p>
	</section>

	<section class="card">
		<h2>{t('settings.reading')}</h2>

		<label class="field">
			<span class="field-label">{t('settings.textSize')} · {settings.current.textSize}px</span>
			<input
				type="range"
				min="15"
				max="26"
				step="1"
				value={settings.current.textSize}
				oninput={(event) => settings.set('textSize', Number(event.currentTarget.value))}
			/>
		</label>

		<div class="field">
			<span class="field-label">{t('settings.theme')}</span>
			<div class="swatches">
				{#each themes as theme (theme)}
					<button
						type="button"
						class="swatch {theme}"
						class:on={settings.current.theme === theme}
						onclick={() => settings.set('theme', theme)}
						aria-label={t(`reader.theme.${theme}` as StringKey)}
					></button>
				{/each}
			</div>
		</div>

		<label class="field">
			<span class="field-label">{t('settings.voice')}</span>
			<select
				value={settings.current.voiceURI}
				onchange={(event) => settings.set('voiceURI', event.currentTarget.value)}
			>
				<option value="">{t('settings.voice.auto')}</option>
				{#each targetVoices as voice (voice.voiceURI)}
					<option value={voice.voiceURI}>{voice.name} — {voice.lang}</option>
				{/each}
			</select>
			{#if !targetVoices.length}
				<span class="field-hint">{t('settings.voice.none')}</span>
			{/if}
		</label>
	</section>

	<section class="card">
		<h2>{t('settings.data')}</h2>
		<div class="actions">
			<button class="btn" type="button" onclick={exportData}>{t('settings.export')}</button>
			<label class="btn">
				{t('settings.import')}
				<input class="visually-hidden" type="file" accept="application/json" onchange={importData} />
			</label>
			<button class="btn btn-danger" type="button" onclick={startOver}>
				{t('settings.startOver')}
			</button>
		</div>
		<p class="field-hint">{t('settings.export.hint')}</p>
		{#if dataResult}
			<p class="outcome {dataResult.kind}">{dataResult.message}</p>
		{/if}
	</section>
</div>

<style>
	.wrap {
		max-width: 640px;
		margin: 0 auto;
		padding: 0 1.25rem 2rem;
	}

	.masthead {
		padding: 2rem 0 0.5rem;
	}

	.masthead h1 {
		font-family: var(--font-read);
		font-size: 1.6rem;
	}

	section.card {
		margin-top: 1rem;
	}

	section h2 {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ink-soft);
		margin-bottom: 1rem;
	}

	.pair {
		display: grid;
		gap: 0 1rem;
		grid-template-columns: 1fr 1fr;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.actions label.btn {
		cursor: pointer;
	}

	.outcome {
		margin: 0.85rem 0 0;
		padding: 0.65rem 0.8rem;
		border-radius: var(--radius);
		font-size: 0.9rem;
		line-height: 1.6;
		word-break: break-word;
	}

	.outcome.ok {
		background: var(--lapis-wash);
		color: var(--lapis);
	}

	.outcome.fail {
		background: color-mix(in srgb, var(--alarm) 10%, transparent);
		color: var(--alarm);
	}

	.swatches {
		display: flex;
		gap: 0.5rem;
	}

	.swatch {
		width: 56px;
		height: 40px;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		cursor: pointer;
	}

	.swatch.paper {
		background: #f7f2e7;
	}

	.swatch.sepia {
		background: #f0e4ce;
	}

	.swatch.night {
		background: #14161c;
	}

	.swatch.on {
		box-shadow: inset 0 0 0 3px var(--saffron);
	}

	input[type='range'] {
		accent-color: var(--lapis);
	}

	.level-now {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s2);
		margin-bottom: var(--s2);
	}

	.level-when {
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}

	.level-blurb {
		margin-bottom: var(--s4);
	}

	.manual {
		margin-top: var(--s5);
		margin-bottom: 0;
	}
</style>
