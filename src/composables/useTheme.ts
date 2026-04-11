import { computed } from 'vue';
import { useSettingsStore } from '@/stores';
import { ThemeId } from '@/types';

const THEME_ICONS: Record<ThemeId, string> = {
  [ThemeId.Dark]: '🌙',
  [ThemeId.Light]: '☀️',
  [ThemeId.Oled]: '⚫',
};

export function useTheme() {
  const settings = useSettingsStore();
  const themeIcon = computed(() => THEME_ICONS[settings.theme] ?? '🌙');
  return { themeIcon, cycleTheme: () => settings.cycleTheme() };
}
