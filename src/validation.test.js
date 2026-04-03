
import { describe, it, expect } from 'vitest';
import { calculateMissionDay, isTitleCase, validateMilestone, validateHistory } from './validation.js';

describe('Mission Data Validation', () => {
  describe('Mission Day Calculation', () => {
    it('calculates the correct mission day based on launch time', () => {
      // Launch: 2026-04-01T22:35:00.000Z
      expect(calculateMissionDay("2026-04-01T22:35:00.000Z")).toBe(1);
      expect(calculateMissionDay("2026-04-02T22:34:59.000Z")).toBe(1);
      expect(calculateMissionDay("2026-04-02T22:35:00.000Z")).toBe(2);
      expect(calculateMissionDay("2026-04-03T22:49:00.000Z")).toBe(3);
    });
  });

  describe('Title Case Validation', () => {
    it('validates Title Case strings correctly', () => {
      expect(isTitleCase("Solar Array Deploy")).toBe(true);
      expect(isTitleCase("Launch")).toBe(true);
      expect(isTitleCase("OUTBOUND-CORRECTION-BURN")).toBe(false);
      expect(isTitleCase("LUNAR FLYBY")).toBe(false);
      expect(isTitleCase("ISS Crew Conversation")).toBe(true); // ISS is a proper noun
      expect(isTitleCase("Re-entry")).toBe(true);
      expect(isTitleCase("OTC-1 Burn")).toBe(true);
    });
  });

  describe('Milestone Validation', () => {
    it('detects errors in milestones', () => {
      const badMilestone = {
        id: "outbound-correction-burn",
        label: "OUTBOUND-CORRECTION-BURN",
        time: "2026-04-03T22:49:00.000Z",
        day: 1
      };
      const errors = validateMilestone(badMilestone);
      expect(errors).toContain('Milestone "outbound-correction-burn" has wrong day: 1, expected 3 based on time 2026-04-03T22:49:00.000Z');
      expect(errors).toContain('Milestone "outbound-correction-burn" label "OUTBOUND-CORRECTION-BURN" should be Title Case and human-readable.');
    });

    it('validates correct milestones without errors', () => {
        const goodMilestone = {
            id: "outbound-correction-burn",
            label: "Outbound Correction Burn",
            time: "2026-04-03T22:49:00.000Z",
            day: 3
        };
        const errors = validateMilestone(goodMilestone);
        expect(errors).toHaveLength(0);
    });
  });

  describe('History Validation', () => {
    it('detects repetitive history entries unless they are nominal', () => {
      const history = [
        { statusLabel: "Outbound Coast", currentPhase: "Outbound coasting trajectory" },
        { statusLabel: "Outbound Coast", currentPhase: "Outbound coasting trajectory" }
      ];
      const errors = validateHistory(history);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('identical statusLabel and currentPhase');
    });

    it('allows "Nominal" statuses to repeat', () => {
        const history = [
          { statusLabel: "All Systems Nominal", currentPhase: "All Systems Nominal" },
          { statusLabel: "All Systems Nominal", currentPhase: "All Systems Nominal" }
        ];
        const errors = validateHistory(history);
        expect(errors).toHaveLength(0);
    });
  });
});
