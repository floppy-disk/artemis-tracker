
import { describe, it, expect } from 'vitest';
import { calculateMissionDay, isTitleCase, validateMilestone, validateMilestonesSimilarity, validateHistory } from './validation.js';

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

  describe('Milestone Similarity Validation', () => {
    it('detects duplicate milestones with same time and similar label', () => {
        const milestones = [
            {
                id: "outbound-correction-burn",
                label: "Outbound Correction Burn",
                detail: "First outbound trajectory correction (OTC) burn to fine-tune the path to the Moon.",
                time: "2026-04-03T22:49:00.000Z"
            },
            {
                id: "otc-1",
                label: "Outbound Trajectory Correction (OTC-1)",
                detail: "An 8-second burn to refine path for lunar flyby.",
                time: "2026-04-03T22:49:00.000Z"
            }
        ];
        const errors = validateMilestonesSimilarity(milestones);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('very similar and occur at the same time');
    });

    it('detects extremely similar milestones with different times', () => {
        const milestones = [
            {
                id: "m1",
                label: "Human Distance Record",
                detail: "Crew expected to surpass the Apollo 13 record distance from Earth.",
                time: "2026-04-06T00:00:00.000Z"
            },
            {
                id: "m2",
                label: "Human Distance Record Break",
                detail: "Crew expected to surpass the Apollo 13 record distance from Earth today.",
                time: "2026-04-06T12:00:00.000Z"
            }
        ];
        const errors = validateMilestonesSimilarity(milestones);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('extremely similar even if times differ');
    });

    it('allows different milestones at the same time', () => {
        const milestones = [
            {
                id: "m1",
                label: "Lunar Flyby",
                detail: "Closest approach to the lunar surface.",
                time: "2026-04-06T00:00:00.000Z"
            },
            {
                id: "m2",
                label: "Communications Blackout",
                detail: "Loss of signal while behind the Moon.",
                time: "2026-04-06T00:00:00.000Z"
            }
        ];
        const errors = validateMilestonesSimilarity(milestones);
        expect(errors).toHaveLength(0);
    });
  });

  describe('History Validation', () => {
    it('detects repetitive history entries unless they are nominal', () => {
      const history = [
        { statusLabel: "Emergency Evacuation", currentPhase: "Leaving Spacecraft" },
        { statusLabel: "Emergency Evacuation", currentPhase: "Leaving Spacecraft" }
      ];
      const errors = validateHistory(history);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('identical statusLabel and currentPhase');
    });

    it('allows "Nominal" or "Coast" statuses to repeat', () => {
        const history = [
          { statusLabel: "All Systems Nominal", currentPhase: "All Systems Nominal" },
          { statusLabel: "All Systems Nominal", currentPhase: "All Systems Nominal" },
          { statusLabel: "Outbound Coast", currentPhase: "Outbound Coast" },
          { statusLabel: "Outbound Coast", currentPhase: "Outbound Coast" }
        ];
        const errors = validateHistory(history);
        expect(errors).toHaveLength(0);
    });
  });
});
