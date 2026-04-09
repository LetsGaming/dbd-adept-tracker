import type { Character, Side } from "@/types";
import { StorageService, TTL } from "./storage";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_API = "https://deadbydaylight.wiki.gg/api.php";
const CACHE_KEY = (side: Side) => `roster_${side}_v3`;

const CATEGORY_CANDIDATES: Record<Side, string[]> = {
  survivor: ["Survivors", "Survivor", "Survivor characters"],
  killer: ["Killers", "Killer", "Killer characters"],
};

// Module names to try (first one that returns > 500 chars of Lua wins)
const MODULE_CANDIDATES: Record<Side, string[]> = {
  killer: ["Killers", "KillerData", "Characters/Killers"],
  survivor: ["Survivors", "SurvivorData", "Characters/Survivors"],
};

// ─── Name overrides ───────────────────────────────────────────────────────────

/**
 * Maps wiki.gg page titles → { id, name } for the small set of cases where
 * neither DISPLAYTITLE nor auto-derivation produces the correct result.
 *
 * Lookup is case-insensitive (keys stored lowercased, matched with .toLowerCase()).
 *
 * Killer pages are generally handled automatically via DISPLAYTITLE extraction.
 * Only add a killer here if its DISPLAYTITLE embeds `{{#Invoke}}` and can't be
 * parsed statically (Vecna, Dracula at time of writing).
 */
const WIKI_TO_APP_RAW: Record<string, { id: string; name: string }> = {
  // ── Killers whose DISPLAYTITLE uses #Invoke (can't be parsed statically) ──
  vecna: { id: "lich", name: "The Lich" },
  dracula: { id: "darklord", name: "The Dark Lord" },

  // ── Survivors: wiki canonical name → in-game display name ──
  "ashley j. williams": { id: "ash", name: "Ash Williams" },
  "detective david tapp": { id: "tapp", name: "Detective Tapp" },
  'jeffrey "jeff" johansen': { id: "jeff", name: "Jeff Johansen" },
  'william "bill" overbeck': { id: "bill", name: "Bill Overbeck" },
  "lee yun-jin": { id: "yun", name: "Yun-Jin Lee" },
  "leon scott kennedy": { id: "leon", name: "Leon S. Kennedy" },
  "michonne grimes": { id: "michonne", name: "Michonne" },
  "vee boonyasak": { id: "vee", name: "Vee" },
  // Combined page — primary entry; secondary expanded via SPLIT_PAGES
  "aestri yazar & baermar uraz": { id: "aestri", name: "Aestri Yazar" },
};

// Pre-build a lowercase-keyed map for O(1) case-insensitive lookup
const WIKI_TO_APP = new Map(
  Object.entries(WIKI_TO_APP_RAW).map(([k, v]) => [k.toLowerCase(), v]),
);

/**
 * Wiki pages that represent multiple in-game characters.
 * All entries share perks/portrait/chapter from that single page.
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

/** Derives a stable ID. For killers the input should already be the alias ("The Trapper"). */
function deriveId(gameName: string, side: Side): string {
  if (side === "killer") return slug(gameName.replace(/^The\s+/i, ""));
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
  const parts = gameName.split(/\s+/);
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

// ─── Category discovery ───────────────────────────────────────────────────────

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
          `[RosterService] Category:${category} → ${titles.length} ${side} pages`,
        );
        return titles;
      }
    } catch (e) {
      console.warn(`[RosterService] Category:${category} failed:`, e);
    }
  }
  return [];
}

// ─── Individual wikitext fetch (for DISPLAYTITLE extraction) ──────────────────

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

/**
 * Extracts the in-game display title from raw wikitext.
 *
 * Handles:
 *   {{DISPLAYTITLE: Evan MacMillan — The Trapper}}      → "The Trapper"  (killer)
 *   {{DISPLAYTITLE:Ash Williams}}                        → "Ash Williams" (survivor)
 *   {{DISPLAYTITLE: Vlad Tepes Dracula — {{#Invoke…}}}} → null (Invoke inside, fallback needed)
 *
 * Returns null if DISPLAYTITLE is absent, ambiguous, or contains un-expandable templates.
 */
function extractDisplayTitle(wikitext: string, side: Side): string | null {
  const m = wikitext.match(/\{\{DISPLAYTITLE\s*:\s*([^}]+)\}\}/i);
  if (!m) return null;

  let raw = m[1].trim();

  // Reject if the value itself contains un-expanded templates / invokes
  if (raw.includes("{{")) return null;

  if (side === "killer") {
    // Format: "Real Name — The Killer"  (em-dash or regular dash)
    const dashIdx = raw.search(/\s[—–-]\s/);
    if (dashIdx === -1) return null; // no dash → can't split
    return (
      raw
        .slice(dashIdx)
        .replace(/^\s*[—–-]\s*/, "")
        .trim() || null
    );
  }

  // Survivor: DISPLAYTITLE IS the display name
  return raw || null;
}

// ─── Lua module fetch & parse ─────────────────────────────────────────────────

interface ModuleEntry {
  portrait: string;
  chapter: string;
  perks: string[];
}

async function fetchModuleLua(side: Side): Promise<string | null> {
  for (const name of MODULE_CANDIDATES[side]) {
    try {
      const data = (await wikiQuery({
        action: "query",
        prop: "revisions",
        titles: `Module:${name}`,
        rvprop: "content",
        rvslots: "main",
      })) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              revisions?: Array<{
                slots?: { main?: { "*"?: string } };
                "*"?: string;
              }>;
            }
          >;
        };
      };

      for (const page of Object.values(data.query?.pages ?? {})) {
        if (!(page.title ?? "").startsWith("Module:")) continue;
        const rev = page.revisions?.[0];
        const text = rev?.slots?.main?.["*"] ?? rev?.["*"] ?? "";
        if (text.length > 200) {
          console.info(`[RosterService] Using Module:${name} for ${side}`);
          return text;
        }
      }
    } catch {
      // try next candidate
    }
  }
  console.warn(`[RosterService] No Lua module found for ${side}`);
  return null;
}

/**
 * Extracts the Lua block content between the opening `{` and its matching `}`
 * for a given character key inside a Lua source string.
 */
function extractLuaBlock(lua: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerRe = new RegExp(
    `\\[\\s*["']${escaped}["']\\s*\\]\\s*=\\s*\\{`,
    "i",
  );
  const m = headerRe.exec(lua);
  if (!m || m.index === undefined) return null;

  let depth = 1;
  let i = m.index + m[0].length;
  let inStr = false;
  let strChar = "";

  while (i < lua.length && depth > 0) {
    const ch = lua[i];
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'") {
        inStr = true;
        strChar = ch;
      } else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    i++;
  }

  return lua.slice(m.index + m[0].length, i);
}

function parseModuleEntry(block: string): ModuleEntry {
  // ── Portrait ─────────────────────────────────────────────────────────────
  // Accept any string value for a field named portrait/image/charportrait/icon
  // that ends in .png / .jpg / .webp
  let portrait = "";
  for (const field of ["portrait", "image", "charportrait", "icon"]) {
    const re = new RegExp(
      `${field}\\s*=\\s*["']([^"']*\\.(?:png|jpg|webp))["']`,
      "i",
    );
    const m = block.match(re);
    if (m) {
      portrait = m[1];
      break;
    }
  }
  // Broad fallback: any quoted string matching the KXX/SXX portrait pattern
  if (!portrait) {
    const m = block.match(/["']([KS]\d+[^"']*\.png)["']/i);
    if (m) portrait = m[1];
  }

  // ── Chapter / DLC ─────────────────────────────────────────────────────────
  let chapter = "";
  for (const field of ["chapter", "dlc", "DLC", "expansion", "role"]) {
    const re = new RegExp(`${field}\\s*=\\s*["']([^"']+)["']`, "i");
    const m = block.match(re);
    if (m) {
      chapter = m[1];
      break;
    }
  }

  // ── Unique perks ──────────────────────────────────────────────────────────
  // Look for a field named perks / uniqueperks / uniquePerks / perksList
  // containing a Lua array of strings
  const perks: string[] = [];
  const perksField = block.match(
    /(?:perks|uniqueperks|uniquePerks|perksList)\s*=\s*\{([^}]+)\}/i,
  );
  if (perksField) {
    const perkRe = /["']([^"']+)["']/g;
    for (const m of perksField[1].matchAll(perkRe)) {
      const name = m[1].trim();
      if (name) perks.push(name);
    }
  }

  return { portrait, chapter, perks: perks.slice(0, 3) };
}

/**
 * Parses a Lua module source into a map of wiki-page-title → ModuleEntry.
 * Handles both `["Real Name"] = {…}` and integer-keyed arrays where a
 * `realName` / `name` / `title` field identifies the character.
 */
function parseModule(
  lua: string,
  pageTitles: string[],
): Map<string, ModuleEntry> {
  const result = new Map<string, ModuleEntry>();

  for (const title of pageTitles) {
    const block = extractLuaBlock(lua, title);
    if (!block) continue;
    result.set(title, parseModuleEntry(block));
  }

  return result;
}

// ─── Character assembly ───────────────────────────────────────────────────────

function resolveGameName(
  wikiTitle: string,
  wikitext: string,
  side: Side,
): { id: string; name: string } {
  // 1. Explicit override map (case-insensitive)
  const mapped = WIKI_TO_APP.get(wikiTitle.toLowerCase());
  if (mapped) return mapped;

  // 2. DISPLAYTITLE extraction (handles most killers automatically)
  const dt = extractDisplayTitle(wikitext, side);
  if (dt) {
    return { id: deriveId(dt, side), name: dt };
  }

  // 3. For killers: page title might already be the in-game name ("The Demogorgon")
  if (side === "killer" && /^The\s+\w/i.test(wikiTitle)) {
    return { id: deriveId(wikiTitle, side), name: wikiTitle };
  }

  // 4. Auto-derive from wiki page title
  return { id: deriveId(wikiTitle, side), name: wikiTitle };
}

function assembleCharacters(
  wikiTitle: string,
  wikitext: string,
  side: Side,
  moduleEntry: ModuleEntry | undefined,
  seedIdByName: Map<string, string>,
): Character[] {
  const { portrait, chapter, perks } = moduleEntry ?? {
    portrait: "",
    chapter: "",
    perks: [],
  };
  const perkTuple: readonly [string, string, string] = [
    perks[0] ?? "",
    perks[1] ?? "",
    perks[2] ?? "",
  ];

  // Split pages → multiple characters sharing the same data
  const splits = SPLIT_PAGES[wikiTitle];
  if (splits) {
    return splits.map(({ id, name }) => ({
      id,
      name,
      role: chapter,
      img: portrait,
      perks: perkTuple,
    }));
  }

  const { id: derivedId, name } = resolveGameName(wikiTitle, wikitext, side);
  const id = seedIdByName.get(name) ?? derivedId;
  const isNew =
    !seedIdByName.has(name) && !WIKI_TO_APP.has(wikiTitle.toLowerCase());

  return [
    {
      id,
      name,
      role: chapter,
      img: portrait,
      perks: perkTuple,
      ...(isNew ? { isNew: true } : {}),
    },
  ];
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function fetchFromWiki(
  side: Side,
  seedIdByName: Map<string, string>,
): Promise<Character[]> {
  // Phase 1: character page titles
  const pageTitles = await discoverCategoryPages(side);
  if (!pageTitles.length)
    throw new Error(`No category pages found for ${side}`);

  // Phase 2: individual wikitexts (for DISPLAYTITLE, page validation)
  const wikitexts = await fetchWikitexts(pageTitles);

  // Phase 3: Lua module → portrait, chapter, perks per character
  const moduleLua = await fetchModuleLua(side);
  const moduleEntries = moduleLua
    ? parseModule(moduleLua, pageTitles)
    : new Map<string, ModuleEntry>();

  // Phase 4: build Character[]
  const characters: Character[] = [];

  for (const title of pageTitles) {
    const wikitext = wikitexts.get(title) ?? "";

    // Validate: must be a character page (calls the character table Lua invoke)
    const isCharPage = /#Invoke\s*:\s*(Killers|Survivors)\s*\|/i.test(wikitext);
    if (!isCharPage) continue;

    const entry = moduleEntries.get(title);
    const perks = entry?.perks ?? [];

    // Skip pages where the module gave us incomplete perk data AND we have no
    // seed fallback (likely a stub / future character not yet filled in).
    const nameResolved = resolveGameName(title, wikitext, side).name;
    const inSeed = seedIdByName.has(nameResolved);
    if (perks.length < 3 && !inSeed) {
      console.warn(
        `[RosterService] Skipping "${title}" — fewer than 3 perks and not in seed`,
      );
      continue;
    }

    characters.push(
      ...assembleCharacters(title, wikitext, side, entry, seedIdByName),
    );
  }

  return characters;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const RosterService = {
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
