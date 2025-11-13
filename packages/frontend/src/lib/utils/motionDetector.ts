/**
 * Motion Detector Utility
 *
 * Detects motion outcomes from Canadian Hansard statement text.
 * Motion outcomes are embedded as standardized text patterns, not structured metadata.
 */

export type MotionOutcome = 'agreed' | 'negatived' | 'withdrawn';

export interface MotionResult {
  hasMotion: boolean;
  outcome: MotionOutcome | null;
  displayText: string | null;
}

/**
 * Detects motion outcome patterns in statement content.
 *
 * English patterns:
 * - (Motion agreed to)
 * - (Motion negatived)
 * - (Motion withdrawn)
 * - (Motion agreed to on division)
 * - etc.
 *
 * French patterns:
 * - (La motion est adoptée)
 * - (La motion est rejetée)
 * - (La motion est retirée)
 * - etc.
 *
 * @param content - Statement content text
 * @param locale - Language locale ('en' or 'fr')
 * @returns Motion detection result
 */
export function detectMotionOutcome(
  content: string | null | undefined,
  locale: 'en' | 'fr'
): MotionResult {
  if (!content) {
    return { hasMotion: false, outcome: null, displayText: null };
  }

  const patterns = locale === 'fr' ? {
    agreed: /\(La motion est adoptée[^)]*\)/gi,
    negatived: /\(La motion est rejetée[^)]*\)/gi,
    withdrawn: /\(La motion est retirée[^)]*\)/gi,
  } : {
    agreed: /\(Motion agreed to[^)]*\)/gi,
    negatived: /\(Motion negatived[^)]*\)/gi,
    withdrawn: /\(Motion withdrawn[^)]*\)/gi,
  };

  // Check each pattern
  for (const [outcome, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      // Remove parentheses for display
      const displayText = match[0].replace(/[()]/g, '').trim();

      return {
        hasMotion: true,
        outcome: outcome as MotionOutcome,
        displayText,
      };
    }
  }

  return { hasMotion: false, outcome: null, displayText: null };
}

/**
 * Get color classes for motion outcome badge based on outcome type.
 *
 * @param outcome - Motion outcome type
 * @returns Tailwind CSS classes for badge styling
 */
export function getMotionBadgeColors(outcome: MotionOutcome): string {
  switch (outcome) {
    case 'agreed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200';
    case 'negatived':
      return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/60 dark:text-gray-200';
  }
}
