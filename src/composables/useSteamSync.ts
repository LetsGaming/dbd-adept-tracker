import { useProgressStore, useSteamStore } from '@/stores';
import { StorageService } from '@/services';
import { showToast } from '@/composables';
import { SyncPhase } from '@/types';

const SYNC_SETTLE_MS = 5000;
const AUTO_SYNC_DELAY_MS = 1500;
const AUTO_SYNC_INTERVAL_MS = 5 * 60_000;

export function useSteamSync() {
  const store = useProgressStore();
  const steam = useSteamStore();

  async function doSync(): Promise<void> {
    if (!steam.hasCreds) {
      steam.setPhase(SyncPhase.Setup);
      return;
    }
    steam.setPhase(SyncPhase.Syncing);
    try {
      const adepts = await steam.fetchAdepts();
      const changed: Array<{ id: string; ts: number }> = [];

      for (const adept of adepts) {
        const dm = adept.displayName?.match(/^Adept\s+(.+)$/i);
        if (!dm) continue;

        const search = dm[1].trim().toLowerCase();
        const ch = store.allCharacters.find((c) => {
          const name = c.name.toLowerCase();
          const nameWithoutThe = name.replace(/^the\s+/, '');
          return (
            name === search ||
            nameWithoutThe === search ||
            name.startsWith(search + ' ') ||
            nameWithoutThe.startsWith(search + ' ')
          );
        });
        if (ch && !store.getProgress(ch.id).done) {
          changed.push({
            id: ch.id,
            ts: adept.unlocktime ? adept.unlocktime * 1000 : Date.now(),
          });
        }
      }

      if (changed.length) store.markDoneFromSteam(changed);
      steam.setPhase(SyncPhase.Done, `✅ ${changed.length} Adepts`);
    } catch (e) {
      steam.setPhase(SyncPhase.Error, `✗ ${(e as Error).message}`);
    }
    setTimeout(() => steam.setPhase(SyncPhase.Idle), SYNC_SETTLE_MS);
  }

  function doForceSync(): void {
    StorageService.cacheRemove('adept_schema_v3');
    doSync();
  }

  function startAutoSync(): void {
    if (!steam.hasCreds) return;
    setTimeout(() => doSync(), AUTO_SYNC_DELAY_MS);
    setInterval(() => doSync(), AUTO_SYNC_INTERVAL_MS);
  }

  return { doSync, doForceSync, startAutoSync };
}
