import { onMounted, onBeforeUnmount } from 'vue';
import { useProgressStore, useSettingsStore } from '@/stores';

/**
 * Keyboard shortcuts for the tracker view (vim mode).
 * j/k = navigate, x = toggle done, t = add try, r = remove try,
 * p = toggle priority, Enter = expand/collapse.
 */
export function useKeyboard() {
  const store = useProgressStore();
  const settings = useSettingsStore();

  function getVisibleIndex(): number {
    if (!store.activeId) return -1;
    return store.filteredCharacters.findIndex((c) => c.id === store.activeId);
  }

  function selectByIndex(idx: number): void {
    const chars = store.filteredCharacters;
    if (idx < 0 || idx >= chars.length) return;
    store.activeId = chars[idx].id;
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-char-id="${chars[idx].id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!settings.settings.vimMode) return;
    // Don't intercept when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const chars = store.filteredCharacters;
    if (!chars.length) return;

    switch (e.key) {
      case 'j': {
        e.preventDefault();
        const idx = getVisibleIndex();
        selectByIndex(idx < 0 ? 0 : Math.min(idx + 1, chars.length - 1));
        break;
      }
      case 'k': {
        e.preventDefault();
        const idx = getVisibleIndex();
        selectByIndex(idx <= 0 ? 0 : idx - 1);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (store.activeId) {
          // Toggle expand: if already active it stays active (just scrolled to)
        } else {
          selectByIndex(0);
        }
        break;
      }
      case 'x': {
        e.preventDefault();
        if (store.activeId) store.toggleDone(store.activeId);
        break;
      }
      case 't': {
        e.preventDefault();
        if (store.activeId) store.addTry(store.activeId, 1);
        break;
      }
      case 'r': {
        e.preventDefault();
        if (store.activeId) store.addTry(store.activeId, -1);
        break;
      }
      case 'p': {
        e.preventDefault();
        if (store.activeId) store.togglePriority(store.activeId);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        store.activeId = null;
        break;
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeyDown));
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown));
}
