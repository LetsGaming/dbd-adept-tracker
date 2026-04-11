import { defineStore } from 'pinia';
import type {
  SteamCreds,
  SteamAchievement,
  SteamPlayerStatsResponse,
  SteamSchemaResponse,
  SteamValidation,
  SteamIdParse,
} from '@/types';
import { SyncPhase } from '@/types';
import { StorageService } from '@/services/storage';

const PROXY_TIMEOUT_MS = 15_000;
const DBD_APP_ID = '381210';

interface SteamState {
  phase: SyncPhase;
  message: string;
  creds: SteamCreds;
  /** Character names that have an Adept achievement in the schema (lowercased, without "The "). */
  availableAdepts: string[];
}

const KEYS = { key: 'dbd_steam_key', id: 'dbd_steam_id' } as const;
const ADEPT_CACHE_KEY = 'dbd_available_adepts';
const ADEPT_NAME_PATTERN = /^Adept\s+/i;

export const useSteamStore = defineStore('steam', {
  state: (): SteamState => ({
    phase: SyncPhase.Idle,
    message: '',
    creds: {
      key: StorageService.getString(KEYS.key) ?? '',
      steamId: StorageService.getString(KEYS.id) ?? '',
    },
    availableAdepts: StorageService.get<string[]>(ADEPT_CACHE_KEY) ?? [],
  }),

  getters: {
    hasCreds(): boolean {
      return Boolean(this.creds.key && this.creds.steamId);
    },

    /**
     * Check if a character has an obtainable adept achievement.
     * Returns true if schema hasn't been fetched yet (optimistic default).
     */
    hasAdept(): (characterName: string) => boolean {
      return (characterName: string) => {
        if (!this.availableAdepts.length) return true;
        const search = characterName.toLowerCase().replace(/^the\s+/, '');
        const words = search.split(/\s+/);
        return this.availableAdepts.some(
          (a) =>
            a === search ||
            words.includes(a) ||
            search.startsWith(a + ' ') ||
            search.endsWith(' ' + a),
        );
      };
    },
  },

  actions: {
    saveCreds(key: string, steamId: string): void {
      this.creds = { key, steamId };
      StorageService.setString(KEYS.key, key);
      StorageService.setString(KEYS.id, steamId);
    },

    clearCreds(): void {
      this.creds = { key: '', steamId: '' };
      StorageService.remove(KEYS.key);
      StorageService.remove(KEYS.id);
      this.phase = SyncPhase.Idle;
    },

    setPhase(phase: SyncPhase, message = ''): void {
      this.phase = phase;
      this.message = message;
    },

    async proxyFetch<T>(steamUrl: string): Promise<T> {
      const proxyUrl = `/api/steam?url=${encodeURIComponent(steamUrl)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
      try {
        const r = await fetch(proxyUrl, { signal: controller.signal });
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`Proxy HTTP ${r.status}: ${text.slice(0, 100)}`);
        }
        return (await r.json()) as T;
      } finally {
        clearTimeout(timeout);
      }
    },

    async fetchAdepts(): Promise<SteamAchievement[]> {
      const [unlocked, schema] = await Promise.all([
        this.fetchAchievements(),
        this.fetchSchema(),
      ]);

      const schemaAchievements =
        schema?.game?.availableGameStats?.achievements ?? [];

      const adeptSchemaMap = new Map(
        schemaAchievements
          .filter((a) => ADEPT_NAME_PATTERN.test(a.displayName ?? ''))
          .map((a) => [a.name, a.displayName]),
      );

      // Extract available adept character names for retired-detection
      const adeptNames = [...adeptSchemaMap.values()]
        .map((d) => (d ?? '').replace(ADEPT_NAME_PATTERN, '').trim().toLowerCase())
        .filter(Boolean);

      if (adeptNames.length) {
        this.availableAdepts = adeptNames;
        StorageService.set(ADEPT_CACHE_KEY, adeptNames);
      }

      return unlocked
        .filter((a) => adeptSchemaMap.has(a.apiname))
        .map((a) => ({ ...a, displayName: adeptSchemaMap.get(a.apiname) }));
    },

    async fetchAchievements(): Promise<SteamAchievement[]> {
      const { key, steamId } = this.creds;
      const url =
        `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/` +
        `?appid=${DBD_APP_ID}&key=${encodeURIComponent(key)}` +
        `&steamid=${encodeURIComponent(steamId)}&l=english&format=json`;

      const d = await this.proxyFetch<SteamPlayerStatsResponse>(url);
      const ps = d.playerstats;

      if (ps?.error) {
        if (/invalid/i.test(ps.error)) throw new Error('API Key ungültig.');
        if (/private/i.test(ps.error)) throw new Error('Profil privat.');
        throw new Error(`Steam: ${ps.error}`);
      }
      if (!ps?.achievements) throw new Error('Keine Achievement-Daten.');

      return ps.achievements
        .filter((a) => a.achieved === 1)
        .map((a) => ({
          apiname: a.apiname,
          achieved: a.achieved,
          unlocktime: a.unlocktime,
          name: a.apiname.replace(/_/g, ' '),
        }));
    },

    async fetchSchema(): Promise<SteamSchemaResponse | null> {
      const base =
        `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/` +
        `?appid=${DBD_APP_ID}&format=json&l=english`;
      const url = this.creds.key
        ? `${base}&key=${encodeURIComponent(this.creds.key)}`
        : base;
      try {
        return await this.proxyFetch<SteamSchemaResponse>(url);
      } catch (e) {
        console.warn('[Steam] Schema failed:', (e as Error).message);
        return null;
      }
    },

    async testConnection(key: string, steamId: string): Promise<number> {
      const { key: savedKey, steamId: savedId } = this.creds;
      this.creds = { key, steamId };
      try {
        const adepts = await this.fetchAdepts();
        return adepts.length;
      } finally {
        this.creds = { key: savedKey, steamId: savedId };
      }
    },

    validateKey(k: string): SteamValidation {
      if (!k) return { valid: false, msg: '' };
      if (/^[A-F0-9]{32}$/i.test(k)) return { valid: true, msg: '✓ Gültig' };
      if (k.length < 32)
        return { valid: false, msg: `Noch ${32 - k.length} Zeichen` };
      return { valid: false, msg: 'Ungültig' };
    },

    parseSteamId(input: string): SteamIdParse {
      if (!input) return { valid: false, id: '', msg: '' };
      const s = input.trim();
      if (/^\d{17}$/.test(s))
        return { valid: true, id: s, msg: '✓ Steam ID64' };
      const pm = s.match(/steamcommunity\.com\/profiles\/(\d{17})/);
      if (pm) return { valid: true, id: pm[1], msg: '✓ ID64 aus URL' };
      const vm = s.match(/steamcommunity\.com\/id\/([^/\s]+)/);
      if (vm)
        return { valid: false, id: '', msg: '⚠ Vanity-URL — steamid.io nutzen' };
      return { valid: false, id: '', msg: 'Steam ID64 oder Profil-URL' };
    },
  },
});
