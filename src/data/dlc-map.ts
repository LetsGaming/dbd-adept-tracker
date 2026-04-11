/**
 * Maps Steam DLC app IDs → chapter "role" strings from seed data.
 * Used to match `rgOwnedApps` from Steam's dynamicstore/userdata
 * against characters in the tracker.
 *
 * Characters whose role is in FREE_ROLES are always considered owned
 * (base game / free DLC).
 */

export const FREE_ROLES: ReadonlySet<string> = new Set([
  "Original",
  "Lullaby for the Dark",
  "Left 4 Dead",
]);

export const DLC_APPID_TO_ROLE: Readonly<Record<number, string>> = {
  530711: "Halloween",
  554381: "Of Flesh and Mud",
  582600: "Spark of Madness",
  700280: "Leatherface",
  700282: "A Nightmare on Elm St.",
  750381: "Saw Chapter",
  799200: "Curtain Call",
  925750: "Shattered Bloodline",
  971790: "Darkness Among Us",
  1009820: "Demise of the Faithful",
  1009821: "Ash vs Evil Dead",
  1089270: "Ghost Face",
  1135280: "Stranger Things",
  1199880: "Cursed Legacy",
  1251000: "Chains of Hate",
  1324970: "Silent Hill",
  1408020: "Descend Beyond",
  1474030: "A Binding of Kin",
  1557310: "All-Kill",
  1634040: "Resident Evil",
  1734080: "Hellraiser",
  1763310: "Hour of the Witch",
  1804690: "Portrait of a Murder",
  1899750: "Sadako Rising",
  1985790: "Roots of Dread",
  2102730: "Project W",
  2198470: "Forged in Fog",
  2294610: "Tools of Torment",
  2399750: "End Transmission",
  2469400: "Nicolas Cage",
  2515990: "Alien",
  2656010: "Chucky Chapter",
  2661270: "Unknown Chapter",
  2661250: "Alan Wake",
  2958440: "Dungeons & Dragons",
  3024580: "Tomb Raider",
  3103150: "Castlevania",
  3261720: "Doomed Course",
  3448670: "Tokyo Ghoul",
  3698790: "Steady Pulse",
  3796620: "Five Nights at Freddy's",
  3884020: "The Walking Dead",
  4019590: "Sinister Grace",
  4318580: "Stranger Things Pt. 2",
};

export const ALL_DLC_APPIDS: readonly number[] = Object.keys(
  DLC_APPID_TO_ROLE,
).map(Number);
