import { defineStore } from "pinia";
import type { AppSettings, HotkeyMap, ThemeId } from "@/types";
import { DEFAULT_SETTINGS, DEFAULT_HOTKEYS } from "@/data";
import { StorageService } from "@/services/storage";

interface SettingsState {
  settings: AppSettings;
  theme: ThemeId;
}

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    settings: {
      ...DEFAULT_SETTINGS,
      ...(StorageService.get<AppSettings>("dbd_settings") ?? {}),
      hotkeys: {
        ...DEFAULT_HOTKEYS,
        ...(StorageService.get<AppSettings>("dbd_settings")?.hotkeys ?? {}),
      },
    },
    theme: (StorageService.getString("dbd_theme") as ThemeId) ?? "dark",
  }),

  actions: {
    _save(): void {
      StorageService.set("dbd_settings", this.settings);
    },

    setHotkey(action: keyof HotkeyMap, keys: string[]): void {
      this.settings.hotkeys[action] = keys;
      this._save();
    },

    resetHotkeys(): void {
      this.settings.hotkeys = { ...DEFAULT_HOTKEYS };
      this._save();
    },

    toggleVim(): void {
      this.settings.vimMode = !this.settings.vimMode;
      this._save();
    },

    setAutoTheme(enabled: boolean, light: string, dark: string): void {
      this.settings.autoTheme = enabled;
      this.settings.autoThemeLight = light;
      this.settings.autoThemeDark = dark;
      this._save();
    },

    setTheme(t: ThemeId): void {
      this.theme = t;
      StorageService.setString("dbd_theme", t);
      document.documentElement.setAttribute("data-theme", t);
    },

    cycleTheme(): void {
      const themes: ThemeId[] = ["dark", "light", "oled"];
      const idx = themes.indexOf(this.theme);
      this.setTheme(themes[(idx + 1) % themes.length]);
    },

    initTheme(): void {
      this.setTheme(this.theme);
      this._checkAutoTheme();
    },

    _checkAutoTheme(): void {
      if (!this.settings.autoTheme) return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const [lh, lm] = this.settings.autoThemeLight.split(":").map(Number);
      const [dh, dm] = this.settings.autoThemeDark.split(":").map(Number);
      const lightMins = lh * 60 + lm;
      const darkMins = dh * 60 + dm;
      const shouldBeLight =
        lightMins < darkMins
          ? mins >= lightMins && mins < darkMins
          : mins >= lightMins || mins < darkMins;
      const target: ThemeId = shouldBeLight ? "light" : "dark";
      if (this.theme !== target) this.setTheme(target);
    },
  },
});
