import type { BuildOption } from '@/data/build-seed';
import { SURVIVOR_ITEMS } from '@/data/build-seed';
import { StorageService, TTL } from './storage';

const WIKI_API = 'https://deadbydaylight.wiki.gg/api.php';
const CACHE_PREFIX = 'addons_v2_';

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

// ─── Section-based addon fetching ─────────────────────────────────────────────

interface WikiSection {
  index: string;
  toclevel: number;
  line: string;
  number: string;
}

interface WikiSectionsResponse {
  parse?: { sections?: WikiSection[] };
  error?: unknown;
}

interface WikiSectionHtmlResponse {
  parse?: { text?: { '*'?: string } };
  error?: unknown;
}

/**
 * Finds the "Add-ons" section index on a character's wiki page,
 * then fetches only that section's HTML and parses addon names + rarities.
 */
async function fetchKillerAddons(characterName: string): Promise<BuildOption[]> {
  // Step 1: Get page sections to find the "Add-ons" section index
  const sectionsData = await wikiQuery<WikiSectionsResponse>({
    action: 'parse',
    page: characterName,
    prop: 'sections',
  });

  if (sectionsData.error || !sectionsData.parse?.sections) return [];

  const addonSection = sectionsData.parse.sections.find(
    (s) => /^add[\s-]?ons?$/i.test(s.line),
  );
  if (!addonSection) return [];

  // Step 2: Fetch only the add-on section's rendered HTML
  const htmlData = await wikiQuery<WikiSectionHtmlResponse>({
    action: 'parse',
    page: characterName,
    prop: 'text',
    section: addonSection.index,
    disablelimitreport: '1',
    disableeditsection: '1',
  });

  const html = htmlData.parse?.text?.['*'] ?? '';
  if (!html) return [];

  return parseAddonSection(html);
}

/**
 * Parse add-on names and rarities from a wiki section's HTML.
 * Looks for .addonPortrait wrappers, .wikitable rows, or plain links.
 */
function parseAddonSection(html: string): BuildOption[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const addons: BuildOption[] = [];
  const seen = new Set<string>();

  // Strategy 1: .charPortraitWrapper / .addonPortrait style elements (wiki.gg uses these)
  const portraitLinks = doc.querySelectorAll(
    '.charPortraitWrapper a[title], .addonPortrait a[title], .inventoryItem a[title]',
  );
  for (const link of Array.from(portraitLinks)) {
    const name = link.getAttribute('title')?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    addons.push({ name, rarity: detectRarityFromElement(link), category: 'Add-on' });
  }

  // Strategy 2: Table rows with addon links
  if (!addons.length) {
    const rows = doc.querySelectorAll('table tr');
    for (const row of Array.from(rows)) {
      const link = row.querySelector('td a[title]');
      const name = link?.getAttribute('title')?.trim();
      if (!name || seen.has(name)) continue;
      // Skip navigation/meta links
      if (name.includes(':') || name.startsWith('File:')) continue;
      seen.add(name);
      addons.push({ name, rarity: detectRarityFromElement(row), category: 'Add-on' });
    }
  }

  // Strategy 3: Any remaining links in the section (last resort)
  if (!addons.length) {
    const links = doc.querySelectorAll('a[title]');
    for (const link of Array.from(links)) {
      const name = link.getAttribute('title')?.trim();
      if (!name || seen.has(name)) continue;
      if (name.includes(':') || name.startsWith('File:') || name.length < 3) continue;
      // Skip if it looks like a section/category link
      if (/^(Add-ons?|Power|Killer|Survivor|Category)/i.test(name)) continue;
      seen.add(name);
      addons.push({ name, rarity: detectRarityFromElement(link), category: 'Add-on' });
    }
  }

  return addons;
}

const RARITY_CSS: Array<[string, BuildOption['rarity']]> = [
  ['ultra', 'ultra-rare'],
  ['iridescent', 'ultra-rare'],
  ['very', 'very-rare'],
  ['purple', 'very-rare'],
  ['rare', 'rare'],
  ['green', 'rare'],
  ['uncommon', 'uncommon'],
  ['yellow', 'uncommon'],
  ['common', 'common'],
  ['brown', 'common'],
];

function detectRarityFromElement(el: Element): BuildOption['rarity'] {
  // Walk up to find rarity class or style
  let current: Element | null = el;
  for (let i = 0; i < 4 && current; i++) {
    const cls = current.className.toLowerCase();
    const style = (current.getAttribute('style') ?? '').toLowerCase();
    const combined = cls + ' ' + style;

    for (const [keyword, rarity] of RARITY_CSS) {
      if (combined.includes(keyword)) return rarity;
    }
    current = current.parentElement;
  }
  return 'common';
}

// ─── Survivor item add-ons ────────────────────────────────────────────────────

/**
 * For survivors, add-ons are per-item, not per-character.
 * Maps item categories to their wiki page for addon fetching.
 */
const ITEM_ADDON_PAGES: Record<string, string> = {
  Medkit: 'Med-Kit',
  Toolbox: 'Toolbox',
  Flashlight: 'Flashlight',
  Map: 'Map',
  Key: 'Key',
};

async function fetchItemAddons(itemName: string): Promise<BuildOption[]> {
  // Find the item category
  const item = SURVIVOR_ITEMS.find((i) => i.name === itemName);
  const category = item?.category;
  if (!category) return [];

  const pageName = ITEM_ADDON_PAGES[category];
  if (!pageName) return [];

  // Fetch the item page's add-on section
  const sectionsData = await wikiQuery<WikiSectionsResponse>({
    action: 'parse',
    page: pageName,
    prop: 'sections',
  });

  if (sectionsData.error || !sectionsData.parse?.sections) return [];

  const addonSection = sectionsData.parse.sections.find(
    (s) => /^add[\s-]?ons?$/i.test(s.line),
  );
  if (!addonSection) return [];

  const htmlData = await wikiQuery<WikiSectionHtmlResponse>({
    action: 'parse',
    page: pageName,
    prop: 'text',
    section: addonSection.index,
    disablelimitreport: '1',
    disableeditsection: '1',
  });

  const html = htmlData.parse?.text?.['*'] ?? '';
  return html ? parseAddonSection(html) : [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const BuildDataService = {
  /**
   * Get add-ons for a killer character. Cached for 7 days.
   */
  async getKillerAddons(characterName: string): Promise<BuildOption[]> {
    const cacheKey = CACHE_PREFIX + 'killer_' + characterName;
    const cached = StorageService.cacheFresh<BuildOption[]>(cacheKey, TTL.PERK);
    if (cached) return cached;

    if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

    const promise = fetchKillerAddons(characterName).then((addons) => {
      if (addons.length) StorageService.cacheSet(cacheKey, addons);
      inflight.delete(cacheKey);
      return addons;
    });
    inflight.set(cacheKey, promise);
    return promise;
  },

  /**
   * Get add-ons for a survivor's selected item. Cached for 7 days.
   */
  async getItemAddons(itemName: string): Promise<BuildOption[]> {
    if (!itemName) return [];
    const cacheKey = CACHE_PREFIX + 'item_' + itemName;
    const cached = StorageService.cacheFresh<BuildOption[]>(cacheKey, TTL.PERK);
    if (cached) return cached;

    if (inflight.has(cacheKey)) return inflight.get(cacheKey)!;

    const promise = fetchItemAddons(itemName).then((addons) => {
      if (addons.length) StorageService.cacheSet(cacheKey, addons);
      inflight.delete(cacheKey);
      return addons;
    });
    inflight.set(cacheKey, promise);
    return promise;
  },

  invalidate(key: string): void {
    StorageService.cacheRemove(CACHE_PREFIX + key);
  },
};
