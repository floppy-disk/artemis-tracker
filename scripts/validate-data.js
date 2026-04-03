/* global process */
import fs from 'fs';
import { validateMilestone, validateHistory } from '../src/validation.js';

const rawData = fs.readFileSync('./public/data.json', 'utf-8');
const data = JSON.parse(rawData);

console.log("Checking Milestones...");
let milestoneErrors = 0;
data.milestones.forEach(m => {
    const errors = validateMilestone(m);
    if (errors.length > 0) {
        console.log(`- ${m.id}: ${errors.join(', ')}`);
        milestoneErrors += errors.length;
    }
});

console.log("\nChecking History...");
const historyErrors = validateHistory(data.history);
historyErrors.forEach(err => console.log(`- ${err}`));

if (milestoneErrors === 0 && historyErrors.length === 0) {
    console.log("\n✅ All validations passed!");
} else {
    console.log(`\n❌ Found ${milestoneErrors + historyErrors.length} errors.`);
    process.exit(1);
}
