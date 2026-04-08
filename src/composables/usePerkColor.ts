const PREFIXES: Record<string, string> = {
  Hex: "#e040fb",
  Boon: "#ab47bc",
  "Scourge Hook": "#ff7043",
};
const PALETTE = [
  "#4fc3f7",
  "#81c784",
  "#ffb74d",
  "#ef5350",
  "#ab47bc",
  "#26a69a",
  "#ec407a",
  "#7e57c2",
  "#26c6da",
  "#ffa726",
];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h;
}

export function perkColor(name: string): string {
  for (const [p, c] of Object.entries(PREFIXES)) {
    if (name.startsWith(p)) return c;
  }
  return PALETTE[hash(name) % PALETTE.length];
}

export function perkShortName(name: string): string {
  return name
    .replace(/^(Hex|Boon|Scourge Hook):\s*/, "")
    .split(" ")
    .slice(0, 3)
    .join(" ");
}
