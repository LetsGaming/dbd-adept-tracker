import { defineStore } from "pinia";
import type { SyncPhase, SteamCreds } from "@/types";
import { StorageService } from "@/services/storage";

interface SteamState {
  phase: SyncPhase;
  message: string;
  creds: SteamCreds;
  /** Character names that have an Adept achievement in the schema (lowercased, without "The "). */
  availableAdepts: string[];
}

interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime?: number;
  name: string;
  displayName?: string;
}

const KEYS = { key: "dbd_steam_key", id: "dbd_steam_id" } as const;
const ADEPT_CACHE_KEY = "dbd_available_adepts";

export const useSteamStore = defineStore("steam", {
  state: (): SteamState => ({
    phase: "idle",
    message: "",
    creds: {
      key: StorageService.getString(KEYS.key) ?? "",
      steamId: StorageService.getString(KEYS.id) ?? "",
    },
    availableAdepts: StorageService.get<string[]>(ADEPT_CACHE_KEY) ?? [],
  }),

  getters: {
    hasCreds(): boolean {
      return Boolean(this.creds.key && this.creds.steamId);
    },

    /**
     * Check if a character has an obtainable adept achievement.
     * Returns false if schema has been fetched and no matching adept exists.
     * Returns true if schema hasn't been fetched yet (optimistic default).
     *
     * Handles naming quirks like:
     *   "Feng Min" ↔ "Adept Min"
     *   "Detective David Tapp" ↔ "Adept Tapp"
     *   "The Trapper" ↔ "Adept Trapper"
     */
    hasAdept(): (characterName: string) => boolean {
      return (characterName: string) => {
        if (!this.availableAdepts.length) return true; // no data yet → assume yes
        const search = characterName.toLowerCase().replace(/^the\s+/, "");
        const words = search.split(/\s+/);
        return this.availableAdepts.some(
          (a) =>
            a === search ||
            words.includes(a) ||
            search.startsWith(a + " ") ||
            search.endsWith(" " + a),
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
      this.creds = { key: "", steamId: "" };
      StorageService.remove(KEYS.key);
      StorageService.remove(KEYS.id);
      this.phase = "idle";
    },

    setPhase(phase: SyncPhase, message = ""): void {
      this.phase = phase;
      this.message = message;
    },

    async proxyFetch(steamUrl: string): Promise<unknown> {
      const proxyUrl = `/api/steam?url=${encodeURIComponent(steamUrl)}`;
      console.info("[Steam] Proxy:", proxyUrl.slice(0, 80) + "…");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const r = await fetch(proxyUrl, { signal: controller.signal });
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`Proxy HTTP ${r.status}: ${text.slice(0, 100)}`);
        }
        return await r.json();
      } finally {
        clearTimeout(timeout);
      }
    },

    async fetchAdepts(): Promise<SteamAchievement[]> {
      const [unlocked, schema] = await Promise.all([
        this.fetchAchievements(),
        this.fetchSchema(),
      ]);

      const achs = (
        (schema as Record<string, unknown>)?.game as Record<string, unknown>
      )?.availableGameStats as
        | { achievements?: Array<{ name: string; displayName?: string }> }
        | undefined;

      const adeptSchemaMap = new Map(
        achs?.achievements
          ?.filter((a) => /^Adept\s+/i.test(a.displayName ?? ""))
          .map((a) => [a.name, a.displayName]) ?? [],
      );

      // Extract available adept character names for retired-detection
      const adeptNames = [...adeptSchemaMap.values()]
        .map((d) => (d ?? "").replace(/^Adept\s+/i, "").trim().toLowerCase())
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
      const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=381210&key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(steamId)}&l=english&format=json`;
      const d = (await this.proxyFetch(url)) as Record<string, unknown>;
      const ps = (
        d as {
          playerstats?: {
            error?: string;
            achievements?: Array<{
              apiname: string;
              achieved: number;
              unlocktime?: number;
            }>;
          };
        }
      ).playerstats;

      if (ps?.error) {
        if (/invalid/i.test(ps.error)) throw new Error("API Key ungültig.");
        if (/private/i.test(ps.error)) throw new Error("Profil privat.");
        throw new Error(`Steam: ${ps.error}`);
      }
      if (!ps?.achievements) throw new Error("Keine Achievement-Daten.");

      const unlocked: SteamAchievement[] = [];
      for (const a of ps.achievements) {
        if (a.achieved === 1)
          unlocked.push({
            apiname: a.apiname,
            achieved: a.achieved,
            unlocktime: a.unlocktime,
            name: a.apiname.replace(/_/g, " "),
          });
      }
      return unlocked;
    },

    async fetchSchema(): Promise<unknown> {
      const base =
        "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=381210&format=json&l=english";
      const url = this.creds.key
        ? `${base}&key=${encodeURIComponent(this.creds.key)}`
        : base;
      try {
        return await this.proxyFetch(url);
      } catch (e) {
        console.warn("[Steam] Schema failed:", (e as Error).message);
        return null;
      }
    },

    /**
     * Test-drive a key+id pair without persisting them.
     * Returns the number of unlocked Adept achievements on success,
     * or throws a user-readable Error on failure.
     */
    async testConnection(key: string, steamId: string): Promise<number> {
      const { key: savedKey, steamId: savedId } = this.creds;
      // Temporarily swap creds for the test fetch
      this.creds = { key, steamId };
      try {
        const adepts = await this.fetchAdepts();
        return adepts.length;
      } finally {
        // Always restore — creds are only persisted via saveCreds()
        this.creds = { key: savedKey, steamId: savedId };
      }
    },

    validateKey(k: string): { valid: boolean; msg: string } {
      if (!k) return { valid: false, msg: "" };
      if (/^[A-F0-9]{32}$/i.test(k)) return { valid: true, msg: "✓ Gültig" };
      if (k.length < 32)
        return { valid: false, msg: `Noch ${32 - k.length} Zeichen` };
      return { valid: false, msg: "Ungültig" };
    },

    parseSteamId(input: string): { valid: boolean; id: string; msg: string } {
      if (!input) return { valid: false, id: "", msg: "" };
      const s = input.trim();
      if (/^\d{17}$/.test(s))
        return { valid: true, id: s, msg: "✓ Steam ID64" };
      const pm = s.match(/steamcommunity\.com\/profiles\/(\d{17})/);
      if (pm) return { valid: true, id: pm[1], msg: "✓ ID64 aus URL" };
      const vm = s.match(/steamcommunity\.com\/id\/([^/\s]+)/);
      if (vm)
        return {
          valid: false,
          id: "",
          msg: "⚠ Vanity-URL — steamid.io nutzen",
        };
      return { valid: false, id: "", msg: "Steam ID64 oder Profil-URL" };
    },
  },
});
