const CACHE_VERSION = 7;
const CACHE_PREFIX = `dbd_v${CACHE_VERSION}_`;

interface CacheRaw {
  v: unknown;
  t: number;
}

export const StorageService = {
  // ═══ Generic Cache ═══
  cacheGet<T>(key: string): { value: T; age: number } | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { v, t } = JSON.parse(raw) as CacheRaw;
      return { value: v as T, age: Date.now() - t };
    } catch {
      return null;
    }
  },

  cacheSet(key: string, value: unknown): void {
    try {
      localStorage.setItem(
        CACHE_PREFIX + key,
        JSON.stringify({ v: value, t: Date.now() }),
      );
    } catch (e) {
      console.warn("Cache set failed:", key, e);
    }
  },

  cacheFresh<T>(key: string, ttl: number): T | null {
    const entry = this.cacheGet<T>(key);
    return entry && entry.age < ttl ? entry.value : null;
  },

  cacheRemove(key: string): void {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  cachePurge(): void {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("dbd_v") && !k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
  },

  // ═══ Direct key access ═══
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage set failed:", key, e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  getString(key: string): string | null {
    return localStorage.getItem(key);
  },

  setString(key: string, value: string): void {
    localStorage.setItem(key, value);
  },
};

export const TTL = {
  PERK: 7 * 24 * 3600_000,
  CHARS: 24 * 3600_000,
  PORTRAIT: 30 * 24 * 3600_000,
} as const;
