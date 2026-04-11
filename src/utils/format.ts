/** Format a timestamp as "DD.MM.YYYY HH:MM" in German locale. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Format a timestamp as "DD.MM.YYYY" in German locale. */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE');
}

/** Format elapsed seconds as "M:SS". */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Create an object-URL download and immediately revoke it. */
export function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Simple string hash returning a positive 16-bit integer. */
export function hash16(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h;
}

/** Escape HTML special characters. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Derive a URL-safe slug from a name. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
