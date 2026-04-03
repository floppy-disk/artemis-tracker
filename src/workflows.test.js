/* global process */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('GitHub Actions Workflows', () => {
  it('pages.yml should be triggered by Tracker Update workflow', () => {
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
