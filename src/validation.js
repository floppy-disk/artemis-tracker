
export const LAUNCH_TIME = new Date("2026-04-01T22:35:00.000Z");

const PROPER_NOUNS = ["ISS", "TLI", "SLS", "MECO", "ICPS", "EDT", "NASA", "CSA", "AVATAR", "OTC"];

export function calculateMissionDay(timeStr) {
  const time = new Date(timeStr);
  const diffMs = time.getTime() - LAUNCH_TIME.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays) + 1;
}

export function isTitleCase(str) {
  if (!str) return true;
  
  const words = str.split(/\s+/);
  return words.every(word => {
    if (word.length === 0) return true;
    
    // Check for hyphenated words
    if (word.includes("-")) {
        return word.split("-").every((part, index) => {
            if (part.length === 0) return true;
            if (!isNaN(part)) return true; // Numbers are fine
            
            // For hyphenated words like "Re-entry", "entry" might be lowercase?
            // User said "uniformly Title Case", so "Re-Entry" or "Re-entry"?
            // Usually "Re-entry" is accepted as Title Case in some styles, 
            // but "Re-Entry" is safer for "uniformly Title Case".
            // Let's assume the first part MUST be Title Case.
            if (index === 0) return isWordTitleCase(part);
            // Subsequent parts can be lowercase if it's "Re-entry"
            return isWordTitleCase(part) || (part === part.toLowerCase());
        });
    }
    
    return isWordTitleCase(word);
  });
}

function isWordTitleCase(word) {
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (PROPER_NOUNS.includes(clean)) return true;
    
    // Common small words in Title Case
    const smallWords = ["by", "of", "from", "on", "in", "to", "at", "and", "the", "with"];
    if (smallWords.includes(word.toLowerCase())) return true;

    // Check if first letter is uppercase
    if (word[0] !== word[0].toUpperCase()) return false;
    
    // Ensure rest of word is not all uppercase if not a proper noun
    if (word.length > 1) {
        for (let i = 1; i < word.length; i++) {
            const char = word[i];
            if (char >= 'A' && char <= 'Z') {
                return false;
            }
        }
    }
    return true;
}

export function validateMilestone(m) {
  const errors = [];
  
  // Rule 1: Day validation
  const expectedDay = calculateMissionDay(m.time);
  if (m.day !== expectedDay) {
    errors.push(`Milestone "${m.id}" has wrong day: ${m.day}, expected ${expectedDay} based on time ${m.time}`);
  }
  
  // Rule 2 & 3: Title Case & Human Readable
  if (!isTitleCase(m.label)) {
    errors.push(`Milestone "${m.id}" label "${m.label}" should be Title Case and human-readable.`);
  }
  
  if (m.label.includes("-") && m.label === m.label.toUpperCase()) {
      errors.push(`Milestone "${m.id}" label "${m.label}" looks like a technical ID.`);
  }

  return errors;
}

export function validateHistory(history) {
  const errors = [];
  if (!Array.isArray(history)) return errors;
  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const next = history[i + 1];
    
    if (current.statusLabel === next.statusLabel && current.currentPhase === next.currentPhase) {
        const isNominal = current.statusLabel.toLowerCase().includes("nominal");
        if (!isNominal) {
            errors.push(`History entries at index ${i} and ${i+1} have identical statusLabel and currentPhase: "${current.statusLabel}" / "${current.currentPhase}"`);
            continue;
        }
    }
    
    if (current.currentPhase === next.currentPhase && current.currentPhase.length > 10) {
         const isNominal = current.currentPhase.toLowerCase().includes("nominal");
         if (!isNominal) {
            errors.push(`History entries at index ${i} and ${i+1} have identical currentPhase: "${current.currentPhase}"`);
         }
    }
  }
  return errors;
}
