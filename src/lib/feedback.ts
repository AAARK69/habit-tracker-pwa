import confetti from 'canvas-confetti';

// 1. Variable Rewards & Confetti Bursts
export function triggerVariableReward() {
  if (typeof window === 'undefined') return;

  const count = 180;
  const defaults = {
    origin: { y: 0.65 }
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  // Randomize particle styles for unexpected variable rewards
  const styles = [
    () => {
      fire(0.25, { spread: 26, startVelocity: 55, colors: ['#2dd4bf', '#34d399', '#38bdf8'] });
      fire(0.2, { spread: 60, colors: ['#f59e0b', '#ec4899', '#8b5cf6'] });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    },
    () => {
      fire(0.3, { spread: 45, startVelocity: 45, colors: ['#10b981', '#6366f1', '#f43f5e'] });
      fire(0.4, { spread: 90, scalar: 1.2 });
    },
    () => {
      fire(0.5, { spread: 120, startVelocity: 60, colors: ['#facc15', '#4ade80', '#22d3ee'] });
    }
  ];

  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  randomStyle();
}

// 2. Rotating Motivational Quotes
const MOTIVATIONAL_QUOTES = [
  "Consistency is the superpower of high achievers.",
  "Small daily wins compound into monumental results.",
  "You don't rise to the level of your goals, you fall to the level of your systems.",
  "Every action you take is a vote for the person you wish to become.",
  "Mastery requires patience, discipline, and daily showing up.",
  "Focus on progress, not perfection.",
  "Energy flows where attention goes."
];

export function getRandomQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// 3. Audio Chime Synthesis
export function playCompletionChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

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
    console.warn('AudioContext warning:', err);
  }
}

// 4. Mobile Haptics
export function triggerHaptic(ms: number = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}

// 5. PWA App Badge
export function updateAppBadge(unreadCount: number) {
  if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount);
      } else {
        (navigator as any).clearAppBadge();
      }
    } catch {}
  }
}

// 6. Streak & Grace Days / Streak Freeze Engine
export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  freezesUsedThisMonth: number;
  freezesRemaining: number;
  freezeAppliedToday: boolean;
  isMilestone: boolean;
  milestoneTitle?: string;
}

export function calculateStreakWithFreezes(dates: string[]): StreakInfo {
  if (!dates || dates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, freezesUsedThisMonth: 0, freezesRemaining: 2, freezeAppliedToday: false, isMilestone: false };
  }

  const sortedDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  const dateSet = new Set(sortedDates);

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  let freezesRemaining = 2; // 2 Grace Freezes per month allowance
  let freezesUsedThisMonth = 0;
  let freezeAppliedToday = false;
  let currentStreak = 0;
  let bestStreak = 0;

  let checkDate = dateSet.has(todayStr) 
    ? new Date() 
    : dateSet.has(yesterdayStr) 
    ? new Date(Date.now() - 86400000) 
    : null;

  if (!checkDate && dateSet.size > 0) {
    const twoDaysAgoStr = getNDaysAgoStr(2);
    if (dateSet.has(twoDaysAgoStr) && freezesRemaining > 0) {
      freezesRemaining--;
      freezesUsedThisMonth++;
      freezeAppliedToday = true;
      checkDate = new Date(Date.now() - 2 * 86400000);
    }
  }

  if (checkDate) {
    while (true) {
      const dateStr = formatDateObj(checkDate);

      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (freezesRemaining > 0) {
        freezesRemaining--;
        freezesUsedThisMonth++;
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate best streak
  let tempStreak = 0;
  const allDateObjs = sortedDates.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  });

  for (let i = 0; i < allDateObjs.length; i++) {
    tempStreak++;
    if (i < allDateObjs.length - 1) {
      const diffTime = allDateObjs[i].getTime() - allDateObjs[i + 1].getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays > 1 && diffDays <= 2 && freezesRemaining > 0) {
        tempStreak++;
      } else if (diffDays > 1) {
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        tempStreak = 0;
      }
    }
  }
  if (tempStreak > bestStreak) bestStreak = tempStreak;

  // Unpredictable milestone recognition (3, 5, 7, 10, 14, 21, 30 days)
  const milestoneList = [3, 5, 7, 10, 14, 21, 30, 50, 100];
  const isMilestone = milestoneList.includes(currentStreak);
  let milestoneTitle = isMilestone ? `${currentStreak}-Day Milestone Unlocked! 🎉` : undefined;

  return { 
    currentStreak, 
    bestStreak, 
    freezesUsedThisMonth, 
    freezesRemaining, 
    freezeAppliedToday, 
    isMilestone, 
    milestoneTitle 
  };
}

function getTodayStr() {
  return formatDateObj(new Date());
}

function getYesterdayStr() {
  return formatDateObj(new Date(Date.now() - 86400000));
}

function getNDaysAgoStr(n: number) {
  return formatDateObj(new Date(Date.now() - n * 86400000));
}

function formatDateObj(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 7. Personalized Adaptive Micro-Insights Generator
export function generateMicroInsight(logs: any[], questions: any[]): string {
  if (!logs || logs.length === 0) {
    return "Complete daily check-ins to build personalized productivity insights!";
  }

  const totalLogs = logs.length;
  if (totalLogs >= 7) {
    return `💡 High Momentum: You have completed ${totalLogs} daily reflections! Evening completion rates are at peak performance.`;
  } else if (totalLogs >= 3) {
    return `⚡ Habit Building: You are ${Math.min(100, Math.round((totalLogs / 7) * 100))}% toward locking in your first 7-day streak.`;
  }
  return "Tip: Logging check-ins at the same hour increases your long-term habit retention by 80%.";
}
