// Web Audio & Haptic Feedback Helpers

export function playCompletionChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First note (C5 - 523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second note (E5 - 659.25 Hz, slightly delayed for a pleasant chord)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('AudioContext not allowed or not supported:', err);
  }
}

export function triggerHaptic(ms: number = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore if blocked by browser policy
    }
  }
}

export function updateAppBadge(unreadCount: number) {
  if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount);
      } else {
        (navigator as any).clearAppBadge();
      }
    } catch {
      // Ignore if not supported
    }
  }
}

export function calculateStreak(dates: string[]): { currentStreak: number; bestStreak: number } {
  if (!dates || dates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  // Parse YYYY-MM-DD set of dates
  const sortedDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  let currentStreak = 0;
  let bestStreak = 0;

  // Check if today or yesterday is present to maintain an active streak
  let checkDate = sortedDates.includes(todayStr) 
    ? new Date() 
    : sortedDates.includes(yesterdayStr) 
    ? new Date(Date.now() - 86400000) 
    : null;

  if (checkDate) {
    while (true) {
      const yyyy = checkDate.getFullYear();
      const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      if (sortedDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate best streak across all logs
  let tempStreak = 0;
  const dateObjs = sortedDates.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  });

  for (let i = 0; i < dateObjs.length; i++) {
    tempStreak++;
    if (i < dateObjs.length - 1) {
      const diffTime = dateObjs[i].getTime() - dateObjs[i + 1].getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays !== 1) {
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        tempStreak = 0;
      }
    }
  }
  if (tempStreak > bestStreak) bestStreak = tempStreak;

  return { currentStreak, bestStreak };
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
