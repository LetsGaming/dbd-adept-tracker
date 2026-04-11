# Decisions

## Options API everywhere
All components use Vue's Options API for consistency. The project mixes store access via computed properties and composables via setup() when reactive refs are needed (e.g., `useTimer`).

## Enums over string unions
TypeScript enums (`TabId`, `PageId`, `SyncPhase`, etc.) replace bare string literals. This catches typos at compile time and enables IDE autocompletion. Enum values match the original strings for localStorage backward compatibility.

## Extracted App.vue
The original App.vue was ~400 lines containing stat card canvas rendering, steam sync orchestration, export logic, and all layout markup. These were extracted to:
- `services/statCard.ts` — Canvas rendering (pure function, no Vue dependency).
- `composables/useSteamSync.ts` — Steam sync loop.
- `composables/useExport.ts` — JSON/stat card/share operations.
- `components/layout/*` — AppHeader, AppSidebar, AppBottomNav, SettingsModal.

App.vue is now ~120 lines: mount lifecycle + event routing.

## Reusable wizard components
`SteamCard` and `WizardStepBar` deduplicate the identical wizard chrome between `SteamWidget` and `OwnershipImport`. `SteamActionButton` replaces the repeated inline button styles in the connected-state toolbar.

## QoL: Auto-increment tries on done
Marking an adept as done (manually or via Steam sync) now ensures `tries >= 1`. You can't complete an adept with zero attempts. This also applies to `markDoneFromSteam` so imported achievements don't show "0×". The undo system captures the pre-mutation state, so undoing correctly restores the original try count.

## QoL: Average tries stat
`StatsView` summary cards now show "Ø Tries" (average tries per completed adept) instead of raw total tries. This is more actionable — it tells you how hard adepts are on average.

## QoL: Random pick scroll
After picking a random character, the app now scrolls to that character's row, so you don't have to hunt for it in a long list.

## Wiki cache key bug fix
`wiki.ts` saved portrait cache to key `portraits_v2` but read from `portraits_v3`, so the cache was write-only. Fixed to use a single `PORTRAIT_CACHE_KEY` constant.

## Typed Steam API responses
The original code cast Steam API responses through chains of `as Record<string, unknown>`. Added proper interfaces (`SteamPlayerStatsResponse`, `SteamSchemaResponse`, `WikiParseResponse`, etc.) so the compiler can catch structural mismatches.

## QoL: Undo window for unmarking
Unmarking a completed adept now shows a 5-second toast instead of silently undoing. This prevents accidental streak resets — the most destructive single-tap action in the app.

## QoL: Keyboard shortcuts (vim mode)
When vim mode is enabled in settings, the tracker view responds to j/k (navigate), x (toggle done), t (add try), r (remove try), p (toggle priority), Escape (deselect). Input fields are excluded. Implemented as a `useKeyboard` composable that registers/unregisters on mount/unmount.

## QoL: Difficulty rating
After marking an adept as done, a modal prompts for a 1-5 difficulty rating (Trivial → Nightmare). Ratings are stored per character, shown in the expanded panel and stats table, and averaged in the summary cards. Skippable — the prompt is non-blocking.

## QoL: Last played tracking
Every interaction (expand panel, add try, mark done) updates `lastPlayedAt` on the character's progress. This enables "sort by last played" in the stats table so you can resume where you left off.

## QoL: Playable filter
A new "🎮 Spielbar" filter in the search bar shows only characters that are owned, not done, and have an obtainable adept achievement — answering "what should I play next?" in one tap.

## QoL: Smart random pick
The random pick now avoids the last 8 picks (circular buffer in meta), weights priority characters 5x, and slightly deprioritizes characters with 10+ failed attempts. Falls back to the full pool if too many are filtered out.

## QoL: Auto-detected sessions
Play sessions are derived from attempt timestamps by clustering attempts within a 2-hour gap. The sidebar shows total session count. Each session tracks which characters were attempted, completed, and failed — no manual "start session" button needed.

## QoL: Milestone celebrations
Crossing 10%/25%/50%/75%/90%/100% completion triggers a celebratory toast. Streak milestones (3, 5, 10, 15, 20) also trigger special messages. Milestone state is consumed once to avoid duplicate toasts.

## QoL: Clipboard text export
A "📋 Text kopieren" button generates a Discord/Reddit-friendly plain text summary (progress, streak, avg tries, ETA) and copies it to clipboard.

## QoL: Build planner
The existing `Build` interface (item, addon1, addon2, offering) now has a UI in the expanded panel — four text inputs with debounced saves. Read-only view shows the build as a single line.

## QoL: OS theme detection
A new "System-Theme" toggle in settings uses `prefers-color-scheme` media query to auto-switch dark/light. Listens for OS theme changes in real time. Manually cycling the theme disables system mode.
