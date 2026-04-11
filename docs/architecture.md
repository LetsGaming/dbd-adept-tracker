# Architecture

## Stack

Vue 3 + TypeScript + Pinia + Ionic Vue + Tailwind CSS 4. Vite for bundling.

## Module Responsibilities

### `types/`
All TypeScript types, interfaces, and enums live here. Enums replace magic strings throughout: `TabId`, `PageId`, `ThemeId`, `FilterId`, `SyncPhase`, `WizardStep`, `SteamErrorType`, `UndoType`, etc.

### `stores/`
Pinia stores for global reactive state:
- **progress** — Character roster, progress map, undo stack, UI state (tab, page, filter, sort). Persisted to localStorage.
- **settings** — Theme, hotkeys, vim mode. Persisted to localStorage.
- **steam** — Steam API credentials, sync phase, available adept schema. Handles all Steam API calls through a Vite dev proxy.

### `services/`
Side-effect-heavy modules that don't need Vue reactivity:
- **storage** — localStorage wrapper with versioned cache and TTL.
- **wiki** — wiki.gg MediaWiki API client for perk data and portraits.
- **perk** — Perk description fetcher with HTML parsing and tier extraction.
- **roster** — Live character roster fetcher (merges wiki data over seed fallback).
- **statCard** — Canvas-based stat card PNG renderer (extracted from App.vue).

### `composables/`
Vue composables for shared reactive logic:
- **useTimer** — Per-character stopwatch with global timer registry.
- **useTheme** — Theme icon and cycle helper.
- **useSteamSync** — Steam sync orchestration (extracted from App.vue).
- **useExport** — JSON export/import, stat card, share link (extracted from App.vue).
- **usePerkColor** — Deterministic perk color assignment by name prefix.
- **useToast** — Ionic toast wrapper.

### `components/`
All components use Vue Options API for consistency.

**layout/** — App-level structure extracted from App.vue:
- `AppHeader` — Title, global progress bar, tab switcher.
- `AppSidebar` — Stats, actions, export, steam widget, read-only banner.
- `AppBottomNav` — Page navigation + settings gear.
- `SettingsModal` — Theme, vim mode, mobile export/steam.

**shared/** — Reusable UI primitives:
- `SteamCard` — Steam-styled wizard card with progress bar (used by SteamWidget and OwnershipImport).
- `WizardStepBar` — Progress dots reused across wizards.
- `SteamActionButton` — Small icon button for steam toolbar.
- `AppModal`, `Portrait`, `PerkButton`, `SearchBar`, `StatCard`, `SectionLabel`, `ExportActions`.

**character/** — `CharacterRow` + `ExpandedPanel`.  
**steam/** — `SteamWidget` + `OwnershipImport`.  
**modals/** — `PerkModal`.

### `views/`
Slim route views that compose components: `TrackerView`, `StatsView`, `TierListView`, `CompareView`.

### `utils/`
Pure functions: date formatting, string hashing, HTML escaping, slug generation, blob downloads.

### `data/`
Static seed data and constants. Seed is the fallback when wiki.gg is unreachable.

## Data Flow

1. App mounts → loads seed data synchronously → app is usable immediately.
2. `loadRoster()` fires in background → wiki.gg HTML parse → updates reactive `survivors`/`killers`.
3. Steam auto-sync (if creds saved) → fetches achievements → marks matching characters done.
4. All progress mutations go through the progress store → persisted to localStorage on every write.
