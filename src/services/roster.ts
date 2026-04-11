import type { Character, WikiParseResponse } from '@/types';
import { Side } from '@/types';
import { StorageService, TTL } from './storage';
import { slugify } from '@/utils/format';

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_API = 'https://deadbydaylight.wiki.gg/api.php';
const CACHE_KEY = (side: Side) => `roster_${side}_v6`;

// ─── Name overrides ───────────────────────────────────────────────────────────

/**
 * Maps wiki charPortraitName link titles → { id, name } where the wiki title
 * differs from the in-game display name shown in character-select.
 * Keys are lowercased for case-insensitive lookup.
 */
const WIKI_TO_APP = new Map<string, { id: string; name: string }>([
  ['david tapp', { id: 'tapp', name: 'Detective Tapp' }],
  ['lee yun-jin', { id: 'yun', name: 'Yun-Jin Lee' }],
  ['leon scott kennedy', { id: 'leon', name: 'Leon S. Kennedy' }],
  ['michonne grimes', { id: 'michonne', name: 'Michonne' }],
  ['vee boonyasak', { id: 'vee', name: 'Vee' }],
]);

/**
 * Wiki page entries that cover multiple in-game characters.
 * All entries share the same portrait and perks.
 */
const SPLIT_PAGES: Record<string, Array<{ id: string; name: string }>> = {
  'The Troupe': [
    { id: 'aestri', name: 'Aestri Yazar' },
    { id: 'baermar', name: 'Baermar Uraz' },
  ],
};

// ─── ID derivation ────────────────────────────────────────────────────────────

const SURVIVOR_NAME_PREFIXES = new Set(['detective', 'dr', 'sir', 'lady']);

function deriveId(name: string, side: Side): string {
  if (side === Side.Killer) return slugify(name.replace(/^The\s+/i, ''));
  const parts = name.split(/\s+/);
  const first = slugify(parts[0]);
  return SURVIVOR_NAME_PREFIXES.has(first) && parts.length > 1
    ? slugify(parts[parts.length - 1])
    : first;
}

// ─── Wiki API ─────────────────────────────────────────────────────────────────

async function wikiQuery<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries({ format: 'json', origin: '*', ...params })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`wiki.gg HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Fetch and parse the rendered overview page ───────────────────────────────

async function fetchRosterHtml(side: Side): Promise<string> {
  const page = side === Side.Killer ? 'Killers' : 'Survivors';
  const data = await wikiQuery<WikiParseResponse>({
    action: 'parse',
    page,
    prop: 'text',
    disablelimitreport: '1',
    disableeditsection: '1',
  });
  return data.parse?.text?.['*'] ?? '';
}

const PORTRAIT_PATTERN = /^[KS]\d{2,3}_.*Portrait\.png$/i;

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
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const wrappers = doc.querySelectorAll('.charPortraitWrapper');
  const chars: Character[] = [];

  for (const wrapper of Array.from(wrappers)) {
    const imgEl = wrapper.querySelector('.charPortraitImage img');
    const src = imgEl?.getAttribute('src') ?? '';
    const portrait = src.replace(/^.*\/([^/?]+)(\?.*)?$/, '$1');
    if (!PORTRAIT_PATTERN.test(portrait)) continue;

    const nameLink = wrapper.querySelector('.charPortraitName a');
    const wikiName = nameLink?.getAttribute('title')?.trim() ?? '';
    if (!wikiName) continue;

    const perkLinks = Array.from(
      wrapper.querySelectorAll('.charPortraitPerk a[title]'),
    );
    const perks = perkLinks
      .map((a) => a.getAttribute('title')?.trim() ?? '')
      .filter(Boolean)
      .slice(0, 3);
    if (perks.length < 3) continue;

    const [perk1, perk2, perk3] = perks;
    if (!perk1 || !perk2 || !perk3) continue;
    const perkTuple: readonly [string, string, string] = [perk1, perk2, perk3];

    // Split pages (e.g. "The Troupe" → Aestri + Baermar)
    const splits = SPLIT_PAGES[wikiName];
    if (splits) {
      for (const { id, name } of splits) {
        chars.push({ id, name, role: '', img: portrait, perks: perkTuple });
      }
      continue;
    }

    const mapped = WIKI_TO_APP.get(wikiName.toLowerCase());
    const appName = mapped?.name ?? wikiName;
    const id = mapped?.id ?? seedIdByName.get(appName) ?? deriveId(appName, side);
    const isNew = !seedIdByName.has(appName) && !mapped;

    chars.push({
      id,
      name: appName,
      role: '',
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
   *  3. Static seed fallback (if wiki unreachable)
   */
  async load(side: Side, seed: readonly Character[]): Promise<Character[]> {
    const cacheKey = CACHE_KEY(side);

    const cached = StorageService.cacheFresh<Character[]>(cacheKey, TTL.CHARS);
    if (
      cached &&
      cached.length >= seed.length &&
      !cached.some((c) => c.img.includes('charSelect'))
    ) {
      return cached;
    }

    const seedIdByName = new Map<string, string>(seed.map((c) => [c.name, c.id]));
    const seedById = new Map<string, Character>(seed.map((c) => [c.id, { ...c }]));
    const result = new Map<string, Character>(seedById);

    try {
      const html = await fetchRosterHtml(side);
      const wikiChars = parseRosterHtml(html, side, seedIdByName);
      const minExpected = Math.ceil(seed.length * 0.8);

      if (wikiChars.length < minExpected) {
        console.warn(
          `[RosterService] Only parsed ${wikiChars.length} ${side}s from wiki, expected ≥${minExpected}`,
        );
      } else {
        for (const w of wikiChars) {
          const existing = result.get(w.id);
          if (existing) {
            result.set(w.id, {
              ...existing,
              img: w.img || existing.img,
              perks: w.perks,
            });
          } else {
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
      StorageService.cacheRemove(CACHE_KEY(Side.Killer));
      StorageService.cacheRemove(CACHE_KEY(Side.Survivor));
    }
  },
};
