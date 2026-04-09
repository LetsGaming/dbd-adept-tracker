import type { Character, Side } from "@/types";
import { StorageService, TTL } from "./storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const WIKI_API = "https://deadbydaylight.fandom.com/api.php";
const CACHE_KEY = (side: Side) => `roster_${side}_v1`;

/**
 * Characters whose auto-derived ID would differ from the historically
 * established one (to preserve existing user progress data).
 */
const ID_OVERRIDES: Record<string, string> = {
  "Detective Tapp": "tapp",
};

/** Title-word prefixes that should be skipped when deriving a survivor ID. */
const TITLE_PREFIXES = new Set([
  "detective",
  "dr",
  "sir",
  "lady",
  "mister",
  "mr",
  "ms",
  "mrs",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (ō → o, é → e …)
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Derives a stable, human-readable ID from a character's wiki page title.
 *
 * Killers:  "The Skull Merchant" → "skullmerchant"
 * Survivors: "Dwight Fairfield" → "dwight"
 *            "Detective Tapp"   → "tapp"  (via ID_OVERRIDES)
 */
function deriveId(name: string, side: Side): string {
  if (ID_OVERRIDES[name]) return ID_OVERRIDES[name];

  if (side === "killer") {
    return slug(name.replace(/^The\s+/i, ""));
  }

  const parts = name.split(/\s+/);
  const firstSlug = slug(parts[0]);
  if (TITLE_PREFIXES.has(firstSlug) && parts.length > 1) {
    // "Detective Tapp" → use last segment ("tapp")
    return slug(parts[parts.length - 1]);
  }
  return firstSlug;
}

// ─── Wiki API calls ───────────────────────────────────────────────────────────

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
  if (!res.ok) throw new Error(`Wiki HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

/** Returns all page titles belonging to a wiki category (namespace 0 only). */
async function fetchCategoryPages(category: string): Promise<string[]> {
  const titles: string[] = [];
  let continueToken: string | undefined;

  do {
    const params: Record<string, string> = {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${category}`,
      cmnamespace: "0",
      cmlimit: "500",
      cmtype: "page",
    };
    if (continueToken) params.cmcontinue = continueToken;

    const data = (await wikiQuery(params)) as {
      query?: { categorymembers?: Array<{ title: string }> };
      continue?: { cmcontinue: string };
    };

    for (const m of data.query?.categorymembers ?? []) {
      titles.push(m.title);
    }
    continueToken = data.continue?.cmcontinue;
  } while (continueToken);

  return titles;
}

/**
 * Batch-fetches the lead section wikitext (section 0, which contains the
 * character infobox) for up to 50 page titles per API call.
 */
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
        rvsection: "0", // only the infobox section — much smaller payloads
      })) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              revisions?: Array<{
                slots?: { main?: { "*"?: string; content?: string } };
                "*"?: string; // legacy MW format
              }>;
            }
          >;
        };
      };

      for (const page of Object.values(data.query?.pages ?? {})) {
        if (!page.title) continue;
        const rev = page.revisions?.[0];
        // Handle both modern (slots) and legacy (*) formats
        const text =
          rev?.slots?.main?.["*"] ??
          rev?.slots?.main?.content ??
          rev?.["*"] ??
          "";
        if (text) result.set(page.title, text);
      }
    } catch (e) {
      console.warn("Wikitext batch fetch error:", e);
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

/**
 * Extracts portrait filename, chapter/DLC name, and unique perk names from
 * raw wikitext. Handles the various link and template formats the DBD wiki uses.
 */
function parseInfobox(wikitext: string): ParsedInfobox {
  // Portrait: | portrait = K01_charSelect_portrait.png
  const portraitMatch = wikitext.match(/\|\s*portrait\s*=\s*([^\n|{}[\]]+)/i);
  const portrait = portraitMatch?.[1]?.trim() ?? "";

  // DLC / chapter: | DLC = Original  or  | chapter = Halloween
  const chapterMatch =
    wikitext.match(/\|\s*DLC\s*=\s*([^\n|{}[\]]+)/i) ??
    wikitext.match(/\|\s*chapter\s*=\s*([^\n|{}[\]]+)/i);
  const chapter = chapterMatch?.[1]?.trim() ?? "";

  // Unique perks field (may span a line or two before the next | param)
  const perksFieldMatch = wikitext.match(
    /\|\s*uniqueperks\s*=\s*([\s\S]+?)(?=\n\s*\||}})/i,
  );
  const perksField = perksFieldMatch?.[1] ?? "";

  // Extract perk names from:
  //   [[Perk Name]]
  //   [[Perk Name|Display Text]]
  //   {{PerkLink|Perk Name}}
  //   {{IconLink|Perk Name}}
  //   {{Perk|Perk Name}}
  const perks: string[] = [];
  const perkRe =
    /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\{\{(?:PerkLink|IconLink|Perk)\|([^|}]+)/gi;
  for (const m of perksField.matchAll(perkRe)) {
    const name = (m[1] ?? m[2]).trim();
    if (name && !name.startsWith("File:") && !name.startsWith("Category:")) {
      perks.push(name);
    }
  }

  return { portrait, chapter, perks: perks.slice(0, 3) };
}

// ─── Core fetch logic ─────────────────────────────────────────────────────────

/**
 * Fetches the full character roster for one side from the DBD wiki.
 * Only pages that have a valid infobox with `uniqueperks` are included —
 * overview pages, redirects, and sub-category pages are automatically skipped.
 */
async function fetchFromWiki(
  side: Side,
  seedIds: Map<string, string>,
): Promise<Character[]> {
  const category = side === "killer" ? "Killers" : "Survivors";
  const pageTitle = await fetchCategoryPages(category);
  const wikitexts = await fetchWikitexts(pageTitle);

  const characters: Character[] = [];

  for (const title of pageTitle) {
    const wikitext = wikitexts.get(title);
    if (!wikitext) continue;

    // Skip any page that isn't a character page (no infobox uniqueperks field)
    if (!/\|\s*uniqueperks\s*=/i.test(wikitext)) continue;

    const { portrait, chapter, perks } = parseInfobox(wikitext);
    if (perks.length < 3 || !portrait) continue; // incomplete — skip

    const [perk1, perk2, perk3] = perks;
    if (!perk1 || !perk2 || !perk3) continue;

    // Preserve existing IDs for known characters to avoid breaking saved progress
    const id = seedIds.get(title) ?? deriveId(title, side);
    const isNew = !seedIds.has(title);

    const char: Character = {
      id,
      name: title,
      role: chapter,
      img: portrait,
      perks: [perk1, perk2, perk3],
      ...(isNew ? { isNew: true } : {}),
    };
    characters.push(char);
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
   *  2. Live wiki fetch (updates cache)
   *  3. Static seed fallback (if wiki unreachable)
   *
   * The seed is always passed in by the caller so this service stays
   * decoupled from the static data files.
   */
  async load(side: Side, seed: readonly Character[]): Promise<Character[]> {
    const cacheKey = CACHE_KEY(side);

    const cached = StorageService.cacheFresh<Character[]>(cacheKey, TTL.CHARS);
    if (cached && cached.length >= seed.length) return cached;

    // Build name → id map from seed to preserve IDs for existing characters
    const seedIds = new Map<string, string>(seed.map((c) => [c.name, c.id]));

    try {
      const chars = await fetchFromWiki(side, seedIds);

      // Sanity check: require at least 80 % of seed count
      // (guards against partial/broken wiki responses)
      if (chars.length >= seed.length * 0.8) {
        StorageService.cacheSet(cacheKey, chars);
        return chars;
      }
      console.warn(
        `[RosterService] Wiki returned only ${chars.length} ${side}s (expected ≥${Math.ceil(seed.length * 0.8)}), falling back to seed`,
      );
    } catch (e) {
      console.warn(`[RosterService] Wiki fetch failed for ${side}:`, e);
    }

    return [...seed];
  },

  /** Force the next load() call to re-fetch from the wiki. */
  invalidate(side?: Side): void {
    if (side) {
      StorageService.cacheRemove(CACHE_KEY(side));
    } else {
      StorageService.cacheRemove(CACHE_KEY("killer"));
      StorageService.cacheRemove(CACHE_KEY("survivor"));
    }
  },
};
