import { computed } from "vue";
import { useSettingsStore } from "@/stores";
import type { ThemeId } from "@/types";

export function useTheme() {
  const settings = useSettingsStore();
  const themeIcon = computed(() => {
    const icons: Record<ThemeId, string> = {
      dark: "🌙",
      light: "☀️",
      oled: "⚫",
    };
    return icons[settings.theme] ?? "🌙";
  });
  return { themeIcon, cycleTheme: () => settings.cycleTheme() };
}
