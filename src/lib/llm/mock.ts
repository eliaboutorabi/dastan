import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';

/**
 * A deterministic, offline chat model.
 *
 * It exists so the app can be demonstrated and tested end to end without a key
 * and without spending anything: the reader, the caches, the vocabulary list
 * and the agent graph all run against it exactly as they run against a real
 * provider. It never invents a translation it does not know — it says so.
 *
 * It answers plainly and never calls a tool, so an agent driven by it does one
 * turn and stops. That is enough to prove the harness builds and runs in a
 * browser; proving the *tool loop* needs a real model, and the learner's own
 * key is what does that.
 */
export class MockChatModel extends BaseChatModel {
	_llmType(): string {
		return 'dastan-mock';
	}

	/**
	 * deepagents refuses any model without this — it binds its file-system
	 * tools before it will build the graph. The mock accepts them and ignores
	 * them, which is what lets the harness diagnostic run with no key at all.
	 */
	bindTools(): this {
		return this;
	}

	async _generate(messages: BaseMessage[]): Promise<ChatResult> {
		const text = await this.answer(messages);
		return { generations: [{ text, message: new AIMessage(text) }] };
	}

	private async answer(messages: BaseMessage[]): Promise<string> {
		const text = messages.map((m) => contentToText(m.content)).join('\n');
		await new Promise((resolve) => setTimeout(resolve, 180));

		if (/^\s*PING\s*$/im.test(text)) return 'PONG';
		if (/diagnostic/i.test(text)) return OFFLINE_HARNESS_NOTE;

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

const OFFLINE_NOTICE = 'حالت نمایش آفلاین: برای ترجمهٔ واقعی، کلید API را در تنظیمات بگذار.';

const OFFLINE_HARNESS_NOTE =
	'موتور عامل‌ها در مرورگر ساخته و اجرا شد. برای آزمایش ابزارها، کلید API لازم است.';

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
	invoice: { meaning: 'فاکتور، صورت‌حساب', partOfSpeech: 'اسم' },
	balance: {
		meaning: 'مانده — پولی که بعد از همهٔ حساب‌ها باقی می‌ماند',
		partOfSpeech: 'اسم',
		note: 'اینجا به معنی «تعادل» نیست؛ به معنی ماندهٔ حساب است.'
	},
	receipt: { meaning: 'رسید', partOfSpeech: 'اسم' },
	owe: { meaning: 'بدهکار بودن', partOfSpeech: 'فعل' },
	flour: { meaning: 'آرد', partOfSpeech: 'اسم' },
	bakery: { meaning: 'نانوایی', partOfSpeech: 'اسم' },
	counted: { meaning: 'شمردم (از فعل count: شمردن)', partOfSpeech: 'فعل' },
	missing: { meaning: 'گم‌شده، کم', partOfSpeech: 'صفت' },
	pocket: { meaning: 'جیب', partOfSpeech: 'اسم' },
	forgot: { meaning: 'فراموش کردم (از فعل forget)', partOfSpeech: 'فعل' },
	quiet: { meaning: 'ساکت، آرام', partOfSpeech: 'صفت' }
};

const DEMO_SENTENCES: Record<string, string> = {
	'My name is Nadia. I have a small bakery.': 'اسم من نادیا است. یک نانوایی کوچک دارم.',
	'I make bread every morning at four o’clock.': 'هر روز صبح ساعت چهار نان می‌پزم.',
	"I make bread every morning at four o'clock.": 'هر روز صبح ساعت چهار نان می‌پزم.',
	'The shop is small, but people come every day.': 'مغازه کوچک است، اما مردم هر روز می‌آیند.',
	'Every night I open my ledger.': 'هر شب دفتر حسابم را باز می‌کنم.',
	'Last Tuesday, the numbers were wrong.': 'سه‌شنبهٔ گذشته، عددها درست نبودند.',
	'My balance was forty dollars too small.': 'ماندهٔ حسابم چهل دلار کمتر بود.',
	'Forty dollars were missing. I felt cold.': 'چهل دلار گم شده بود. سردم شد.',
	'It was a receipt. It was for flour.': 'یک رسید بود. برای آرد بود.'
};
