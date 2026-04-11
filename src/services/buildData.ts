import type { BuildOption } from '@/data/build-seed';
import type { WikiParseResponse } from '@/types';
import { StorageService, TTL } from './storage';

const WIKI_API = 'https://deadbydaylight.wiki.gg/api.php';
const CACHE_PREFIX = 'addons_';

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

/**
 * Parse add-on data from a character's wiki page HTML.
 * Add-ons are typically listed in tables with rarity info.
 * Falls back to extracting link titles from add-on sections.
 */
function parseAddonsFromHtml(html: string): BuildOption[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const addons: BuildOption[] = [];
  const seen = new Set<string>();

  // Strategy 1: Look for add-on tables (most common wiki format)
  const rows = doc.querySelectorAll(
    '.wikitable tr, .addonTable tr, table.sortable tr',
  );
  for (const row of Array.from(rows)) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) continue;

    // Find the cell with the add-on name (usually has a link)
    const nameLink = row.querySelector('td a[title]');
    const name = nameLink?.getAttribute('title')?.trim();
    if (!name || seen.has(name)) continue;

    // Try to detect rarity from class or cell content
    const rarity = detectRarity(row);
    seen.add(name);
    addons.push({ name, rarity, category: 'Add-on' });
  }

  // Strategy 2: If table parsing found nothing, look for add-on links
  // in sections that contain "Add-on" in their heading
  if (!addons.length) {
    const headings = doc.querySelectorAll('h2, h3');
    for (const h of Array.from(headings)) {
      if (!/add-?on/i.test(h.textContent ?? '')) continue;

      let sibling = h.nextElementSibling;
      while (sibling && !['H2', 'H3'].includes(sibling.tagName)) {
        const links = sibling.querySelectorAll('a[title]');
        for (const link of Array.from(links)) {
          const name = link.getAttribute('title')?.trim();
          if (name && !seen.has(name) && name.length > 2) {
            seen.add(name);
            addons.push({ name, rarity: 'common', category: 'Add-on' });
          }
        }
        sibling = sibling.nextElementSibling;
      }
    }
  }

  return addons;
}

const RARITY_PATTERNS: Array<[RegExp, BuildOption['rarity']]> = [
  [/ultra[\s-]?rare/i, 'ultra-rare'],
  [/very[\s-]?rare/i, 'very-rare'],
  [/\brare\b/i, 'rare'],
  [/uncommon/i, 'uncommon'],
  [/common/i, 'common'],
];

const RARITY_CSS_CLASSES: Record<string, BuildOption['rarity']> = {
  'rarity-common': 'common',
  'rarity-uncommon': 'uncommon',
  'rarity-rare': 'rare',
  'rarity-veryrare': 'very-rare',
  'rarity-ultrarare': 'ultra-rare',
};

function detectRarity(row: Element): BuildOption['rarity'] {
  const cls = row.className + ' ' + (row.querySelector('td')?.className ?? '');
  for (const [cssClass, rarity] of Object.entries(RARITY_CSS_CLASSES)) {
    if (cls.includes(cssClass)) return rarity;
  }
  const text = row.textContent ?? '';
  for (const [pattern, rarity] of RARITY_PATTERNS) {
    if (pattern.test(text)) return rarity;
  }
  return 'common';
}

async function fetchCharacterAddons(characterName: string): Promise<BuildOption[]> {
  try {
    // Try the character's main page first
    const pageName = characterName.replace(/ /g, '_');
    const data = await wikiQuery<WikiParseResponse>({
      action: 'parse',
      page: pageName,
      prop: 'text',
      disablelimitreport: '1',
      disableeditsection: '1',
    });

    const html = data.parse?.text?.['*'] ?? '';
    if (!html) return [];

    return parseAddonsFromHtml(html);
  } catch (e) {
    console.warn(`[BuildData] Failed to fetch addons for ${characterName}:`, e);
    return [];
  }
}

export const BuildDataService = {
  /**
   * Get add-ons for a specific character. Cached for 7 days.
   * Returns empty array if wiki is unreachable.
   */
  async getAddons(characterName: string): Promise<BuildOption[]> {
    const cacheKey = CACHE_PREFIX + characterName;
    const cached = StorageService.cacheFresh<BuildOption[]>(cacheKey, TTL.PERK);
    if (cached) return cached;

    if (inflight.has(characterName)) return inflight.get(characterName)!;

    const promise = fetchCharacterAddons(characterName).then((addons) => {
      if (addons.length) {
        StorageService.cacheSet(cacheKey, addons);
      }
      inflight.delete(characterName);
      return addons;
    });
    inflight.set(characterName, promise);
    return promise;
  },

  invalidate(characterName: string): void {
    StorageService.cacheRemove(CACHE_PREFIX + characterName);
  },
};
