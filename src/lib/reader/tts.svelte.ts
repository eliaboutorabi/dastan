import { browser } from '$app/environment';
import type { Paragraph } from './tokenize';

/**
 * Read-aloud with karaoke highlighting, using the browser's own speech engine.
 *
 * Two details make this work rather than nearly work:
 *
 * 1. The story is spoken one paragraph per utterance instead of one utterance
 *    for the whole thing. Chrome silently truncates long utterances, and short
 *    ones also give the learner a real breath between paragraphs.
 * 2. `boundary` reports a `charIndex` into the *utterance*, so each paragraph's
 *    offset is added back to get a position in the whole story — which is the
 *    coordinate system the tokens are numbered in.
 */
export class Speaker {
	speaking = $state(false);
	paused = $state(false);
	/** Character offset of the word currently being spoken, or -1. */
	cursor = $state(-1);

	#paragraphs: Paragraph[] = [];
	#index = 0;
	#rate = 1;
	#voice: SpeechSynthesisVoice | null = null;
	#lang = 'en';
	#stopped = false;

	static get supported(): boolean {
		return browser && 'speechSynthesis' in window;
	}

	static voices(): SpeechSynthesisVoice[] {
		if (!Speaker.supported) return [];
		return window.speechSynthesis.getVoices();
	}

	/**
	 * Voices arrive asynchronously in Chrome — the first `getVoices()` after a
	 * cold load returns nothing until `voiceschanged` fires.
	 */
	static onVoicesChanged(handler: () => void): () => void {
		if (!Speaker.supported) return () => {};
		window.speechSynthesis.addEventListener('voiceschanged', handler);
		return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
	}

	static pickVoice(lang: string, preferredURI: string): SpeechSynthesisVoice | null {
		const voices = Speaker.voices();
		if (!voices.length) return null;
		if (preferredURI) {
			const chosen = voices.find((v) => v.voiceURI === preferredURI);
			if (chosen) return chosen;
		}
		const base = lang.split('-')[0];
		return (
			voices.find((v) => v.lang.toLowerCase().startsWith(base) && v.localService) ??
			voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
			null
		);
	}

	configure(options: { lang: string; rate: number; voiceURI: string }) {
		this.#lang = options.lang;
		this.#rate = options.rate;
		this.#voice = Speaker.pickVoice(options.lang, options.voiceURI);
	}

	start(paragraphs: Paragraph[], from = 0) {
		if (!Speaker.supported) return;
		this.stop();
		this.#paragraphs = paragraphs;
		this.#index = from;
		this.#stopped = false;
		this.speaking = true;
		this.paused = false;
		this.#speakNext();
	}

	#speakNext() {
		if (this.#stopped || this.#index >= this.#paragraphs.length) {
			this.speaking = false;
			this.cursor = -1;
			return;
		}
		const paragraph = this.#paragraphs[this.#index];
		const utterance = new SpeechSynthesisUtterance(paragraph.text);
		utterance.rate = this.#rate;
		utterance.lang = this.#lang;
		if (this.#voice) utterance.voice = this.#voice;

		utterance.onboundary = (event) => {
			if (event.name && event.name !== 'word') return;
			this.cursor = paragraph.start + event.charIndex;
		};
		utterance.onend = () => {
			if (this.#stopped) return;
			this.#index += 1;
			this.#speakNext();
		};
		utterance.onerror = () => {
			this.speaking = false;
			this.cursor = -1;
		};

		window.speechSynthesis.speak(utterance);
	}

	pause() {
		if (!Speaker.supported || !this.speaking) return;
		window.speechSynthesis.pause();
		this.paused = true;
	}

	resume() {
		if (!Speaker.supported) return;
		window.speechSynthesis.resume();
		this.paused = false;
	}

	stop() {
		if (!Speaker.supported) return;
		this.#stopped = true;
		window.speechSynthesis.cancel();
		this.speaking = false;
		this.paused = false;
		this.cursor = -1;
	}

	/** One word, on its own — the small speaker button in the word popup. */
	static say(text: string, lang: string, voiceURI = '', rate = 0.9) {
		if (!Speaker.supported) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = lang;
		utterance.rate = rate;
		const voice = Speaker.pickVoice(lang, voiceURI);
		if (voice) utterance.voice = voice;
		window.speechSynthesis.speak(utterance);
	}
}
