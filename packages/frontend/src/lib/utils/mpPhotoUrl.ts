/**
 * Utility for getting MP photo URLs with graceful fallback
 *
 * 3-Tier Fallback Strategy:
 * 1. Custom high-res photo_url (manually uploaded to GCS) - highest priority
 * 2. Constructed GCS URL from MP ID (standard resolution)
 * 3. OpenParliament source URL from photo_url_source (lowest priority)
 *
 * Photo URL Pattern (Tier 2):
 * https://storage.googleapis.com/canada-gpt-ca-mp-photos/{mp_id}.jpg
 *
 * Example:
 * Pierre Poilievre (id: pierre-poilievre)
 * → https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre.jpg
 */

export interface MPPhotoData {
  id?: string | null;
  photo_url?: string | null;  // Custom high-res GCS URL (manually set)
  photo_url_source?: string | null;  // OpenParliament URL (auto-updated)
}

/**
 * Gets the MP photo URL with 3-tier fallback
 *
 * @param mp - MP data with id and photo URLs
 * @returns Full URL to MP's photo (GCS or OpenParliament), or null if unavailable
 *
 * @example
 * ```ts
 * // Tier 1: Custom high-res photo
 * const url1 = getMPPhotoUrl({
 *   id: 'pierre-poilievre',
 *   photo_url: 'https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre-highres.jpg'
 * });
 * // Returns: https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre-highres.jpg
 *
 * // Tier 2: Constructed GCS URL
 * const url2 = getMPPhotoUrl({ id: 'pierre-poilievre' });
 * // Returns: https://storage.googleapis.com/canada-gpt-ca-mp-photos/pierre-poilievre.jpg
 *
 * // Tier 3: OpenParliament source
 * const url3 = getMPPhotoUrl({
 *   photo_url_source: 'https://www.openparliament.ca/media/polpics/pierre-poilievre.jpg'
 * });
 * // Returns: https://www.openparliament.ca/media/polpics/pierre-poilievre.jpg
 * ```
 */
export function getMPPhotoUrl(mp: MPPhotoData): string | null {
  // Tier 1: Custom high-res photo_url (manually set, takes precedence)
  if (mp.photo_url && mp.photo_url.trim() && mp.photo_url.startsWith('http')) {
    return mp.photo_url;
  }

  // Tier 2: Construct GCS URL from MP ID (standard resolution)
  if (mp.id && mp.id.trim()) {
    return `https://storage.googleapis.com/canada-gpt-ca-mp-photos/${mp.id}.jpg`;
  }

  // Tier 3: OpenParliament source URL (fallback for data without ID)
  if (mp.photo_url_source && mp.photo_url_source.trim() && mp.photo_url_source.startsWith('http')) {
    return mp.photo_url_source;
  }

  return null;
}
