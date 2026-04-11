/**
 * Static item and offering data for the build planner.
 * Items are survivor-only. Offerings are shared.
 * Add-ons are per-character and fetched from the wiki dynamically.
 *
 * Rarity is used for color-coding in the UI.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'very-rare' | 'ultra-rare' | 'event';

export interface BuildOption {
  name: string;
  rarity: Rarity;
  category?: string;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#b8966c',
  uncommon: '#e8c252',
  rare: '#3ddc4c',
  'very-rare': '#a34bfc',
  'ultra-rare': '#ff3868',
  event: '#ff8c00',
};

export const SURVIVOR_ITEMS: BuildOption[] = [
  // ── Medkits ──
  { name: 'Camping Aid Kit', rarity: 'uncommon', category: 'Medkit' },
  { name: 'Emergency Med-Kit', rarity: 'uncommon', category: 'Medkit' },
  { name: 'First Aid Kit', rarity: 'rare', category: 'Medkit' },
  { name: 'Ranger Med-Kit', rarity: 'very-rare', category: 'Medkit' },
  // ── Toolboxes ──
  { name: 'Worn-Out Tools', rarity: 'common', category: 'Toolbox' },
  { name: 'Toolbox', rarity: 'uncommon', category: 'Toolbox' },
  { name: "Mechanic's Toolbox", rarity: 'rare', category: 'Toolbox' },
  { name: 'Commodious Toolbox', rarity: 'rare', category: 'Toolbox' },
  { name: "Alex's Toolbox", rarity: 'very-rare', category: 'Toolbox' },
  { name: "Engineer's Toolbox", rarity: 'very-rare', category: 'Toolbox' },
  // ── Flashlights ──
  { name: 'Sport Flashlight', rarity: 'uncommon', category: 'Flashlight' },
  { name: 'Utility Flashlight', rarity: 'uncommon', category: 'Flashlight' },
  { name: 'Will O\' Wisp', rarity: 'rare', category: 'Flashlight' },
  { name: 'Flashlight', rarity: 'rare', category: 'Flashlight' },
  // ── Maps ──
  { name: 'Map', rarity: 'rare', category: 'Map' },
  { name: 'Rainbow Map', rarity: 'ultra-rare', category: 'Map' },
  // ── Keys ──
  { name: 'Broken Key', rarity: 'rare', category: 'Key' },
  { name: 'Dull Key', rarity: 'very-rare', category: 'Key' },
  { name: 'Skeleton Key', rarity: 'ultra-rare', category: 'Key' },
];

export const OFFERINGS: BuildOption[] = [
  // ── Bloodpoints ──
  { name: 'Bloody Party Streamers', rarity: 'rare', category: 'Bloodpoints' },
  { name: 'Bound Envelope', rarity: 'uncommon', category: 'Bloodpoints' },
  { name: 'Escape! Cake', rarity: 'uncommon', category: 'Bloodpoints' },
  { name: 'Survivor Pudding', rarity: 'uncommon', category: 'Bloodpoints' },
  // ── Luck ──
  { name: 'Chalk Pouch', rarity: 'common', category: 'Luck' },
  { name: 'Cream Chalk Pouch', rarity: 'uncommon', category: 'Luck' },
  { name: 'Ivory Chalk Pouch', rarity: 'rare', category: 'Luck' },
  { name: 'Salt Pouch', rarity: 'very-rare', category: 'Luck' },
  { name: "Vigo's Jar of Salty Lips", rarity: 'ultra-rare', category: 'Luck' },
  // ── Fog ──
  { name: 'Clear Reagent', rarity: 'common', category: 'Fog' },
  { name: 'Faint Reagent', rarity: 'common', category: 'Fog' },
  { name: 'Murky Reagent', rarity: 'very-rare', category: 'Fog' },
  // ── Shroud ──
  { name: 'Shroud of Binding', rarity: 'uncommon', category: 'Shroud' },
  { name: 'Shroud of Separation', rarity: 'uncommon', category: 'Shroud' },
  { name: 'Shroud of Union', rarity: 'uncommon', category: 'Shroud' },
  // ── Realm (map offerings) ──
  { name: 'MacMillan Estate', rarity: 'uncommon', category: 'Realm' },
  { name: 'Autohaven Wreckers', rarity: 'uncommon', category: 'Realm' },
  { name: 'Coldwind Farm', rarity: 'uncommon', category: 'Realm' },
  { name: "Léry's Memorial Institute", rarity: 'uncommon', category: 'Realm' },
  { name: 'Red Forest', rarity: 'uncommon', category: 'Realm' },
  { name: "Backwater Swamp", rarity: 'uncommon', category: 'Realm' },
  { name: 'Haddonfield', rarity: 'uncommon', category: 'Realm' },
  { name: 'Springwood', rarity: 'uncommon', category: 'Realm' },
  { name: "Gideon's Meat Plant", rarity: 'uncommon', category: 'Realm' },
  { name: 'Yamaoka Estate', rarity: 'uncommon', category: 'Realm' },
  { name: 'Ormond', rarity: 'uncommon', category: 'Realm' },
  { name: 'Silent Hill', rarity: 'uncommon', category: 'Realm' },
  { name: 'Raccoon City', rarity: 'uncommon', category: 'Realm' },
  { name: 'Grave of Glenvale', rarity: 'uncommon', category: 'Realm' },
  { name: 'Withered Isle', rarity: 'uncommon', category: 'Realm' },
  { name: 'Decimated Borgo', rarity: 'uncommon', category: 'Realm' },
  { name: 'Dvarka Deepwood', rarity: 'uncommon', category: 'Realm' },
  { name: 'Nostromo Wreckage', rarity: 'uncommon', category: 'Realm' },
  { name: 'Greenville Square', rarity: 'uncommon', category: 'Realm' },
  { name: 'Toba Landing', rarity: 'uncommon', category: 'Realm' },
  // ── Mori ──
  { name: 'Cypress Memento Mori', rarity: 'common', category: 'Mori' },
  { name: 'Ivory Memento Mori', rarity: 'uncommon', category: 'Mori' },
  { name: 'Ebony Memento Mori', rarity: 'ultra-rare', category: 'Mori' },
];

/** Empty option for "none selected" */
export const NONE_OPTION: BuildOption = { name: '', rarity: 'common' };
