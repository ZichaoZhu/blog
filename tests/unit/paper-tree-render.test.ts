import assert from "node:assert/strict";
import test from "node:test";
import { renderNodeMarkdown } from "../../src/features/paper-trees/render";

test("subscripts and tall fractions keep KaTeX structure and accessible MathML", () => {
	const html = renderNodeMarkdown(String.raw`$r_{bound}=1$ and $\frac{1}{a-1}$`);
	assert.match(html, /class="katex"/);
	assert.match(html, /<msub>/);
	assert.match(html, /<mfrac>/);
	assert.match(html, /class="mfrac"/);
	assert.match(html, /aria-hidden="true"/);
});

test("escaped dollars, code and code fences never become math", () => {
	const html = renderNodeMarkdown(String.raw`cost \$5 and \$10; ` + '`$r_{bound}$`\n\n```tex\n$\\frac{1}{2}$\n```');
	assert.equal(html.includes('class="katex"'), false);
	assert.match(html, /cost \$5 and \$10/);
	assert.match(html, /<code>\$r_\{bound\}\$<\/code>/);
	assert.match(html, /<pre><code/);
});

test("one invalid expression falls back locally while the following formula still works", () => {
	const html = renderNodeMarkdown(String.raw`$\thisCommandDoesNotExist{x}$ and $a^2$`);
	assert.match(html, /class="paper-tree-math-error"/);
	assert.match(html, /thisCommandDoesNotExist/);
	assert.match(html, /<msup>/);
	assert.equal((html.match(/class="katex"/g) ?? []).length, 1);
});

test("raw HTML, event attributes, images, unsafe links and KaTeX trust commands cannot produce active content", () => {
	const html = renderNodeMarkdown(String.raw`<script>window.pwned=1</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">evil</a>
[evil](javascript:alert%281%29) ![external](https://evil.test/tracker.png)
$\href{javascript:alert(1)}{x}$ $\htmlClass{evil}{x}$
[safe](https://example.org/paper) [anchor](#method)`);
	assert.doesNotMatch(html, /<(script|img|iframe)\b/i);
	assert.doesNotMatch(html, /\son\w+\s*=|href="javascript:|src="https:\/\/evil/i);
	assert.match(html, /href="https:\/\/example.org\/paper"/);
	assert.match(html, /href="#method"/);
	assert.match(html, /rel="noopener noreferrer"/);
});
