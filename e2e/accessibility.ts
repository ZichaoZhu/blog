import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Keep the release gate focused on defects that prevent or seriously impede
 * access. Lesser findings remain visible in a full Axe report without making
 * the smoke suite unnecessarily brittle.
 */
export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blockingViolations = report.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );
  const summaries = blockingViolations.flatMap(({ id, impact, help, nodes }) =>
    nodes.map(
      (node) =>
        `${impact}: ${id} — ${help} — ${node.target.join(' ')} — ${node.failureSummary ?? ''}`,
    ),
  );

  expect(
    summaries,
    summaries.join('\n\n'),
  ).toEqual([]);
}
