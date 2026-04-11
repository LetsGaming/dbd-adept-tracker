import type { BuildOption } from '@/data/build-seed';
import { SURVIVOR_ITEMS } from '@/data/build-seed';
import { StorageService, TTL } from './storage';

const WIKI_API = 'https://deadbydaylight.wiki.gg/api.php';
const CACHE_PREFIX = 'addons_v3_';

const inflight = new Map<string, Promise<BuildOption[]>>();

async function wikiQuery<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries({ format: 'json', origin: '*', ...params })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`wiki.gg HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WikiSection {
  index: string;
  toclevel: number;
  line: string;
}

interface WikiSectionsResponse {
  parse?: { sections?: WikiSection[] };
  error?: unknown;
}

interface WikiTextResponse {
  parse?: { text?: { '*'?: string } };
  error?: unknown;
}

// ─── Section finding ──────────────────────────────────────────────────────────

/**
 * Matches any section whose title contains "add-on" (case-insensitive).
 * Handles: "Add-ons", "Bear Trap Add-ons", "Power Add-Ons",
 * "Available Add-ons", "Med-Kit Add-ons", etc.
 */
const ADDON_SECTION_PATTERN = /add[\s-]?ons?/i;

/** Blacklist of section names that match the pattern but aren't addon lists. */
const SECTION_BLACKLIST = /changelog|history|patch|trivia/i;

function findAddonSection(sections: WikiSection[]): WikiSection | undefined {
  return sections.find(
    (s) => ADDON_SECTION_PATTERN.test(s.line) && !SECTION_BLACKLIST.test(s.line),
  );
}

// ─── HTML parsing ─────────────────────────────────────────────────────────────

/**
 * Parse add-on names and rarities from wiki HTML.
 * Tries multiple strategies since wiki formatting varies.
 */
function parseAddonsFromHtml(html: string): BuildOption[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const addons: BuildOption[] = [];
  const seen = new Set<string>();

  // Collect all candidate links, then filter
  const allLinks = doc.querySelectorAll('a[title]');
  for (const link of Array.from(allLinks)) {
    const name = link.getAttribute('title')?.trim();
    if (!name || seen.has(name)) continue;

    // Skip meta/navigation links
    if (name.includes(':')) continue;                    // "Category:...", "File:..."
    if (name.startsWith('Dead by Daylight')) continue;   // Main page link
    if (/^(Killers?|Survivors?|Perks?|Powers?)$/i.test(name)) continue;
    if (name.length < 3) continue;

    // Skip if the link text is just a number or single char
    const text = link.textContent?.trim() ?? '';
    if (text.length < 2) continue;

    seen.add(name);
    addons.push({
      name,
      rarity: detectRarityFromElement(link),
      category: 'Add-on',
    });
  }

  return addons;
}

const RARITY_KEYWORDS: Array<[string, BuildOption['rarity']]> = [
  ['ultra', 'ultra-rare'],
  ['iridescent', 'ultra-rare'],
  ['veryrare', 'very-rare'],
  ['very-rare', 'very-rare'],
  ['very_rare', 'very-rare'],
  ['purple', 'very-rare'],
  ['rare', 'rare'],
  ['green', 'rare'],
  ['uncommon', 'uncommon'],
  ['yellow', 'uncommon'],
  ['common', 'common'],
  ['brown', 'common'],
];

function detectRarityFromElement(el: Element): BuildOption['rarity'] {
  let current: Element | null = el;
  for (let depth = 0; depth < 5 && current; depth++) {
    const haystack = (
      current.className + ' ' +
      (current.getAttribute('style') ?? '') + ' ' +
      (current.getAttribute('data-rarity') ?? '')
    ).toLowerCase();

    for (const [keyword, rarity] of RARITY_KEYWORDS) {
      if (haystack.includes(keyword)) return rarity;
    }
    current = current.parentElement;
  }
  return 'common';
}

// ─── Fetching strategies ──────────────────────────────────────────────────────

/**
 * Strategy 1: Find the add-on section on the page, fetch only that section.
 * This is the most reliable when it works.
 */
async function fetchViaSection(pageName: string): Promise<BuildOption[]> {
  const sectionsData = await wikiQuery<WikiSectionsResponse>({
    action: 'parse',
    page: pageName,
    prop: 'sections',
  });

  if (sectionsData.error || !sectionsData.parse?.sections) return [];

  const section = findAddonSection(sectionsData.parse.sections);
  if (!section) return [];

  const htmlData = await wikiQuery<WikiTextResponse>({
    action: 'parse',
    page: pageName,
    prop: 'text',
    section: section.index,
    disablelimitreport: '1',
    disableeditsection: '1',
  });

  const html = htmlData.parse?.text?.['*'] ?? '';
  return html ? parseAddonsFromHtml(html) : [];
}

/**
 * Strategy 2: Fetch the full page and look for addon content.
 * Fallback when section detection fails.
 * Scans the entire page but filters more aggressively.
 */
async function fetchViaFullPage(pageName: string): Promise<BuildOption[]> {
  const data = await wikiQuery<WikiTextResponse>({
    action: 'parse',
    page: pageName,
    prop: 'text',
    disablelimitreport: '1',
    disableeditsection: '1',
  });

  const html = data.parse?.text?.['*'] ?? '';
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const addons: BuildOption[] = [];
  const seen = new Set<string>();

  // Find all headings that mention "add-on", then collect links until the next heading
  const allElements = doc.querySelectorAll('h1, h2, h3, h4, a[title]');
  let inAddonSection = false;

  for (const el of Array.from(allElements)) {
    if (/^H[1-4]$/.test(el.tagName)) {
      inAddonSection = ADDON_SECTION_PATTERN.test(el.textContent ?? '');
      continue;
    }

    if (!inAddonSection) continue;

    const name = el.getAttribute('title')?.trim();
    if (!name || seen.has(name)) continue;
    if (name.includes(':') || name.length < 3) continue;
    if (/^(Killers?|Survivors?|Perks?|Powers?)$/i.test(name)) continue;

    seen.add(name);
    addons.push({
      name,
      rarity: detectRarityFromElement(el),
      category: 'Add-on',
    });
  }

  return addons;
}

/**
 * Try both strategies in order. Returns the first non-empty result.
 */
async function fetchAddonsForPage(pageName: string): Promise<BuildOption[]> {
  try {
    // Strategy 1: section-based (precise)
    const sectionResult = await fetchViaSection(pageName);
    if (sectionResult.length) return sectionResult;

    // Strategy 2: full page scan (broader)
    return await fetchViaFullPage(pageName);
  } catch (e) {
    console.warn(`[BuildData] Failed to fetch addons from "${pageName}":`, e);
    return [];
  }
}

// ─── Survivor item add-ons ────────────────────────────────────────────────────

const ITEM_ADDON_PAGES: Record<string, string> = {
  Medkit: 'Med-Kit',
  Toolbox: 'Toolbox',
  Flashlight: 'Flashlight',
  Map: 'Map',
  Key: 'Key',
};

// ─── Public API ───────────────────────────────────────────────────────────────

function cachedFetch(cacheKey: string, fetcher: () => Promise<BuildOption[]>): Promise<BuildOption[]> {
  const fullKey = CACHE_PREFIX + cacheKey;
  const cached = StorageService.cacheFresh<BuildOption[]>(fullKey, TTL.PERK);
  if (cached) return Promise.resolve(cached);

  if (inflight.has(fullKey)) return inflight.get(fullKey)!;

  const promise = fetcher().then((addons) => {
    if (addons.length) StorageService.cacheSet(fullKey, addons);
    inflight.delete(fullKey);
    return addons;
  });
  inflight.set(fullKey, promise);
  return promise;
}

export const BuildDataService = {
  /** Get add-ons for a killer character. Cached for 7 days. */
  getKillerAddons(characterName: string): Promise<BuildOption[]> {
    return cachedFetch('killer_' + characterName, () =>
      fetchAddonsForPage(characterName),
    );
  },

  /** Get add-ons for a survivor's selected item. Cached for 7 days. */
  getItemAddons(itemName: string): Promise<BuildOption[]> {
    if (!itemName) return Promise.resolve([]);
    const item = SURVIVOR_ITEMS.find((i) => i.name === itemName);
    const pageName = item?.category ? ITEM_ADDON_PAGES[item.category] : undefined;
    if (!pageName) return Promise.resolve([]);

    return cachedFetch('item_' + pageName, () =>
      fetchAddonsForPage(pageName),
    );
  },

  invalidate(key: string): void {
    StorageService.cacheRemove(CACHE_PREFIX + key);
  },
};
