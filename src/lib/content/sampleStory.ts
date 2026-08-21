import type { Story } from '$lib/types';

/**
 * The story that ships in the bundle.
 *
 * It exists so that someone who has just opened Dastan for the first time, with
 * no key and no account, can read a real graded story within five seconds and
 * see exactly what this app does: tap a word, hear the page, finish it.
 *
 * Written at level 3: present and past simple, no sentence longer than nine
 * words, four target words. Every sentence below was counted.
 */
export const SAMPLE_STORY: Story = {
	id: 'sample-bakery-ledger',
	shelf: 'my-career',
	seq: 1,
	level: 3,
	title: 'The Missing Forty Dollars',
	titleNative: 'چهل دلارِ گم‌شده',
	bundled: true,
	status: 'available',
	tapCount: 0,
	targetWords: ['ledger', 'balance', 'invoice', 'receipt'],
	glossary: {
		ledger: 'دفتر حساب — دفتری که هر پولی که می‌آید و می‌رود در آن نوشته می‌شود',
		balance: 'مانده — پولی که بعد از همهٔ حساب‌ها باقی می‌ماند',
		invoice: 'فاکتور — کاغذی که فروشنده می‌دهد و می‌گوید چقدر باید بدهی',
		receipt: 'رسید — کاغذی که نشان می‌دهد پول را پرداخت کرده‌ای'
	},
	body: `My name is Nadia. I have a small bakery.
I make bread every morning at four o'clock.
The shop is small, but people come every day.

Every night I open my **ledger**.
I write the money in. I write the money out.
It is a quiet time. I like it.

Last Tuesday, the numbers were wrong.
My **balance** was forty dollars too small.
I counted again. Then I counted again.
Forty dollars were missing. I felt cold.

I looked at every **invoice** on my desk.
Flour, sugar, salt, boxes. All of them were correct.
I did not sleep well that night.

In the morning, I put on my old coat.
My hand found some paper in the pocket.
It was a **receipt**. It was for flour.
I bought the flour on Tuesday, and I forgot.

I laughed alone in my quiet shop.
Forty dollars. Not lost — only forgotten.
I wrote it in the ledger. The numbers were happy again.`
};
