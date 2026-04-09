import type { Character, Side } from "@/types";
import { StorageService, TTL } from "./storage";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_API = "https://deadbydaylight.wiki.gg/api.php";
const WIKI_CDN = "https://deadbydaylight.wiki.gg/images/";
const CACHE_KEY = (side: Side) => `roster_${side}_v6`;

// ─── Name overrides ───────────────────────────────────────────────────────────

/**
 * Maps wiki charPortraitName link titles → { id, name } where the wiki title
 * differs from the in-game display name shown in character-select.
 * Keys are lowercased for case-insensitive lookup.
 */
const WIKI_TO_APP = new Map<string, { id: string; name: string }>([
  // Survivors whose wiki page title ≠ in-game display name
  ["david tapp", { id: "tapp", name: "Detective Tapp" }],
  ["lee yun-jin", { id: "yun", name: "Yun-Jin Lee" }],
  ["leon scott kennedy", { id: "leon", name: "Leon S. Kennedy" }],
  ["michonne grimes", { id: "michonne", name: "Michonne" }],
  ["vee boonyasak", { id: "vee", name: "Vee" }],
  // Killers whose DISPLAYTITLE embeds {{#Invoke}} (can't be parsed from wikitext)
  // Their charPortraitName link titles are correct, so no override needed here
]);

/**
 * Wiki page entries that cover multiple in-game characters.
 * All entries share the same portrait and perks.
 */
const SPLIT_PAGES: Record<string, Array<{ id: string; name: string }>> = {
  "The Troupe": [
    { id: "aestri", name: "Aestri Yazar" },
    { id: "baermar", name: "Baermar Uraz" },
  ],
};

// ─── ID derivation ────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function deriveId(name: string, side: Side): string {
  if (side === "killer") return slug(name.replace(/^The\s+/i, ""));
  const PREFIXES = new Set(["detective", "dr", "sir", "lady"]);
  const parts = name.split(/\s+/);
  const first = slug(parts[0]);
  return PREFIXES.has(first) && parts.length > 1
    ? slug(parts[parts.length - 1])
    : first;
}

// ─── Wiki API ─────────────────────────────────────────────────────────────────

async function wikiQuery(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries({
    format: "json",
    origin: "*",
    ...params,
  })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`wiki.gg HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

// ─── Fetch and parse the rendered overview page ───────────────────────────────

async function fetchRosterHtml(side: Side): Promise<string> {
  const page = side === "killer" ? "Killers" : "Survivors";
  const data = (await wikiQuery({
    action: "parse",
    page,
    prop: "text",
    disablelimitreport: "1",
    disableeditsection: "1",
  })) as { parse?: { text?: { "*"?: string } } };
  return data.parse?.text?.["*"] ?? "";
}

/**
 * Parses the rendered Killers / Survivors wiki page HTML.
 *
 * Each .charPortraitWrapper element contains:
 *   .charPortraitImage img   → portrait filename (from src attribute)
 *   .charPortraitName a      → wiki display name (from title attribute)
 *   .charPortraitPerk a[title] → perk names (from title attributes, 3 per char)
 */
function parseRosterHtml(
  html: string,
  side: Side,
  seedIdByName: Map<string, string>,
): Character[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const wrappers = doc.querySelectorAll(".charPortraitWrapper");
  const chars: Character[] = [];

  for (const wrapper of Array.from(wrappers)) {
    // ── Portrait filename from img src ──────────────────────────────────────
    const imgEl = wrapper.querySelector(".charPortraitImage img");
    const src = imgEl?.getAttribute("src") ?? "";
    // Strip /images/ prefix and ?cache-buster suffix
    const portrait = src.replace(/^.*\/([^/?]+)(\?.*)?$/, "$1");
    // Skip if it doesn't look like a portrait file
    if (!portrait.match(/^[KS]\d{2,3}_.*Portrait\.png$/i)) continue;

    // ── Character name from charPortraitName link ──────────────────────────
    const nameLink = wrapper.querySelector(".charPortraitName a");
    const wikiName = nameLink?.getAttribute("title")?.trim() ?? "";
    if (!wikiName) continue;

    // ── Perks from charPortraitPerk links ──────────────────────────────────
    const perkLinks = Array.from(
      wrapper.querySelectorAll(".charPortraitPerk a[title]"),
    );
    const perks = perkLinks
      .map((a) => a.getAttribute("title")?.trim() ?? "")
      .filter(Boolean)
      .slice(0, 3);
    if (perks.length < 3) continue;

    const [perk1, perk2, perk3] = perks;
    if (!perk1 || !perk2 || !perk3) continue;
    const perkTuple: readonly [string, string, string] = [perk1, perk2, perk3];

    // ── Split pages (e.g. "The Troupe" → Aestri + Baermar) ────────────────
    const splits = SPLIT_PAGES[wikiName];
    if (splits) {
      for (const { id, name } of splits) {
        chars.push({
          id,
          name,
          role: "",
          img: portrait,
          perks: perkTuple,
        });
      }
      continue;
    }

    // ── Resolve display name and ID ─────────────────────────────────────────
    const mapped = WIKI_TO_APP.get(wikiName.toLowerCase());
    const appName = mapped?.name ?? wikiName;
    const id =
      mapped?.id ?? seedIdByName.get(appName) ?? deriveId(appName, side);
    const isNew = !seedIdByName.has(appName) && !mapped;

    chars.push({
      id,
      name: appName,
      role: "",
      img: portrait,
      perks: perkTuple,
      ...(isNew ? { isNew: true } : {}),
    });
  }

  return chars;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const RosterService = {
  /**
   * Returns the complete character roster for the given side.
   *
   * Sources in priority order:
   *  1. Fresh localStorage cache (24 h TTL)
   *  2. wiki.gg Killers/Survivors overview page (rendered HTML parse)
   *     → correct portrait filenames, current perks, new characters
   *  3. Static seed fallback (if wiki unreachable)
   *
   * Seed is always the baseline for role strings and ID preservation.
   * Wiki data overlays portrait, perks, and discovers new characters.
   */
  async load(side: Side, seed: readonly Character[]): Promise<Character[]> {
    const cacheKey = CACHE_KEY(side);

    // Reject cache entries with old charSelect filenames (stale data guard)
    const cached = StorageService.cacheFresh<Character[]>(cacheKey, TTL.CHARS);
    if (
      cached &&
      cached.length >= seed.length &&
      !cached.some((c) => c.img.includes("charSelect"))
    ) {
      return cached;
    }

    // Build seed lookups for ID/role preservation
    const seedIdByName = new Map<string, string>(
      seed.map((c) => [c.name, c.id]),
    );
    const seedById = new Map<string, Character>(
      seed.map((c) => [c.id, { ...c }]),
    );

    // Start with seed as the complete baseline
    const result = new Map<string, Character>(seedById);

    try {
      const html = await fetchRosterHtml(side);
      const wikiChars = parseRosterHtml(html, side, seedIdByName);

      if (wikiChars.length < seed.length * 0.8) {
        console.warn(
          `[RosterService] Only parsed ${wikiChars.length} ${side}s from wiki, expected ≥${Math.ceil(seed.length * 0.8)}`,
        );
      } else {
        for (const w of wikiChars) {
          const existing = result.get(w.id);
          if (existing) {
            result.set(w.id, {
              ...existing,
              // Take portrait and perks from wiki (current)
              // Keep role from seed (wiki overview pages don't show DLC names)
              img: w.img || existing.img,
              perks: w.perks,
            });
          } else {
            // New character not yet in seed
            result.set(w.id, w);
          }
        }
      }
    } catch (e) {
      console.warn(`[RosterService] Wiki fetch failed for ${side}:`, e);
    }

    const chars = [...result.values()];
    StorageService.cacheSet(cacheKey, chars);
    return chars;
  },

  invalidate(side?: Side): void {
    if (side) {
      StorageService.cacheRemove(CACHE_KEY(side));
    } else {
      StorageService.cacheRemove(CACHE_KEY("killer"));
      StorageService.cacheRemove(CACHE_KEY("survivor"));
    }
  },
};
