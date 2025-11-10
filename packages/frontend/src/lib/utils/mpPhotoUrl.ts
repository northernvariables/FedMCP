/**
 * Utility for getting MP photo URLs from Google Cloud Storage
 *
 * Photo URL Pattern:
 * https://storage.googleapis.com/canada-gpt-ca-mp-photos/{mp_id}.jpg
 *
 * Example:
 * Pierre Poilievre (id: pierre-poilievre)
 * → https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre.jpg
 */

export interface MPPhotoData {
  id?: string | null;
}

/**
 * Gets the MP photo URL from GCS
 *
 * @param mp - MP data with id
 * @returns Full URL to MP's photo from GCS, or null if no ID available
 *
 * @example
 * ```ts
 * const url = getMPPhotoUrl({ id: 'pierre-poilievre' });
 * // Returns: https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre.jpg
 * ```
 */
export function getMPPhotoUrl(mp: MPPhotoData): string | null {
  // Construct GCS URL from MP ID
  if (mp.id && mp.id.trim()) {
    return `https://storage.googleapis.com/canada-gpt-ca-mp-photos/${mp.id}.jpg`;
  }

  return null;
}
