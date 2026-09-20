/**
 * Catch case-mismatched imports on a case-insensitive filesystem.
 *
 * macOS does not care whether you wrote `Grid3x2Icon` or `Grid3X2Icon`; Linux
 * does. That difference let a broken import pass every local build and then
 * fail the deploy — which is the worst place to find out, because the only
 * signal is a red run several minutes after the push.
 *
 * This walks the imports in `src` and re-reads each resolved file's real name
 * from its directory listing, so a name that only works by the filesystem's
 * good manners is reported here instead of in CI.
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** Every file under a directory, recursively. */
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

/** True when `path` exists with exactly this spelling, not merely close to it. */
function existsExactly(path) {
	if (!existsSync(path)) return false;
	const parent = dirname(path);
	try {
		return readdirSync(parent).includes(basename(path));
	} catch {
		return false;
	}
}

const IMPORT_RE = /(?:from|import)\s+['"]([^'"]+)['"]/g;
const problems = [];

for (const file of walk(SRC)) {
	if (!/\.(ts|js|svelte)$/.test(file)) continue;
	const source = readFileSync(file, 'utf8');

	for (const [, specifier] of source.matchAll(IMPORT_RE)) {
		// Only bare package deep-imports can hide a case bug this way; relative
		// paths are checked by the compiler and aliases are resolved by Vite.
		if (specifier.startsWith('.') || specifier.startsWith('$')) continue;
		if (!specifier.includes('/') || specifier.startsWith('node:')) continue;

		const parts = specifier.split('/');
		const pkg = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
		const rest = specifier.slice(pkg.length + 1);
		if (!rest) continue;

		const pkgDir = join(ROOT, 'node_modules', pkg);
		if (!existsSync(pkgDir)) continue;

		// Try the layouts a package with subpath exports actually uses.
		const candidates = [rest, `dist/esm/${rest}`, `${rest}.js`, `dist/esm/${rest}.js`];
		const found = candidates.map((c) => join(pkgDir, c)).filter((p) => existsSync(p));
		if (!found.length) continue;
		if (found.some((p) => existsExactly(p))) continue;

		problems.push(
			`${file.replace(ROOT + '/', '')}\n    imports "${specifier}"\n    which resolves only on a case-insensitive filesystem`
		);
	}
}

if (problems.length) {
	console.error(`\nImport case problems (these will fail on Linux):\n\n${problems.join('\n\n')}\n`);
	process.exit(1);
}
console.log(`Import case: ok`);
