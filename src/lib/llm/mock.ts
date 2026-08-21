import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * A deterministic, offline chat model.
 *
 * It exists so the app can be demonstrated and tested end to end without a key
 * and without spending anything: the reader, the caches, the vocabulary list
 * and the harness all run against it exactly as they run against a real
 * provider. It never invents a translation it does not know — it says so.
 */
export class MockChatModel extends SimpleChatModel {
	_llmType(): string {
		return 'dastan-mock';
	}

	async _call(messages: BaseMessage[]): Promise<string> {
		const text = messages.map((m) => contentToText(m.content)).join('\n');
		await new Promise((resolve) => setTimeout(resolve, 180));

		if (/^\s*PING\s*$/im.test(text)) return 'PONG';

		const wordMatch = text.match(/WORD:\s*(.+)/i);
		if (wordMatch) {
			const word = wordMatch[1].trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '');
			const known = DEMO_SENSES[word];
			return JSON.stringify(
				known ?? {
					meaning: `«${word}» — ${OFFLINE_NOTICE}`,
					partOfSpeech: '—',
					note: OFFLINE_NOTICE
				}
			);
		}

		const sentenceMatch = text.match(/SENTENCE:\s*([\s\S]+?)(?:\n[A-Z]+:|$)/);
		if (sentenceMatch) {
			const sentence = sentenceMatch[1].trim();
			return DEMO_SENTENCES[sentence] ?? `${OFFLINE_NOTICE} — «${sentence}»`;
		}

		return OFFLINE_NOTICE;
	}
}

function contentToText(content: BaseMessage['content']): string {
	if (typeof content === 'string') return content;
	return content
		.map((part) => (typeof part === 'string' ? part : 'text' in part ? String(part.text) : ''))
		.join(' ');
}

const OFFLINE_NOTICE =
	'حالت نمایش آفلاین: برای ترجمهٔ واقعی، کلید API را در تنظیمات بگذار.';

/**
 * Hand-written Farsi senses for the words the bundled sample story actually
 * teaches, so the offline demo shows the real behaviour — a meaning that fits
 * *this* sentence — rather than a placeholder.
 */
const DEMO_SENSES: Record<string, { meaning: string; partOfSpeech: string; note?: string }> = {
	ledger: {
		meaning: 'دفتر حساب — دفتری که همهٔ پول‌های آمده و رفته در آن نوشته می‌شود',
		partOfSpeech: 'اسم'
	},
	invoice: {
		meaning: 'فاکتور، صورت‌حساب',
		partOfSpeech: 'اسم'
	},
	balance: {
		meaning: 'مانده — پولی که بعد از همهٔ حساب‌ها باقی می‌ماند',
		partOfSpeech: 'اسم',
		note: 'اینجا به معنی «تعادل» نیست؛ به معنی مانده حساب است.'
	},
	receipt: {
		meaning: 'رسید',
		partOfSpeech: 'اسم'
	},
	owe: {
		meaning: 'بدهکار بودن',
		partOfSpeech: 'فعل'
	},
	flour: {
		meaning: 'آرد',
		partOfSpeech: 'اسم'
	}
};

const DEMO_SENTENCES: Record<string, string> = {
	'My name is Nadia and I have a small bakery.': 'اسم من نادیا است و یک نانوایی کوچک دارم.',
	'Every night I open my ledger.': 'هر شب دفتر حسابم را باز می‌کنم.'
};
