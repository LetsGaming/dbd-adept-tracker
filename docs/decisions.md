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
