import type { Character, Side } from "@/types";
import { StorageService, TTL } from "./storage";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_API = "https://deadbydaylight.wiki.gg/api.php";
const CACHE_KEY = (side: Side) => `roster_${side}_v5`;

const CATEGORY_CANDIDATES: Record<Side, string[]> = {
  survivor: ["Survivors", "Survivor", "Survivor characters"],
  killer: ["Killers", "Killer", "Killer characters"],
};

// ─── Name normalisation ───────────────────────────────────────────────────────

const WIKI_TO_APP = new Map<string, { id: string; name: string }>([
  // Killers whose DISPLAYTITLE uses {{#Invoke}} (can't be parsed statically)
  ["vecna", { id: "lich", name: "The Lich" }],
  ["dracula", { id: "darklord", name: "The Dark Lord" }],

  // Survivors: wiki canonical title → in-game display name
  ["ashley j. williams", { id: "ash", name: "Ash Williams" }],
  ["detective david tapp", { id: "tapp", name: "Detective Tapp" }],
  ['jeffrey "jeff" johansen', { id: "jeff", name: "Jeff Johansen" }],
  ['william "bill" overbeck', { id: "bill", name: "Bill Overbeck" }],
  ["lee yun-jin", { id: "yun", name: "Yun-Jin Lee" }],
  ["leon scott kennedy", { id: "leon", name: "Leon S. Kennedy" }],
  ["michonne grimes", { id: "michonne", name: "Michonne" }],
  ["vee boonyasak", { id: "vee", name: "Vee" }],
  ["aestri yazar & baermar uraz", { id: "aestri", name: "Aestri Yazar" }],
]);

const SPLIT_PAGES: Record<string, Array<{ id: string; name: string }>> = {
  "Aestri Yazar & Baermar Uraz": [
    { id: "aestri", name: "Aestri Yazar" },
    { id: "baermar", name: "Baermar Uraz" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function deriveId(gameName: string, side: Side): string {
  if (side === "killer") return slug(gameName.replace(/^The\s+/i, ""));
  const PREFIXES = new Set(["detective", "dr", "sir", "lady"]);
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
    } catch {
      /* try next */
    }
  }
  return [];
}

// ─── Wikitext fetch ───────────────────────────────────────────────────────────

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
                slots?: { main?: { "*"?: string } };
                "*"?: string;
              }>;
            }
          >;
        };
      };
      for (const page of Object.values(data.query?.pages ?? {})) {
        if (!page.title) continue;
        const rev = page.revisions?.[0];
        const text = rev?.slots?.main?.["*"] ?? rev?.["*"] ?? "";
        if (text) result.set(page.title, text);
      }
    } catch {
      /* skip batch */
    }
  }
  return result;
}

function extractDisplayTitle(wikitext: string, side: Side): string | null {
  const m = wikitext.match(/\{\{DISPLAYTITLE\s*:\s*([^}]+)\}\}/i);
  if (!m) return null;
  const raw = m[1].trim();
  if (raw.includes("{{")) return null;

  if (side === "killer") {
    const dashIdx = raw.search(/\s[—–-]\s/);
    if (dashIdx === -1) return null;
    const alias = raw
      .slice(dashIdx)
      .replace(/^\s*[—–-]\s*/, "")
      .trim();
    return alias || null;
  }
  return raw || null;
}

function resolveGameName(
  wikiTitle: string,
  wikitext: string,
  side: Side,
): { id: string; name: string } {
  const mapped = WIKI_TO_APP.get(wikiTitle.toLowerCase());
  if (mapped) return mapped;

  const dt = extractDisplayTitle(wikitext, side);
  if (dt) return { id: deriveId(dt, side), name: dt };

  if (side === "killer" && /^The\s+\w/i.test(wikiTitle)) {
    return { id: deriveId(wikiTitle, side), name: wikiTitle };
  }

  return { id: deriveId(wikiTitle, side), name: wikiTitle };
}

// ─── Role extraction ──────────────────────────────────────────────────────────

function extractRole(wikitext: string): string {
  const m = wikitext.match(
    /\[\[(?:CHAPTER[^|]+\|)?([^\]]+)\]\],?\s*a\s+(?:Chapter|Half-Chapter)/i,
  );
  return m ? m[1].trim() : "";
}

// ─── Fetch from wiki ──────────────────────────────────────────────────────────

interface WikiCharData {
  id: string;
  name: string;
  role: string;
  isNew: boolean;
}

async function fetchFromWiki(
  side: Side,
  seedIdByName: Map<string, string>,
): Promise<WikiCharData[]> {
  const pageTitles = await discoverCategoryPages(side);
  if (!pageTitles.length)
    throw new Error(`No category pages found for ${side}`);

  const wikitexts = await fetchWikitexts(pageTitles);
  const results: WikiCharData[] = [];

  for (const wikiTitle of pageTitles) {
    const wikitext = wikitexts.get(wikiTitle) ?? "";
    if (!/#Invoke\s*:\s*(Killers|Survivors)\s*\|/i.test(wikitext)) continue;

    const splits = SPLIT_PAGES[wikiTitle];
    if (splits) {
      const role = extractRole(wikitext);
      for (const { id, name } of splits) {
        results.push({ id, name, role, isNew: !seedIdByName.has(name) });
      }
      continue;
    }

    const { id: resolvedId, name } = resolveGameName(wikiTitle, wikitext, side);
    const id = seedIdByName.get(name) ?? resolvedId;
    const role = extractRole(wikitext);
    results.push({ id, name, role, isNew: !seedIdByName.has(name) });
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const RosterService = {
  /**
   * Returns the complete character roster for the given side.
   *
   * Seed is always the immutable baseline — no character is ever dropped.
   * Wiki data updates name/role for known characters and appends new ones.
   * Portraits and perks always come from the seed (reliable, correct format).
   * New characters from wiki appear with empty perks until the seed is updated.
   */
  async load(side: Side, seed: readonly Character[]): Promise<Character[]> {
    const cacheKey = CACHE_KEY(side);

    const cached = StorageService.cacheFresh<Character[]>(cacheKey, TTL.CHARS);
    // Reject cache entries that still use the old charSelect_portrait filename format
    const cacheIsClean =
      cached &&
      cached.length >= seed.length &&
      !cached.some((c) => c.img.includes("charSelect"));
    if (cacheIsClean) return cached!;

    const seedIdByName = new Map<string, string>(
      seed.map((c) => [c.name, c.id]),
    );
    const result = new Map<string, Character>(
      seed.map((c) => [c.id, { ...c }]),
    );

    try {
      const wikiData = await fetchFromWiki(side, seedIdByName);

      for (const w of wikiData) {
        const existing = result.get(w.id);
        if (existing) {
          // Update display name and role from wiki; keep seed portrait and perks
          result.set(w.id, {
            ...existing,
            name: w.name || existing.name,
            role: w.role || existing.role,
            // img and perks intentionally kept from seed
          });
        } else {
          // New character — no portrait or perks yet (emoji placeholder shown)
          result.set(w.id, {
            id: w.id,
            name: w.name,
            role: w.role,
            img: "",
            perks: [] as unknown as readonly [string, string, string],
            isNew: true,
          });
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
