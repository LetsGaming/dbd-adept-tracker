import { StorageService, TTL } from "./storage";

const BASE = "https://deadbydaylight.fandom.com/api.php";

// In-memory singleton — survives tab switches, only one instance ever
let memCache: Map<string, string | null> | null = null;
let inflightBatch: Promise<void> | null = null;

async function query(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const u = new URL(BASE);
  for (const [k, v] of Object.entries({
    format: "json",
    origin: "*",
    ...params,
  })) {
    u.searchParams.set(k, v);
  }
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`Wiki HTTP ${r.status}`);
  return r.json() as Promise<Record<string, unknown>>;
}

function loadCache(): Map<string, string | null> {
  if (memCache) return memCache;
  const stored = StorageService.cacheFresh<Record<string, string | null>>(
    "portraits_v2",
    TTL.PORTRAIT,
  );
  memCache = stored ? new Map(Object.entries(stored)) : new Map();
  return memCache;
}

function saveCache(): void {
  if (memCache) {
    StorageService.cacheSet("portraits_v2", Object.fromEntries(memCache));
  }
}

export const WikiApi = {
  async fetchParsedHtml(
    pageTitle: string,
  ): Promise<{ html: string; found: boolean }> {
    const d = await query({
      action: "parse",
      page: pageTitle,
      prop: "text",
      disablelimitreport: "1",
      disableeditsection: "1",
    });
    if ((d as Record<string, unknown>).error) return { html: "", found: false };
    const html =
      (d as { parse?: { text?: { "*"?: string } } }).parse?.text?.["*"] ?? "";
    return { html, found: !!html };
  },

  async searchPage(q: string): Promise<string | null> {
    const d = await query({
      action: "query",
      list: "search",
      srsearch: q,
      srnamespace: "0",
      srlimit: "3",
    });
    const results =
      (d as { query?: { search?: Array<{ title: string }> } }).query?.search ??
      [];
    for (const r of results) {
      if (r.title.toLowerCase() === q.toLowerCase()) return r.title;
    }
    return results[0]?.title ?? null;
  },

  /** Prefetch all portraits in one go — call once at app startup */
  async prefetchAll(filenames: string[]): Promise<void> {
    const cache = loadCache();
    const todo = filenames.filter((f) => f && !cache.has(f));
    if (!todo.length) return;

    // Deduplicate: if already fetching, wait for that
    if (inflightBatch) {
      await inflightBatch;
      return;
    }

    inflightBatch = (async () => {
      for (let i = 0; i < todo.length; i += 50) {
        const batch = todo.slice(i, i + 50);
        try {
          const titles = batch.map((f) => `File:${f}`).join("|");
          const d = await query({
            action: "query",
            titles,
            prop: "imageinfo",
            iiprop: "url",
            iiurlwidth: "120",
          });
          const pages =
            (d as { query?: { pages?: Record<string, unknown> } }).query
              ?.pages ?? {};
          const byTitle = new Map<string, string | null>();

          for (const pg of Object.values(pages)) {
            const p = pg as {
              title?: string;
              imageinfo?: Array<{ thumburl?: string; url?: string }>;
            };
            const info = p.imageinfo?.[0];
            const url = info?.thumburl ?? info?.url ?? null;
            const title = (p.title ?? "").replace(/^File:\s*/i, "");
            byTitle.set(title, url);
            byTitle.set(title.replace(/ /g, "_"), url);
          }

          for (const f of batch) {
            if (!cache.has(f)) {
              cache.set(
                f,
                byTitle.get(f) ?? byTitle.get(f.replace(/_/g, " ")) ?? null,
              );
            }
          }
        } catch (e) {
          console.warn("Portrait batch error:", e);
          for (const f of batch) if (!cache.has(f)) cache.set(f, null);
        }
      }
      saveCache();
    })();

    await inflightBatch;
    inflightBatch = null;
  },

  getPortraitUrl(filename: string): string | null {
    return loadCache().get(filename) ?? null;
  },
};
