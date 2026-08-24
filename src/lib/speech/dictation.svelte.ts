import { browser } from '$app/environment';

/**
 * Speaking instead of typing.
 *
 * Telling your life story is the one place in this app where typing is the
 * wrong instrument — it is a long, warm, rambling thing, and a keyboard makes
 * people terse. So the browser's own speech recognition does the transcribing.
 *
 * Two honesties are built in. It is not available in every browser (Firefox
 * has no implementation at all), and recognition quality for some languages —
 * Farsi among them — is noticeably worse than for English. So the text stays
 * fully editable, dictation only ever appends to what is already there, and
 * the UI says plainly when the browser cannot do this rather than showing a
 * button that does nothing.
 */

/** Recognition wants a region, not a bare language tag, to do its best work. */
const REGION: Record<string, string> = {
	fa: 'fa-IR',
	en: 'en-US',
	es: 'es-ES',
	fr: 'fr-FR',
	de: 'de-DE',
	ar: 'ar-SA',
	uk: 'uk-UA',
	ru: 'ru-RU',
	zh: 'zh-CN',
	pt: 'pt-BR'
};

export function recognitionLocale(language: string): string {
	const base = language.split('-')[0];
	return REGION[base] ?? language;
}

interface SpeechRecognitionLike extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((event: SpeechRecognitionEventLike) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
	resultIndex: number;
	results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function constructor(): RecognitionConstructor | null {
	if (!browser) return null;
	const w = window as unknown as {
		SpeechRecognition?: RecognitionConstructor;
		webkitSpeechRecognition?: RecognitionConstructor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type DictationError = 'unsupported' | 'denied' | 'no-speech' | 'network' | 'failed';

export class Dictation {
	listening = $state(false);
	/** The words currently being recognised, before they are committed. */
	interim = $state('');
	error = $state<DictationError | null>(null);

	#recognition: SpeechRecognitionLike | null = null;
	#wanted = false;
	#onCommit: (text: string) => void;

	constructor(onCommit: (text: string) => void) {
		this.#onCommit = onCommit;
	}

	static get supported(): boolean {
		return constructor() !== null;
	}

	start(language: string) {
		const Recognition = constructor();
		if (!Recognition) {
			this.error = 'unsupported';
			return;
		}

		this.error = null;
		this.#wanted = true;

		const recognition = new Recognition();
		recognition.lang = recognitionLocale(language);
		recognition.continuous = true;
		recognition.interimResults = true;

		recognition.onresult = (event) => {
			let pending = '';
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				const text = result[0]?.transcript ?? '';
				if (result.isFinal) this.#onCommit(text.trim());
				else pending += text;
			}
			this.interim = pending;
		};

		recognition.onerror = (event) => {
			// A pause in speech is not a failure worth shouting about; the
			// recogniser simply idles and `onend` restarts it below.
			if (event.error === 'no-speech' || event.error === 'aborted') return;
			this.error =
				event.error === 'not-allowed' || event.error === 'service-not-allowed'
					? 'denied'
					: event.error === 'network'
						? 'network'
						: 'failed';
			this.#wanted = false;
			this.listening = false;
		};

		// Browsers stop recognition on their own after a silence. As long as the
		// learner has not pressed stop, start it again so a long pause mid-story
		// does not silently end the recording.
		recognition.onend = () => {
			this.interim = '';
			if (this.#wanted) {
				try {
					recognition.start();
				} catch {
					this.listening = false;
				}
			} else {
				this.listening = false;
			}
		};

		this.#recognition = recognition;
		try {
			recognition.start();
			this.listening = true;
		} catch {
			this.error = 'failed';
			this.listening = false;
		}
	}

	stop() {
		this.#wanted = false;
		this.interim = '';
		this.#recognition?.stop();
		this.listening = false;
	}
}
