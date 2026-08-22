import { browser } from '$app/environment';

export type ProviderId = 'anthropic' | 'openai' | 'mock';
export type ThemeId = 'paper' | 'sepia' | 'night';

export interface Settings {
	provider: ProviderId;
	/** The learner's own key. Never leaves this browser except to the provider. */
	apiKey: string;
	model: string;
	/**
	 * What the interface itself speaks. Separate from `nativeLanguage` on
	 * purpose: a learner can want the app in English while still needing a word
	 * explained in Farsi. Conflating the two forced a choice nobody wanted.
	 */
	uiLanguage: string;
	/** The language the learner thinks in — used for meanings and the interview. */
	nativeLanguage: string;
	targetLanguage: string;
	/**
	 * The reading level, 1–20. Lives here rather than on the profile because
	 * every screen needs it synchronously, and because it exists from the first
	 * run — before there is any profile to hang it on.
	 */
	level: number;
	/** When the placement check last ran, so Settings can say so. */
	levelCheckedAt?: string;
	theme: ThemeId;
	/** Reading text size in px. */
	textSize: number;
	/** voiceURI of the chosen speech-synthesis voice, or '' for automatic. */
	voiceURI: string;
	/** Playback rate for read-aloud. */
	speechRate: number;
}

export const DEFAULT_MODELS: Record<ProviderId, string> = {
	anthropic: 'claude-opus-5',
	openai: 'gpt-5',
	mock: 'offline-demo'
};

const DEFAULTS: Settings = {
	provider: 'anthropic',
	apiKey: '',
	model: DEFAULT_MODELS.anthropic,
	uiLanguage: 'en',
	nativeLanguage: 'fa',
	targetLanguage: 'en',
	level: 3,
	theme: 'paper',
	textSize: 18,
	voiceURI: '',
	speechRate: 1
};

const STORAGE_KEY = 'dastan.settings.v1';

function load(): Settings {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
	} catch {
		return { ...DEFAULTS };
	}
}

/**
 * Settings live in localStorage rather than IndexedDB because they must be
 * readable synchronously on the very first paint — the theme and the text
 * direction depend on them.
 */
class SettingsStore {
	current = $state<Settings>(load());

	set<K extends keyof Settings>(key: K, value: Settings[K]) {
		this.current = { ...this.current, [key]: value };
		this.persist();
	}

	replace(next: Partial<Settings>) {
		this.current = { ...this.current, ...next };
		this.persist();
	}

	/** Switching provider carries the model over to that provider's default. */
	setProvider(provider: ProviderId) {
		this.replace({ provider, model: DEFAULT_MODELS[provider] });
	}

	get hasKey(): boolean {
		return this.current.provider === 'mock' || this.current.apiKey.trim().length > 0;
	}

	private persist() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
		} catch {
			// A full or blocked storage quota must not break reading.
		}
	}
}

export const settings = new SettingsStore();
