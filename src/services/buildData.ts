import type { BuildOption } from '@/data/build-seed';
import { SURVIVOR_ITEMS } from '@/data/build-seed';
import { StorageService, TTL } from './storage';

const WIKI_API = 'https://deadbydaylight.wiki.gg/api.php';
const CACHE_PREFIX = 'addons_v4_';

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

// ─── Redirect resolution ──────────────────────────────────────────────────────

/**
 * Some character pages (e.g. "The Hag") are wiki redirects (→ "Lisa Sherwood").
 * The sections API returns [] for redirects.
 * Detect this and resolve the actual page title.
 */
async function resolveRedirect(pageName: string): Promise<string> {
  const data = await wikiQuery<WikiTextResponse>({
    action: 'parse',
    page: pageName,
    prop: 'text',
    disablelimitreport: '1',
    disableeditsection: '1',
  });

  const html = data.parse?.text?.['*'] ?? '';
  // Wiki redirects have a specific HTML structure: <div class="redirectMsg">...<a href="/wiki/Target" title="Target">
  const redirectMatch = html.match(/class="redirectMsg"[\s\S]*?<a[^>]+title="([^"]+)"/);
  return redirectMatch?.[1] ?? pageName;
}

// ─── Section finding ──────────────────────────────────────────────────────────

/** Matches any section whose title contains "add-on" (case-insensitive). */
const ADDON_SECTION_PATTERN = /add[\s-]?ons?/i;

function findAddonSection(sections: WikiSection[]): WikiSection | undefined {
  return sections.find((s) => ADDON_SECTION_PATTERN.test(s.line));
}

// ─── HTML parsing ─────────────────────────────────────────────────────────────

/**
 * Rarity CSS class → BuildOption rarity mapping.
 * The wiki uses classes like "common-item-element", "very-rare-item-element", "visceral-item-element".
 */
const RARITY_CLASS_MAP: Array<[string, BuildOption['rarity']]> = [
  ['visceral-item', 'ultra-rare'],   // Iridescent addons
  ['ultra-rare-item', 'ultra-rare'],
  ['very-rare-item', 'very-rare'],
  ['rare-item', 'rare'],
  ['uncommon-item', 'uncommon'],
  ['common-item', 'common'],
];

function detectRarityFromRow(row: Element): BuildOption['rarity'] {
  // The rarity class is on a div inside the first <th> (the icon cell)
  const firstTh = row.querySelector('th');
  if (!firstTh) return 'common';

  const allClasses = firstTh.innerHTML;
  for (const [pattern, rarity] of RARITY_CLASS_MAP) {
    if (allClasses.includes(pattern)) return rarity;
  }
  return 'common';
}

/**
 * Parse addon names from the wiki's addon table structure.
 *
 * Each addon row looks like:
 *   <tr>
 *     <th>...(icon with rarity class)...</th>
 *     <th><a title="Addon Name">Addon Name</a></th>
 *     <td>...(description)...</td>
 *   </tr>
 *
 * We specifically read the <a title="..."> inside the SECOND <th> of each row.
 * This avoids picking up game mechanic links (Aura, Blindness, etc.) from descriptions.
 */
function parseAddonTable(html: string): BuildOption[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const addons: BuildOption[] = [];
  const seen = new Set<string>();

  const rows = doc.querySelectorAll('table tr');
  for (const row of Array.from(rows)) {
    const thCells = row.querySelectorAll('th');
    // Addon rows have 2 <th> (icon + name) and 1 <td> (description)
    if (thCells.length < 2) continue;

    // The name is in the second <th>
    const nameCell = thCells[1];
    const link = nameCell.querySelector('a[title]');
    const name = link?.getAttribute('title')?.trim();

    if (!name || seen.has(name)) continue;
    seen.add(name);

    const rarity = detectRarityFromRow(row);
    addons.push({ name, rarity, category: 'Add-on' });
  }

  return addons;
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

async function fetchAddonsForPage(pageName: string): Promise<BuildOption[]> {
  try {
    // Step 1: Get sections
    let sectionsData = await wikiQuery<WikiSectionsResponse>({
      action: 'parse',
      page: pageName,
      prop: 'sections',
    });

    if (sectionsData.error) return [];

    // Step 2: If sections is empty, page might be a redirect — resolve it
    let resolvedPage = pageName;
    if (!sectionsData.parse?.sections?.length) {
      resolvedPage = await resolveRedirect(pageName);
      if (resolvedPage === pageName) return []; // Not a redirect, genuinely empty

      sectionsData = await wikiQuery<WikiSectionsResponse>({
        action: 'parse',
        page: resolvedPage,
        prop: 'sections',
      });

      if (sectionsData.error || !sectionsData.parse?.sections?.length) return [];
    }

    // Step 3: Find the add-on section
    const section = findAddonSection(sectionsData.parse!.sections!);
    if (!section) return [];

    // Step 4: Fetch only that section's HTML
    const htmlData = await wikiQuery<WikiTextResponse>({
      action: 'parse',
      page: resolvedPage,
      prop: 'text',
      section: section.index,
      disablelimitreport: '1',
      disableeditsection: '1',
    });

    const html = htmlData.parse?.text?.['*'] ?? '';
    if (!html) return [];

    return parseAddonTable(html);
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

function cachedFetch(
  cacheKey: string,
  fetcher: () => Promise<BuildOption[]>,
): Promise<BuildOption[]> {
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
