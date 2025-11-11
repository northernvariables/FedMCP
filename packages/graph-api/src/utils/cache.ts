/**
 * Simple in-memory cache with TTL support
 *
 * Provides efficient caching for expensive queries like randomMPs and topSpenders.
 * Cache entries automatically expire based on TTL.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    const activeEntries = entries.filter(([_, entry]) => entry.expiresAt > now);

    return {
      totalEntries: this.cache.size,
      activeEntries: activeEntries.length,
      expiredEntries: this.cache.size - activeEntries.length,
    };
  }

  /**
   * Remove expired entries (garbage collection)
   */
  cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }
}

// Singleton instance
export const queryCache = new QueryCache();

// Run garbage collection every 5 minutes
setInterval(() => {
  queryCache.cleanExpired();
}, 5 * 60 * 1000);

// Helper function to create cache keys
export function createCacheKey(queryName: string, args: Record<string, any>): string {
  const sortedArgs = Object.keys(args)
    .sort()
    .map(key => `${key}:${JSON.stringify(args[key])}`)
    .join('|');

  return `${queryName}:${sortedArgs}`;
}
