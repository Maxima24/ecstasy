/**
 * Fixture-tuned policy thresholds.
 *
 * These values make the seeded demo transitions legible. They are not learning
 * science, validated psychometrics, or defaults a real backend should copy.
 * Keep every behavioural threshold here so the fixture cannot acquire hidden
 * rules across several modules.
 */
export const ADAPTATION_THRESHOLDS = {
  fastResponseMaxMs: 8_000,
  slowResponseMinMs: 15_000,
  repeatedMisses: 2,
  fastCorrectStreak: 2,
  standardTimerSeconds: 90,
  compressedTimerSeconds: 45,
} as const;

