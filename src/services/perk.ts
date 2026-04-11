import type { PerkData, Character } from '@/types';
import { StorageService, TTL } from './storage';
import { WikiApi } from './wiki';
import { escapeHtml } from '@/utils/format';

const inflight = new Map<string, Promise<PerkData>>();

function parseHtml(html: string): { desc: string; quote: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let desc = '';
  let quote = '';

  function cleanNode(clone: Element): string {
    for (const q of clone.querySelectorAll(
      '.luaClr.clr9, span[style*="e7cda2"]',
    )) {
      if (!quote) {
        quote =
          q.textContent
            ?.trim()
            .replace(/^[""\u201C]+/, '')
            .replace(/[""\u201D]+$/, '')
            .replace(/\s*[—–-]\s*\(.*$/, '')
            .replace(/\s*[—–-]\s*[^—–-]*$/, '') ?? '';
      }
      (q.closest('p') ?? q.closest('i') ?? q).remove();
    }
    for (const w of clone.querySelectorAll(
      '.dynamicTitle, .clr8, span[style*="d41c1c"]',
    )) {
      (w.closest('.dynamicTitle') ?? w.closest('div') ?? w).remove();
    }
    for (const el of clone.querySelectorAll(
      '.iconLink, .tooltip, .mobileView, .pcView, video, .gallery, figure',
    )) {
      el.remove();
    }
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  const selectors = [
    '.perkDesc .dynamicContent',
    '.perkDesc.divTableCell',
    '.perkDesc',
    '.mw-parser-output > p',
  ];
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (el) {
      desc = cleanNode(el.cloneNode(true) as Element);
      if (desc.length > 30) break;
    }
  }

  if (desc.length < 30) {
    for (const p of doc.querySelectorAll('p')) {
      if ((p.textContent?.trim().length ?? 0) > 80) {
        desc = cleanNode(p.cloneNode(true) as Element);
        break;
      }
    }
  }

  return { desc, quote };
}

function extractTiers(text: string): {
  description: string;
  tunables: string[][];
} {
  const tunables: string[][] = [];
  const seen = new Map<string, string>();
  for (const m of text.matchAll(/\b([\d.]+)\/([\d.]+)\/([\d.]+)\b/g)) {
    if (!seen.has(m[0])) {
      seen.set(m[0], `{${tunables.length}}`);
      tunables.push([m[1], m[2], m[3]]);
    }
  }
  let description = text;
  for (const [o, p] of seen) description = description.split(o).join(p);
  return { description, tunables };
}

async function fetchPerk(name: string): Promise<PerkData> {
  try {
    let result = await WikiApi.fetchParsedHtml(name);
    if (!result.found) result = await WikiApi.fetchParsedHtml(name + ' (Perk)');
    if (!result.found) {
      const real = await WikiApi.searchPage(name + ' Dead by Daylight perk');
      if (real) result = await WikiApi.fetchParsedHtml(real);
    }
    if (!result.found) {
      return {
        desc: `Wiki-Seite nicht gefunden ("${escapeHtml(name)}")`,
        tunables: [],
        quote: '',
      };
    }

    const { desc: rawDesc, quote } = parseHtml(result.html);
    if (!rawDesc || rawDesc.length < 30) {
      return {
        desc: `Beschreibung nicht extrahierbar ("${escapeHtml(name)}")`,
        tunables: [],
        quote: '',
      };
    }

    const { description, tunables } = extractTiers(rawDesc);
    return { desc: description, tunables, quote, fetchedAt: Date.now() };
  } catch {
    return { desc: `Netzwerkfehler ("${escapeHtml(name)}")`, tunables: [], quote: '' };
  }
}

export const PerkService = {
  async get(name: string): Promise<PerkData> {
    const cached = StorageService.cacheFresh<PerkData>(
      `perk:${name}`,
      TTL.PERK,
    );
    if (cached) return cached;
    if (inflight.has(name)) return inflight.get(name)!;

    const p = fetchPerk(name).then((data) => {
      StorageService.cacheSet(`perk:${name}`, data);
      inflight.delete(name);
      return data;
    });
    inflight.set(name, p);
    return p;
  },

  invalidate(name: string): void {
    StorageService.cacheRemove(`perk:${name}`);
  },

  async prefetch(chars: readonly Character[]): Promise<void> {
    const perks = [...new Set(chars.flatMap((c) => c.perks))].filter(
      (n) => !StorageService.cacheFresh<PerkData>(`perk:${n}`, TTL.PERK),
    );
    for (let i = 0; i < perks.length; i += 4) {
      await Promise.allSettled(perks.slice(i, i + 4).map((n) => this.get(n)));
      if (i + 4 < perks.length) await new Promise((r) => setTimeout(r, 300));
    }
  },
};
