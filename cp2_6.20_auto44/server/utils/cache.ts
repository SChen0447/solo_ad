interface CacheEntry {
  imageData: string;
  expiresAt: number;
}

class ShareCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(id: string, imageData: string, ttlMs: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(id, { imageData, expiresAt });
  }

  get(id: string): string | null {
    const entry = this.cache.get(id);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(id);
      return null;
    }
    return entry.imageData;
  }

  delete(id: string): void {
    this.cache.delete(id);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

export const shareCache = new ShareCache();
