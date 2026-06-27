/**
 * Hourglass AI — Intelligent Cache Strategy
 *
 * Manages cache invalidation based on dependency tracking.
 * Prevents unnecessary recomputations by only invalidating
 * caches that are affected by the specific changed fields.
 */

import type { IntelligenceDependency } from "./types";
import { getInvalidatedDependencies } from "./constants";

interface CacheEntry<T = unknown> {
  data: T;
  validAt: string;
  dependencies: Set<IntelligenceDependency>;
  lastAccessed: number;
}

class CacheStrategy {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached data if it's still valid for the given dependencies.
   */
  get<T>(key: string, requiredDeps: IntelligenceDependency[]): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    // Check if any required dependency has been invalidated since this entry was created
    for (const dep of requiredDeps) {
      if (dep === "none") continue;
      if (!entry.dependencies.has(dep)) {
        return null; // Dep not tracked, cache is stale
      }
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  /**
   * Set cached data with its tracked dependencies.
   */
  set<T>(key: string, data: T, dependencies: IntelligenceDependency[]): void {
    this.cache.set(key, {
      data,
      validAt: new Date().toISOString(),
      dependencies: new Set(dependencies),
      lastAccessed: Date.now(),
    });
  }

  /**
   * Invalidate cache entries affected by the given changed fields.
   * Returns the list of invalidated cache keys.
   */
  invalidate(changedFields: string[]): string[] {
    const invalidatedDeps = getInvalidatedDependencies(changedFields);
    const invalidatedKeys: string[] = [];

    if (invalidatedDeps.size === 0) return invalidatedKeys;

    for (const [key, entry] of this.cache.entries()) {
      for (const dep of invalidatedDeps) {
        if (dep === "none") continue;
        if (entry.dependencies.has(dep)) {
          this.cache.delete(key);
          invalidatedKeys.push(key);
          break;
        }
      }
    }

    return invalidatedKeys;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove stale entries that haven't been accessed recently.
   * Default: entries older than 5 minutes.
   */
  prune(maxAgeMs = 300_000): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > maxAgeMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/** Singleton cache strategy instance */
export const cacheStrategy = new CacheStrategy();

/**
 * Standard cache keys used across the application.
 */
export const CACHE_KEYS = {
  INTELLIGENCE_REPORT: (userId: string) => `intelligence:${userId}`,
  CAPACITY: (userId: string) => `capacity:${userId}`,
  TIMELINE: (userId: string) => `timeline:${userId}`,
  RISK: (userId: string) => `risk:${userId}`,
  EXECUTION_PROFILE: (userId: string) => `execution_profile:${userId}`,
  USER_PROFILE: (userId: string) => `user_profile:${userId}`,
  COMMITMENT_SCORE: (userId: string) => `commitment_score:${userId}`,
  DASHBOARD_DATA: (userId: string) => `dashboard:${userId}`,
} as const;
