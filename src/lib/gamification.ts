// XP, Leveling System & Theme Accents Engine

export interface LevelInfo {
  totalXP: number;
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
}

export function calculateUserLevel(logs: any[]): LevelInfo {
  if (!logs || logs.length === 0) {
    return {
      totalXP: 0,
      level: 1,
      title: 'Novice Reflector',
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercent: 0,
    };
  }

  let totalXP = 0;

  logs.forEach((log) => {
    // 50 XP per daily check-in
    totalXP += 50;

    const responses = log.responses || {};
    Object.values(responses).forEach((val) => {
      // 20 bonus XP for written reflections
      if (typeof val === 'string' && val.trim().length > 0) {
        totalXP += 20;
      }
    });
  });

  // Level milestones array
  const levels = [
    { level: 1, title: 'Novice Reflector', minXP: 0, maxXP: 150 },
    { level: 2, title: 'Mindful Explorer', minXP: 150, maxXP: 350 },
    { level: 3, title: 'Habit Architect', minXP: 350, maxXP: 700 },
    { level: 4, title: 'Systems Designer', minXP: 700, maxXP: 1200 },
    { level: 5, title: 'Master of Consistency', minXP: 1200, maxXP: 2000 },
    { level: 6, title: 'Zen Grandmaster', minXP: 2000, maxXP: 5000 },
  ];

  let currentLevelObj = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].minXP) {
      currentLevelObj = levels[i];
      break;
    }
  }

  const level = currentLevelObj.level;
  const title = currentLevelObj.title;
  const currentLevelXP = totalXP - currentLevelObj.minXP;
  const nextLevelXP = currentLevelObj.maxXP - currentLevelObj.minXP;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));

  return {
    totalXP,
    level,
    title,
    currentLevelXP,
    nextLevelXP,
    progressPercent,
  };
}

// Accent Color Theme Options
export interface ThemeOption {
  id: string;
  name: string;
  colorHex: string;
  gradient: string;
  borderClass: string;
  textClass: string;
}

export const ACCENT_THEMES: ThemeOption[] = [
  {
    id: 'teal',
    name: 'Emerald Teal',
    colorHex: '#2dd4bf',
    gradient: 'from-teal-400 to-emerald-400',
    borderClass: 'border-teal-500/30',
    textClass: 'text-teal-400',
  },
  {
    id: 'cyan',
    name: 'Cyberpunk Cyan',
    colorHex: '#06b6d4',
    gradient: 'from-cyan-400 to-blue-400',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400',
  },
  {
    id: 'purple',
    name: 'Amethyst Purple',
    colorHex: '#c084fc',
    gradient: 'from-purple-400 to-fuchsia-400',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
  },
  {
    id: 'rose',
    name: 'Sunset Rose',
    colorHex: '#fb7185',
    gradient: 'from-rose-400 to-pink-400',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400',
  },
  {
    id: 'amber',
    name: 'Golden Amber',
    colorHex: '#fbbf24',
    gradient: 'from-amber-400 to-orange-400',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
  },
];
