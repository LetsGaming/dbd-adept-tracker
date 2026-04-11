import { useProgressStore } from '@/stores';
import { renderStatCard } from '@/services';
import { showToast } from '@/composables';
import { downloadBlob } from '@/utils/format';
import type { ProgressMap } from '@/types';

export function useExport() {
  const store = useProgressStore();

  function exportJSON(): void {
    const data = {
      progress: store.progress,
      meta: store.meta,
      version: 2,
      exportedAt: new Date().toISOString(),
    };
    downloadBlob(
      JSON.stringify(data, null, 2),
      'application/json',
      `dbd-adept-${new Date().toISOString().slice(0, 10)}.json`,
    );
    showToast('📦 Export gespeichert');
  }

  function importJSON(): void {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files![0].text()) as {
          progress?: Record<string, unknown>;
        };
        if (!data.progress) throw new Error('Ungültig');
        if (!confirm('Importieren?')) return;
        store.progress = data.progress as ProgressMap;
        store._saveProgress();
        await showToast('✅ Import erfolgreich');
      } catch (e) {
        await showToast(`✗ ${(e as Error).message}`);
      }
    };
    inp.click();
  }

  function exportStatCard(): void {
    renderStatCard({
      survivors: store.survivors,
      killers: store.killers,
      survivorsDone: store.survivorsDone,
      killersDone: store.killersDone,
      totalDone: store.totalDone,
      totalCount: store.totalCount,
      totalPercent: store.totalPercent,
      streak: store.meta.streak,
      bestStreak: store.meta.bestStreak,
      estimatedCompletion: store.estimatedCompletion,
      getProgress: (id: string) => store.getProgress(id),
    });
    showToast('📊 Stat Card gespeichert');
  }

  async function shareLink(): Promise<void> {
    try {
      const encoded = store.generateShareData();
      const url = location.href.split('#')[0] + '#share=' + encoded;
      await navigator.clipboard?.writeText(url);
      await showToast('🔗 Link kopiert');
    } catch {
      await showToast('✗ Fehler');
    }
  }

  return { exportJSON, importJSON, exportStatCard, shareLink };
}
