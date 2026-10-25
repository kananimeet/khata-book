import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class FastCacheService {
  private readonly logger = new Logger(FastCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly pendingPromises = new Map<string, Promise<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 60 seconds to release expired entries from memory
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Retrieve a value from the cache if it exists and has not expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Store a value in the cache with a specified time-to-live (TTL in milliseconds).
   */
  set<T>(key: string, value: T, ttlMs: number = 15_000): void {
    if (ttlMs <= 0) return;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Ultra-fast wrap with Stampede (Dogpile) Prevention (Single-Flight Pattern):
   * If 100 concurrent requests request the same key on a cache miss,
   * only ONE request executes the factory function `fn()`.
   * The other 99 requests await that exact same Promise, returning instant results
   * without overwhelming the database with 100 duplicate queries!
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 15_000,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Single-Flight: Check if this key is currently already being resolved
    const inFlight = this.pendingPromises.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }

    // Execute the factory function and save pending promise
    const promise = (async () => {
      try {
        const result = await fn();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.pendingPromises.delete(key);
      }
    })();

    this.pendingPromises.set(key, promise);
    return promise;
  }

  /**
   * Invalidate a single cache key.
   */
  delete(key: string): boolean {
    this.pendingPromises.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a given prefix.
   * Example: deleteByPrefix('expenses:') invalidates all cached expense lists and totals.
   */
  deleteByPrefix(prefix: string): number {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.pendingPromises.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.pendingPromises.clear();
  }

  /**
   * Return number of currently cached items.
   */
  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
