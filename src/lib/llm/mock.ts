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

		// The offline demo has to be able to walk the whole book flow, or the
		// approval gate and the reader can never be seen without paying for a
		// key. These replies are canned and say so.
		if (/"bookTitle"/.test(text)) return demoOutline(text);
		if (/"targetWords"/.test(text)) return demoStory(text);

		const wordMatch = text.match(/WORD:\s*(.+)/i);
		if (wordMatch) {
			const word = wordMatch[1].trim().toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '');
			const known = DEMO_SENSES[word];
			return JSON.stringify(
				known ?? {
					simple: 'The offline demo does not know this word.',
					native: `«${word}» — ${OFFLINE_NOTICE}`,
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

/** Pull the subject out of the prompt so the demo book is at least on topic. */
function subjectOf(prompt: string): string {
	const quoted = prompt.match(/vocabulary of "([^"]+)"/) ?? prompt.match(/curious about "([^"]+)"/);
	if (quoted) return quoted[1];
	const named = prompt.match(/uploaded: "([^"]+)"/);
	if (named) return named[1];
	return 'your material';
}

function demoOutline(prompt: string): string {
	const subject = subjectOf(prompt);
	const beats = [
		['The First Morning', 'Someone new arrives and nothing is where they expect.'],
		['The Missing Paper', 'A small thing goes wrong and has to be traced back.'],
		['The Phone Call', 'A question from outside forces an answer.'],
		['The Long Afternoon', 'The work is dull until a pattern appears in it.'],
		['What Was Agreed', 'Two people remember the same promise differently.'],
		['The Last Check', 'Everything is finished, and then checked once more.']
	];
	return JSON.stringify({
		bookTitle: `A Demo Book about ${subject}`,
		bookTitleNative: `کتاب نمونه دربارهٔ ${subject}`,
		stories: beats.map(([title, summary], index) => ({
			seq: index + 1,
			title,
			titleNative: title,
			summary,
			level: 3 + index * 3
		})),
		note: OFFLINE_BOOK_NOTE
	});
}

function demoStory(prompt: string): string {
	const subject = subjectOf(prompt);
	const seq = prompt.match(/story (\d+) of/i)?.[1] ?? '1';
	const body = [
		`This is story ${seq} of a demo book about ${subject}.`,
		'',
		'Nadia opened the door of the small office. The light was already on. Someone had been there before her, and the **ledger** was open on the desk.',
		'',
		'She sat down and read the last line twice. A number was missing. Not a big number, but a missing one, and a missing number is never small.',
		'',
		'She made tea. Then she started at the beginning, the way she always did, and by ten o\'clock she had found it.',
		'',
		'It was a real story once. This one is a demonstration: add your API key in Settings and Dastan will write you a real book.'
	].join('\n');
	return JSON.stringify({
		title: `Demo Story ${seq}`,
		titleNative: `داستان نمونه ${seq}`,
		body,
		targetWords: ['ledger'],
		glossary: { ledger: 'دفتر حساب — دفتری که پول آمده و رفته در آن نوشته می‌شود' }
	});
}

const OFFLINE_BOOK_NOTE =
	'این یک کتاب نمونه در حالت آفلاین است. برای نوشتن کتاب واقعی، کلید API را در تنظیمات بگذار.';

const OFFLINE_HARNESS_NOTE =
	'موتور عامل‌ها در مرورگر ساخته و اجرا شد. برای آزمایش ابزارها، کلید API لازم است.';

/**
 * Hand-written Farsi senses for the words the bundled sample story actually
 * teaches, so the offline demo shows the real behaviour — a meaning that fits
 * *this* sentence — rather than a placeholder.
 */
const DEMO_SENSES: Record<
	string,
	{ simple: string; native: string; partOfSpeech: string; note?: string }
> = {
	ledger: {
		simple: 'a book where you write every dollar that comes in and goes out',
		native: 'دفتر حساب — دفتری که همهٔ پول‌های آمده و رفته در آن نوشته می‌شود',
		partOfSpeech: 'noun'
	},
	invoice: {
		simple: 'a paper that says how much you must pay',
		native: 'فاکتور، صورت‌حساب',
		partOfSpeech: 'noun'
	},
	balance: {
		simple: 'the money that is left after you count everything',
		native: 'مانده — پولی که بعد از همهٔ حساب‌ها باقی می‌ماند',
		partOfSpeech: 'noun',
		note: 'اینجا به معنی «تعادل» نیست؛ به معنی ماندهٔ حساب است.'
	},
	receipt: {
		simple: 'a small paper that shows you paid',
		native: 'رسید',
		partOfSpeech: 'noun'
	},
	owe: { simple: 'to still have to pay someone', native: 'بدهکار بودن', partOfSpeech: 'verb' },
	flour: { simple: 'the white powder you make bread from', native: 'آرد', partOfSpeech: 'noun' },
	bakery: { simple: 'a shop that makes and sells bread', native: 'نانوایی', partOfSpeech: 'noun' },
	counted: {
		simple: 'said the numbers one by one to find how many',
		native: 'شمردم (از فعل count: شمردن)',
		partOfSpeech: 'verb'
	},
	missing: { simple: 'not there; gone', native: 'گم‌شده، کم', partOfSpeech: 'adjective' },
	pocket: {
		simple: 'the small bag inside your coat where you keep things',
		native: 'جیب',
		partOfSpeech: 'noun'
	},
	forgot: {
		simple: 'did not remember',
		native: 'فراموش کردم (از فعل forget)',
		partOfSpeech: 'verb'
	},
	quiet: { simple: 'with little or no noise', native: 'ساکت، آرام', partOfSpeech: 'adjective' }
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
