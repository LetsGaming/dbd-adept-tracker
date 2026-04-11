import type { Character, CharacterProgress } from '@/types';

interface StatCardData {
  survivors: Character[];
  killers: Character[];
  survivorsDone: number;
  killersDone: number;
  totalDone: number;
  totalCount: number;
  totalPercent: number;
  streak: number;
  bestStreak: number;
  estimatedCompletion: string;
  getProgress: (id: string) => CharacterProgress;
}

const W = 800;
const H = 480;

function drawStat(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  color: string,
  x: number,
  y: number,
): void {
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px monospace';
  ctx.fillText(label, x, y);
  ctx.fillStyle = color;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(value, x, y + 26);
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  pct: number,
  color: string,
): void {
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 8, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(4, (w * pct) / 100), 8, 4);
  ctx.fill();
}

export function renderStatCard(data: StatCardData): void {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const survivorPct = Math.round((data.survivorsDone / data.survivors.length) * 100);
  const killerPct = Math.round((data.killersDone / data.killers.length) * 100);
  const totalPct = data.totalPercent;

  // Background
  ctx.fillStyle = '#0d0d0f';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(1, '#c026d3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 4);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText('DEAD BY DAYLIGHT', 40, 44);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px monospace';
  ctx.fillText('ADEPT TRACKER', 40, 62);

  // Big percent
  ctx.textAlign = 'right';
  ctx.font = 'bold 72px monospace';
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`${totalPct}%`, W - 40, 72);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(`${data.totalDone} / ${data.totalCount} adepts`, W - 40, 90);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 108);
  ctx.lineTo(W - 40, 108);
  ctx.stroke();

  // Survivor block
  drawStat(ctx, 'SURVIVORS', `${data.survivorsDone}/${data.survivors.length}`, '#60a5fa', 40, 148);
  drawBar(ctx, 40, 184, 220, survivorPct, '#3b82f6');
  ctx.fillStyle = '#374151';
  ctx.font = '11px monospace';
  ctx.fillText(`${survivorPct}%`, 268, 191);

  // Killer block
  drawStat(ctx, 'KILLERS', `${data.killersDone}/${data.killers.length}`, '#f87171', 40, 228);
  drawBar(ctx, 40, 264, 220, killerPct, '#ef4444');
  ctx.fillStyle = '#374151';
  ctx.font = '11px monospace';
  ctx.fillText(`${killerPct}%`, 268, 271);

  // Right-side stat grid
  const stats = [
    { label: 'STREAK', value: String(data.streak), color: '#fb923c' },
    { label: 'BEST STREAK', value: String(data.bestStreak), color: '#fbbf24' },
    { label: 'EST. DONE', value: data.estimatedCompletion, color: '#c084fc' },
    { label: 'REMAINING', value: String(data.totalCount - data.totalDone), color: '#94a3b8' },
  ];
  stats.forEach((st, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawStat(ctx, st.label, st.value, st.color, 420 + col * 185, 148 + row * 80);
  });

  // Full-width total bar
  drawBar(ctx, 40, 320, W - 80, totalPct, '#9333ea');
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px monospace';
  ctx.fillText(`overall completion  ${totalPct}%`, 40, 350);

  // Recently completed (last 5)
  const recent = data.survivors
    .concat(data.killers)
    .filter((c) => data.getProgress(c.id).done && data.getProgress(c.id).doneAt)
    .sort(
      (a, b) =>
        (data.getProgress(b.id).doneAt ?? 0) -
        (data.getProgress(a.id).doneAt ?? 0),
    )
    .slice(0, 5);

  if (recent.length) {
    ctx.fillStyle = '#374151';
    ctx.font = '11px monospace';
    ctx.fillText('RECENT', 40, 390);
    const survivorIds = new Set(data.survivors.map((s) => s.id));
    recent.forEach((c, i) => {
      ctx.fillStyle = survivorIds.has(c.id) ? '#3b82f6' : '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(c.name, 40 + i * 148, 410);
    });
  }

  // Footer
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, H - 36, W, 36);
  ctx.fillStyle = '#4b5563';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `generated ${new Date().toLocaleDateString('de-DE')}  ·  dbd-adept-tracker`,
    W / 2,
    H - 14,
  );
  ctx.textAlign = 'left';

  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dbd-adept-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
