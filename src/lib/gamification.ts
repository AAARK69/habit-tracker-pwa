// XP, Leveling System, Achievement Badges & Theme Accents Engine

export interface LevelInfo {
  totalXP: number;
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function calculateUserLevel(logs: any[], themeId: string = 'teal'): LevelInfo {
  if (!logs || logs.length === 0) {
    const theme = ACCENT_THEMES.find((t) => t.id === themeId) || ACCENT_THEMES[0];
    return {
      totalXP: 0,
      level: 1,
      title: theme.levelTitles[0],
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

  const theme = ACCENT_THEMES.find((t) => t.id === themeId) || ACCENT_THEMES[0];

  // Level milestones array
  const levels = [
    { level: 1, titleIndex: 0, minXP: 0, maxXP: 150 },
    { level: 2, titleIndex: 1, minXP: 150, maxXP: 350 },
    { level: 3, titleIndex: 2, minXP: 350, maxXP: 700 },
    { level: 4, titleIndex: 3, minXP: 700, maxXP: 1200 },
    { level: 5, titleIndex: 4, minXP: 1200, maxXP: 2000 },
    { level: 6, titleIndex: 5, minXP: 2000, maxXP: 5000 },
  ];

  let currentLevelObj = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].minXP) {
      currentLevelObj = levels[i];
      break;
    }
  }

  const level = currentLevelObj.level;
  const title = theme.levelTitles[currentLevelObj.titleIndex] || 'Reflector';
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

export function calculateAchievementBadges(logs: any[], currentStreak: number = 0): AchievementBadge[] {
  const totalLogs = logs ? logs.length : 0;

  const hasVoiceReflection = logs?.some((l) =>
    Object.values(l.responses || {}).some((v) => typeof v === 'string' && v.trim().length > 0)
  );

  return [
    {
      id: 'first_stamp',
      name: 'First Stamp',
      description: 'Logged your very first daily reflection',
      icon: '✒️',
      unlocked: totalLogs >= 1,
    },
    {
      id: 'streak_7',
      name: '7-Day Momentum',
      description: 'Maintained a 7-day streak chain',
      icon: '⚡',
      unlocked: currentStreak >= 7,
    },
    {
      id: 'voice_master',
      name: 'Voice Journaler',
      description: 'Dictated a reflection entry out loud',
      icon: '🎙️',
      unlocked: Boolean(hasVoiceReflection),
    },
    {
      id: 'palette_collector',
      name: 'Palette Collector',
      description: 'Customized UI accent themes in Settings',
      icon: '🎨',
      unlocked: true,
    },
    {
      id: 'goal_crusher',
      name: 'Goal Crusher',
      description: 'Created a long-term goal milestone',
      icon: '🎯',
      unlocked: totalLogs >= 2,
    },
    {
      id: 'analyst',
      name: 'Chart Analyst',
      description: 'Evaluated habit correlations in Charts',
      icon: '📊',
      unlocked: totalLogs >= 1,
    },
    {
      id: 'shield_defender',
      name: 'Shield Defender',
      description: 'Protected a streak with a Grace Freeze',
      icon: '🛡️',
      unlocked: totalLogs >= 1,
    },
    {
      id: 'zen_master',
      name: 'Consistency Veteran',
      description: 'Logged 14 or more total check-ins',
      icon: '🏆',
      unlocked: totalLogs >= 14,
    },
  ];
}

// Accent Color Theme Options & Niche Details
export interface ThemeOption {
  id: string;
  name: string;
  colorHex: string;
  gradient: string;
  borderClass: string;
  textClass: string;
  nicheStamp: string;
  nicheEmoji: string;
  nicheTag: string;
  nicheQuote: string;
  levelTitles: string[];
}

export const ACCENT_THEMES: ThemeOption[] = [
  {
    id: 'teal',
    name: 'Emerald Journal',
    colorHex: '#2dd4bf',
    gradient: 'from-teal-400 to-emerald-400',
    borderClass: 'border-teal-500/30',
    textClass: 'text-teal-400',
    nicheStamp: 'Journal Entry Stamped ✒️',
    nicheEmoji: '✒️',
    nicheTag: 'Tactile Bullet Journal Mode',
    nicheQuote: 'Put fountain pen to paper, honor your daily progress.',
    levelTitles: [
      'Novice Journaler',
      'Tactile Explorer',
      'Habit Architect',
      'Systems Designer',
      'Master of Consistency',
      'Zen Grandmaster',
    ],
  },
  {
    id: 'cyan',
    name: 'Cyberpunk Neon',
    colorHex: '#06b6d4',
    gradient: 'from-cyan-400 to-blue-400',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400',
    nicheStamp: 'Terminal Process 0x4F Executed ⚡',
    nicheEmoji: '⚡',
    nicheTag: 'High-Tech Synthwave Matrix',
    nicheQuote: 'System memory synchronized. Execution loop complete.',
    levelTitles: [
      'Script Kiddie',
      'Netrunner Initiate',
      'Cyber Architect',
      'Grid Controller',
      'Core Overclock Master',
      'AI Matrix Overlord',
    ],
  },
  {
    id: 'purple',
    name: 'Amethyst Cosmos',
    colorHex: '#c084fc',
    gradient: 'from-purple-400 to-fuchsia-400',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    nicheStamp: 'Celestial Seal Aligned 🔮',
    nicheEmoji: '🔮',
    nicheTag: 'Cosmic Starlight & Mysticism',
    nicheQuote: 'As above, so below. Align your daily energy with the cosmos.',
    levelTitles: [
      'Starlight Novice',
      'Cosmic Seeker',
      'Astral Architect',
      'Celestial Weaver',
      'Master Alchemist',
      'Galaxy Overseer',
    ],
  },
  {
    id: 'rose',
    name: 'Sunset Rose',
    colorHex: '#fb7185',
    gradient: 'from-rose-400 to-pink-400',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400',
    nicheStamp: 'Sunset Cassette Stamped 📼',
    nicheEmoji: '🌅',
    nicheTag: 'Retrowave Sunset Glass',
    nicheQuote: 'Breathe in the evening glow. Warmth in every daily win.',
    levelTitles: [
      'Sunset Bloom',
      'Warm Reflector',
      'Radiant Architect',
      'Horizon Designer',
      'Golden Hour Master',
      'Infinite Solstice',
    ],
  },
  {
    id: 'amber',
    name: 'Golden Alchemy',
    colorHex: '#fbbf24',
    gradient: 'from-amber-400 to-orange-400',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    nicheStamp: 'Golden Wax Sealed 📜',
    nicheEmoji: '📜',
    nicheTag: 'Vintage Parchment Alchemy',
    nicheQuote: 'Transmute daily effort into golden long-term character.',
    levelTitles: [
      'Alchemist Apprentice',
      'Golden Scholar',
      'Parchment Master',
      'Transmutation Lead',
      'Philosopher of Habits',
      'Grand Apothecary',
    ],
  },
];
