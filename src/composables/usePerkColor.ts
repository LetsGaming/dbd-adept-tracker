import { hash16 } from '@/utils/format';

const PERK_PREFIX_COLORS: Record<string, string> = {
  Hex: '#e040fb',
  Boon: '#ab47bc',
  'Scourge Hook': '#ff7043',
};

const PERK_PALETTE = [
  '#4fc3f7', '#81c784', '#ffb74d', '#ef5350', '#ab47bc',
  '#26a69a', '#ec407a', '#7e57c2', '#26c6da', '#ffa726',
] as const;

export function perkColor(name: string): string {
  for (const [prefix, color] of Object.entries(PERK_PREFIX_COLORS)) {
    if (name.startsWith(prefix)) return color;
  }
  return PERK_PALETTE[hash16(name) % PERK_PALETTE.length];
}

export function perkShortName(name: string): string {
  return name
    .replace(/^(Hex|Boon|Scourge Hook):\s*/, '')
    .split(' ')
    .slice(0, 3)
    .join(' ');
}
