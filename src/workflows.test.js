/* global process */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('GitHub Actions Workflows', () => {
  // ARCHIVE: This test validated the workflow_run trigger that chained
  // Tracker Update → Pages Deploy. That trigger was removed when the
  // project was archived on 2026-04-13. The original test is preserved
  // below but skipped so the suite stays green.
  it.skip('pages.yml should be triggered by Tracker Update workflow', () => {
    // Assuming tests are run from the project root
    const pagesYmlPath = path.join(process.cwd(), '.github/workflows/pages.yml');

    // Ensure the file exists
    expect(fs.existsSync(pagesYmlPath)).toBe(true);

    const pagesYml = fs.readFileSync(pagesYmlPath, 'utf-8');

    // Check for the workflow_run trigger
    expect(pagesYml).toMatch(/workflow_run:/);

    // Check that it's listening to "Tracker Update"
    expect(pagesYml).toMatch(/workflows:\s*\["Tracker Update"\]/);
  });
});
