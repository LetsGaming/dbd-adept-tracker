import type { Character, Side } from "@/types";
import { StorageService, TTL } from "./storage";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_API = "https://deadbydaylight.wiki.gg/api.php";
const CACHE_KEY = (side: Side) => `roster_${side}_v2`;

/**
 * Candidate category names to try, in order.
 * The first that returns ≥ 10 members wins.
 */
const CATEGORY_CANDIDATES: Record<Side, string[]> = {
  survivor: ["Survivors", "Survivor", "Survivor characters"],
  killer: ["Killers", "Killer", "Killer characters", "The Killers"],
};

// ─── Name normalisation ───────────────────────────────────────────────────────

/**
 * Maps wiki.gg page titles → { id, name } where the wiki's full legal name
 * differs from the in-game display name shown in character-select.
 *
 * Only add entries here when auto-derivation would produce the wrong result.
 * New characters whose wiki title matches their in-game name need no entry.
 */
const WIKI_TO_APP: Record<string, { id: string; name: string }> = {
  "Ashley J. Williams": { id: "ash", name: "Ash Williams" },
  "Detective David Tapp": { id: "tapp", name: "Detective Tapp" },
  'Jeffrey "Jeff" Johansen': { id: "jeff", name: "Jeff Johansen" },
  'William "Bill" Overbeck': { id: "bill", name: "Bill Overbeck" },
  "Lee Yun-Jin": { id: "yun", name: "Yun-Jin Lee" },
  "Leon Scott Kennedy": { id: "leon", name: "Leon S. Kennedy" },
  "Michonne Grimes": { id: "michonne", name: "Michonne" },
  "Vee Boonyasak": { id: "vee", name: "Vee" },
  // Primary entry for combined page — secondary via SPLIT_PAGES
  "Aestri Yazar & Baermar Uraz": { id: "aestri", name: "Aestri Yazar" },
};

/**
 * Wiki pages that cover multiple in-game characters.
 * All entries share the same portrait + perks from that page.
 */
const SPLIT_PAGES: Record<string, Array<{ id: string; name: string }>> = {
  "Aestri Yazar & Baermar Uraz": [
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

function deriveId(wikiTitle: string, side: Side): string {
  if (side === "killer") return slug(wikiTitle.replace(/^The\s+/i, ""));
  const PREFIXES = new Set([
    "detective",
    "dr",
    "sir",
    "lady",
    "mister",
    "mr",
    "ms",
    "mrs",
  ]);
  const parts = wikiTitle.split(/\s+/);
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

async function discoverCategoryPages(side: Side): Promise<string[]> {
  for (const category of CATEGORY_CANDIDATES[side]) {
    try {
      const data = (await wikiQuery({
        action: "query",
        list: "categorymembers",
        cmtitle: `Category:${category}`,
        cmnamespace: "0",
        cmlimit: "500",
        cmtype: "page",
      })) as { query?: { categorymembers?: Array<{ title: string }> } };

      const titles = (data.query?.categorymembers ?? []).map((m) => m.title);
      if (titles.length >= 10) {
        console.info(
          `[RosterService] Using Category:${category} for ${side}s (${titles.length} entries)`,
        );
        return titles;
      }
    } catch (e) {
      console.warn(`[RosterService] Category:${category} failed:`, e);
    }
  }
  return [];
}

async function fetchWikitexts(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    try {
      const data = (await wikiQuery({
        action: "query",
        prop: "revisions",
        titles: batch.join("|"),
        rvprop: "content",
        rvslots: "main",
        rvsection: "0",
      })) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              revisions?: Array<{
                slots?: { main?: { "*"?: string; content?: string } };
                "*"?: string;
              }>;
            }
          >;
        };
      };
      for (const page of Object.values(data.query?.pages ?? {})) {
        if (!page.title) continue;
        const rev = page.revisions?.[0];
        const text =
          rev?.slots?.main?.["*"] ??
          rev?.slots?.main?.content ??
          rev?.["*"] ??
          "";
        if (text) result.set(page.title, text);
      }
    } catch (e) {
      console.warn("[RosterService] Wikitext batch error:", e);
    }
  }
  return result;
}

// ─── Wikitext parsing ─────────────────────────────────────────────────────────

interface ParsedInfobox {
  portrait: string;
  chapter: string;
  perks: string[];
}

function parseInfobox(wikitext: string): ParsedInfobox {
  // Portrait — multiple candidate field names, accept only image filenames
  let portrait = "";
  for (const field of ["portrait", "image", "charportrait", "icon"]) {
    const m = wikitext.match(
      new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n|{}\\[\\]]+)`, "i"),
    );
    const val = m?.[1]?.trim() ?? "";
    if (val && /\.(png|jpg|webp)$/i.test(val)) {
      portrait = val;
      break;
    }
  }

  // Chapter / DLC
  let chapter = "";
  for (const field of ["DLC", "chapter", "role", "expansion", "dlc"]) {
    const m = wikitext.match(
      new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n|{}\\[\\]]+)`, "i"),
    );
    if (m?.[1]?.trim()) {
      chapter = m[1].trim();
      break;
    }
  }

  // Unique perks — grab the field value, then extract link targets
  const perksField =
    wikitext.match(/\|\s*uniqueperks\s*=\s*([\s\S]+?)(?=\n\s*\||}})/i)?.[1] ??
    "";
  const perks: string[] = [];
  const perkRe =
    /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\{\{(?:PerkLink|IconLink|Perk)\|([^|}]+)/gi;
  for (const m of perksField.matchAll(perkRe)) {
    const name = (m[1] ?? m[2]).trim();
    if (name && !name.startsWith("File:") && !name.startsWith("Category:"))
      perks.push(name);
  }

  return { portrait, chapter, perks: perks.slice(0, 3) };
}

// ─── Character assembly ───────────────────────────────────────────────────────

function assembleCharacters(
  wikiTitle: string,
  infobox: ParsedInfobox,
  side: Side,
  seedIdByName: Map<string, string>,
): Character[] {
  const { portrait, chapter, perks } = infobox;

  const buildChar = (id: string, name: string): Character => ({
    id,
    name,
    role: chapter,
    img: portrait,
    perks: [perks[0]!, perks[1]!, perks[2]!] as const,
    ...(seedIdByName.has(name) ? {} : { isNew: true }),
  });

  // Combined pages → expand to multiple characters with shared perks/portrait
  const splits = SPLIT_PAGES[wikiTitle];
  if (splits) return splits.map(({ id, name }) => buildChar(id, name));

  // Explicit name/ID mapping
  const mapped = WIKI_TO_APP[wikiTitle];
  if (mapped) return [buildChar(mapped.id, mapped.name)];

  // Seed name matches wiki title directly
  const seedId = seedIdByName.get(wikiTitle);
  if (seedId) return [buildChar(seedId, wikiTitle)];

  // Brand-new character — auto-derive
  return [buildChar(deriveId(wikiTitle, side), wikiTitle)];
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function fetchFromWiki(
  side: Side,
  seedIdByName: Map<string, string>,
): Promise<Character[]> {
  const pageTitles = await discoverCategoryPages(side);
  if (!pageTitles.length)
    throw new Error(`No category pages found for ${side}`);

  const wikitexts = await fetchWikitexts(pageTitles);
  const characters: Character[] = [];

  for (const title of pageTitles) {
    const wikitext = wikitexts.get(title);
    if (!wikitext) continue;
    if (!/\|\s*uniqueperks\s*=/i.test(wikitext)) continue; // not a character page

    const infobox = parseInfobox(wikitext);
    if (infobox.perks.length < 3) {
      console.warn(
        `[RosterService] Skipping "${title}" — fewer than 3 perks parsed`,
      );
      continue;
    }

    characters.push(...assembleCharacters(title, infobox, side, seedIdByName));
  }

  return characters;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const RosterService = {
  /**
   * Returns the full character roster for the given side.
   *
   * Priority:
   *  1. Fresh localStorage cache (24 h TTL)
   *  2. wiki.gg live fetch (updates cache on success)
   *  3. Static seed fallback
   */
  async load(side: Side, seed: readonly Character[]): Promise<Character[]> {
    const cacheKey = CACHE_KEY(side);

    const cached = StorageService.cacheFresh<Character[]>(cacheKey, TTL.CHARS);
    if (cached && cached.length >= seed.length) return cached;

    const seedIdByName = new Map<string, string>(
      seed.map((c) => [c.name, c.id]),
    );

    try {
      const chars = await fetchFromWiki(side, seedIdByName);
      if (chars.length >= seed.length * 0.8) {
        StorageService.cacheSet(cacheKey, chars);
        return chars;
      }
      console.warn(
        `[RosterService] wiki.gg returned only ${chars.length} ${side}s ` +
          `(expected ≥ ${Math.ceil(seed.length * 0.8)}), falling back to seed`,
      );
    } catch (e) {
      console.warn(`[RosterService] Roster fetch failed for ${side}:`, e);
    }

    return [...seed];
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
