import { ref } from 'vue';
import { formatTime } from '@/utils/format';

interface TimerEntry {
  interval: number;
  startedAt: number;
}

const globalTimers = new Map<string, TimerEntry>();

export function useTimer(id: string) {
  const elapsed = ref(0);
  const running = ref(!!globalTimers.get(id));

  if (running.value) {
    elapsed.value = Math.floor(
      (Date.now() - globalTimers.get(id)!.startedAt) / 1000,
    );
  }

  function start(): void {
    if (globalTimers.has(id)) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      elapsed.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
    globalTimers.set(id, { interval, startedAt });
    running.value = true;
  }

  function stop(): number {
    const t = globalTimers.get(id);
    if (!t) return 0;
    clearInterval(t.interval);
    const dur = Math.floor((Date.now() - t.startedAt) / 1000);
    globalTimers.delete(id);
    running.value = false;
    return dur;
  }

  function reset(): void {
    stop();
    elapsed.value = 0;
  }

  return { elapsed, running, start, stop, reset, fmtTime: formatTime };
}
