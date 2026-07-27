'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout } from '@/contexts/DeviceLayoutContext';
import { supabase } from '@/lib/supabase';
import NotificationToggle from '@/components/NotificationToggle';
import { 
  playCompletionChime, triggerHaptic, updateAppBadge, 
  triggerVariableReward, getRandomQuote, calculateStreakWithFreezes,
  generateMicroInsight, StreakInfo, shuffleArray
} from '@/lib/feedback';
import { 
  calculateUserLevel, calculateAchievementBadges, LevelInfo, ACCENT_THEMES, AchievementBadge
} from '@/lib/gamification';
import { 
  Dumbbell, Bed, Smile, Sparkles, BookOpen, GlassWater, 
  Brain, Flame, Heart, Coffee, ClipboardList, CheckSquare, 
  HelpCircle, CheckCircle, Edit3, Loader2, Check, X, 
  MessageSquare, ShieldCheck, Award, Lightbulb, Share2, 
  Mic, MicOff, Trophy, PenTool, Activity, Shuffle, ShieldAlert,
  Calendar, RotateCcw, ArrowLeft
} from 'lucide-react';

const IconMap: Record<string, any> = {
  'dumbbell': Dumbbell,
  'bed': Bed,
  'smile': Smile,
  'sparkles': Sparkles,
  'book-open': BookOpen,
  'glass-water': GlassWater,
  'brain': Brain,
  'flame': Flame,
  'heart': Heart,
  'coffee': Coffee,
  'clipboard-list': ClipboardList,
  'check-square': CheckSquare,
  'help-circle': HelpCircle
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { activeDevice } = useDeviceLayout();
  const [questions, setQuestions] = useState<any[]>([]);
  const [log, setLog] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState<Record<string, boolean>>({});
  const [allLogDates, setAllLogDates] = useState<string[]>([]);
  const [allLogsData, setAllLogsData] = useState<any[]>([]);
  const [activeThemeId, setActiveThemeId] = useState('teal');
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo>({
    currentStreak: 0,
    bestStreak: 0,
    freezesUsedThisMonth: 0,
    freezesRemaining: 2,
    freezeAppliedToday: false,
    isMilestone: false
  });
  const [levelInfo, setLevelInfo] = useState<LevelInfo>({
    totalXP: 0,
    level: 1,
    title: 'Novice Reflector',
    currentLevelXP: 0,
    nextLevelXP: 100,
    progressPercent: 0,
  });
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [microInsight, setMicroInsight] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  const getLocalTodayDateStr = () => {
    const dateObj = new Date();
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getYesterdayDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getLocalHabitTypeMap = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('reflect_habit_types') || '{}');
    } catch {
      return {};
    }
  };

  const getHabitStreak = (q: any) => {
    const isBadHabit = q.habit_type === 'bad';
    const successfulDates = allLogsData
      .filter((log) => {
        const resp = log.responses?.[q.id];
        if (resp === undefined || resp === null || resp === '') return false;
        if (q.type === 'boolean') {
          if (isBadHabit) return resp === false;
          return resp === true;
        }
        return true;
      })
      .map((log) => log.date);

    // Check if today's unsubmitted answer also counts as a success to provide immediate feedback
    const todayStr = getLocalTodayDateStr();
    const todayResp = answers[q.id];
    if (todayResp !== undefined && todayResp !== null && todayResp !== '') {
      let todaySuccess = true;
      if (q.type === 'boolean') {
        if (isBadHabit) todaySuccess = todayResp === false;
        else todaySuccess = todayResp === true;
      }
      if (todaySuccess && !successfulDates.includes(todayStr)) {
        successfulDates.push(todayStr);
      }
    }

    return calculateStreakWithFreezes(successfulDates).currentStreak;
  };

  useEffect(() => {
    const theme = localStorage.getItem('reflect_accent_theme') || 'teal';
    setActiveThemeId(theme);
    setSelectedDate(getLocalTodayDateStr());

    const handleThemeChange = () => {
      const updatedTheme = localStorage.getItem('reflect_accent_theme') || 'teal';
      setActiveThemeId(updatedTheme);
    };

    window.addEventListener('reflect_theme_change', handleThemeChange);
    return () => window.removeEventListener('reflect_theme_change', handleThemeChange);
  }, []);

  // Fetch Log for currently selectedDate
  useEffect(() => {
    if (!user || !selectedDate) return;

    const fetchDataForDate = async () => {
      setLoading(true);
      try {
        const { data: activeQuestions, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (qError) throw qError;

        const localHabits = getLocalHabitTypeMap();
        let loadedQuestions = (activeQuestions || []).map((q: any) => ({
          ...q,
          habit_type: localHabits[q.id] || q.habit_type || 'good',
        }));

        const isRandomized = localStorage.getItem('reflect_randomize_questions') === 'true';
        if (isRandomized) {
          loadedQuestions = shuffleArray(loadedQuestions);
        }

        setQuestions(loadedQuestions);

        // Fetch Log for selectedDate
        const { data: targetLog, error: logError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', selectedDate)
          .maybeSingle();

        if (logError) throw logError;

        const { data: allLogs } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id);

        const logsList = allLogs || [];
        const logDates = logsList.map((l: any) => l.date);
        setAllLogDates(logDates);
        setAllLogsData(logsList);
        
        const streak = calculateStreakWithFreezes(logDates);
        setStreakInfo(streak);
        setLevelInfo(calculateUserLevel(logsList, activeThemeId));
        setBadges(calculateAchievementBadges(logsList, streak.currentStreak));
        setMicroInsight(generateMicroInsight(logsList, loadedQuestions));

        if (targetLog) {
          setLog(targetLog);
          setAnswers(targetLog.responses || {});
          setIsEditing(false);
          if (selectedDate === getLocalTodayDateStr()) updateAppBadge(0);
        } else {
          setLog(null);
          setIsEditing(true);
          if (selectedDate === getLocalTodayDateStr()) updateAppBadge(1);
          
          const initialAnswers: Record<string, any> = {};
          loadedQuestions?.forEach((q) => {
            if (q.type === 'boolean') initialAnswers[q.id] = null;
            else if (q.type === 'number') initialAnswers[q.id] = '';
            else if (q.type === 'scale_1_to_5') initialAnswers[q.id] = 3;
            else if (q.type === 'text') initialAnswers[q.id] = '';
          });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDataForDate();
  }, [user, selectedDate, activeThemeId]);

  const activeThemeObj = ACCENT_THEMES.find((t) => t.id === activeThemeId) || ACCENT_THEMES[0];

  const handleShuffleQuestions = () => {
    triggerHaptic(20);
    setQuestions((prev) => shuffleArray(prev));
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    triggerHaptic(10);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const toggleVoiceJournaling = (questionId: string) => {
    triggerHaptic(20);
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Safari on iOS or Chrome.');
      return;
    }

    if (isListening[questionId]) {
      setIsListening((prev) => ({ ...prev, [questionId]: false }));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening((prev) => ({ ...prev, [questionId]: true }));
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAnswers((prev) => ({
          ...prev,
          [questionId]: prev[questionId] ? `${prev[questionId]} ${transcript}` : transcript,
        }));
        setIsListening((prev) => ({ ...prev, [questionId]: false }));
        triggerHaptic(15);
      };

      recognition.onerror = () => {
        setIsListening((prev) => ({ ...prev, [questionId]: false }));
      };

      recognition.onend = () => {
        setIsListening((prev) => ({ ...prev, [questionId]: false }));
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleShareStreak = async () => {
    triggerHaptic(15);
    const text = `🔥 ${streakInfo.currentStreak}-Day Streak on Reflect! Level ${levelInfo.level} (${levelInfo.title}) • ${levelInfo.totalXP} XP.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reflect Personal Journal',
          text,
          url: window.location.origin,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;
    setSubmitting(true);

    try {
      let result;
      if (log) {
        result = await supabase
          .from('daily_logs')
          .update({ responses: answers })
          .eq('id', log.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            date: selectedDate,
            responses: answers,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      triggerVariableReward();
      playCompletionChime();
      triggerHaptic(40);
      if (selectedDate === getLocalTodayDateStr()) updateAppBadge(0);
      setMotivationalQuote(getRandomQuote());

      const { data: allLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id);
      const logsList = allLogs || [];
      const logDates = logsList.map((l: any) => l.date);
      setAllLogDates(logDates);
      setAllLogsData(logsList);
      const streak = calculateStreakWithFreezes(logDates);
      setStreakInfo(streak);
      setLevelInfo(calculateUserLevel(logsList, activeThemeId));
      setBadges(calculateAchievementBadges(logsList, streak.currentStreak));
      setMicroInsight(generateMicroInsight(logsList, questions));

      setLog(result.data);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving daily log:', err);
      alert('Failed to save log: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-zinc-500 text-xs font-handwritten text-lg">Opening your personal journal...</span>
      </div>
    );
  }

  const isDesktop = activeDevice === 'desktop';
  const todayStr = getLocalTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const isTodaySelected = selectedDate === todayStr;
  const isYesterdaySelected = selectedDate === yesterdayStr;

  return (
    <div className="space-y-6">
      {/* Date Selector Header Toolbar */}
      <div className="craft-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-zinc-850">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold text-zinc-300 font-ios-mono uppercase">Log Date:</span>
          <input
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-ios-mono text-zinc-100 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Quick Date Shortcuts */}
        <div className="flex items-center space-x-2 self-end sm:self-auto font-ios-mono">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            style={isTodaySelected ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isTodaySelected ? 'shadow' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayStr)}
            style={isYesterdaySelected ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isYesterdaySelected ? 'shadow' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Yesterday 👈
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight font-ios-serif">
            {isEditing 
              ? (isTodaySelected ? "Today's Reflections" : `Past Log: ${selectedDate}`)
              : `${selectedDate} Complete 🎯`}
          </h1>
          <p className="text-sm text-zinc-400 font-handwritten text-xl">
            {isEditing 
              ? (isTodaySelected ? activeThemeObj.nicheQuote : `Fill out missing habits for ${selectedDate}`)
              : "All habits logged & stamped. Take a rest and enjoy real life!"}
          </p>
        </div>

        {/* Dynamic Streak Badge */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="craft-card px-3.5 py-1.5 border border-amber-500/20 bg-amber-500/5 flex items-center space-x-2 shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold text-amber-300 font-ios-rounded">
              {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
          <button
            onClick={handleShareStreak}
            style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
            className="p-1.5 rounded-xl border hover:opacity-80 transition-opacity cursor-pointer text-xs font-ios-mono"
            title="Share Streak"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className={`grid gap-6 ${isDesktop ? 'grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* Left Column (Desktop 16:9 Sidebar Stats) */}
        {isDesktop && (
          <div className="col-span-4 space-y-5">
            {/* Level Progress Card */}
            <div className="craft-card p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-zinc-200 font-ios-rounded">
                    Level {levelInfo.level}: <span style={{ color: 'var(--accent)' }}>{levelInfo.title}</span>
                  </span>
                </div>
                <span className="font-mono text-zinc-400">{levelInfo.totalXP} XP</span>
              </div>

              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ width: `${levelInfo.progressPercent}%`, background: 'var(--accent-gradient)' }}
                ></div>
              </div>
            </div>

            {/* Achievement Badges Vault */}
            <div className="craft-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-ios-mono font-bold">
                <div className="flex items-center space-x-1.5 text-zinc-200">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Achievement Vault</span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      b.unlocked
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm'
                        : 'bg-zinc-950/40 border-zinc-850/50 text-zinc-650 opacity-40'
                    }`}
                    title={`${b.name}: ${b.description}`}
                  >
                    <span className="text-base block">{b.icon}</span>
                    <span className="text-[9px] font-bold font-ios-mono truncate block mt-0.5">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Grace Freezes */}
            <div className="craft-card p-3.5 space-y-1 text-xs font-ios-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Streak Protection</span>
                </span>
                <span className="font-bold text-amber-400">{streakInfo.freezesRemaining} Freezes Left</span>
              </div>
            </div>

            {/* Micro Insight */}
            {microInsight && (
              <div 
                className="p-3.5 rounded-xl border text-xs text-zinc-300 flex items-start space-x-2.5 craft-card"
                style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
              >
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <span className="leading-snug font-ios-sans">{microInsight}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Reflection Form / Stopping Cue Column */}
        <div className={isDesktop ? 'col-span-8 space-y-5' : 'col-span-1 space-y-5'}>
          
          {streakInfo.isMilestone && isEditing && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-teal-500/10 text-amber-200 text-xs flex items-center space-x-3 shadow-md">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-amber-300 font-ios-rounded">{streakInfo.milestoneTitle}</h4>
              </div>
            </div>
          )}

          <NotificationToggle />

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isTodaySelected && (
                <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs flex items-center space-x-2 font-ios-mono">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Logging reflections retroactively for <strong>{selectedDate}</strong> 📜</span>
                </div>
              )}

              {/* Question Form Toolbar */}
              {questions.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-zinc-500 font-ios-mono uppercase tracking-widest">
                    Daily Questionnaire ({questions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleShuffleQuestions}
                    style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
                    className="flex items-center space-x-1 text-xs font-ios-mono font-bold px-2.5 py-1 rounded-xl border hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Shuffle 🎲</span>
                  </button>
                </div>
              )}

              {questions.length === 0 ? (
                <div className="craft-card p-8 text-center space-y-3 border-zinc-800 bg-zinc-900/10">
                  <ClipboardList className="w-10 h-10 text-zinc-650 mx-auto" />
                  <p className="text-zinc-400 text-sm font-handwritten text-xl">
                    Your journal is empty! Go to Settings to create custom prompts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Render questions grid */}
                  <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {questions.map((q) => {
                      const value = answers[q.id];
                      const IconComponent = IconMap[q.icon] || HelpCircle;
                      const isFullWidth = q.type === 'text';
                      const habitType = q.habit_type || 'good';

                      return (
                        <div 
                          key={q.id} 
                          className={`craft-card p-4 space-y-3 transition-all duration-200 ${
                            isFullWidth ? 'col-span-full' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="p-1.5 rounded-xl border shrink-0"
                                style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <label className="block text-xs font-bold text-zinc-200 font-ios-sans">
                                  {q.prompt}
                                </label>
                                {/* Habit Category Tag */}
                                <span className="inline-block text-[9px] font-bold font-ios-mono opacity-70">
                                  {habitType === 'good' ? '🟢 Good Habit' : habitType === 'bad' ? '🔴 Bad Habit' : '⚪ Neutral'}
                                </span>
                                <span className="inline-flex items-center text-[10px] font-bold font-ios-mono text-orange-400/90 ml-2">
                                  <Flame className="w-3 h-3 mr-0.5" />
                                  {getHabitStreak(q)} Day Streak
                                </span>
                              </div>
                            </div>

                            {q.type === 'text' && (
                              <button
                                type="button"
                                onClick={() => toggleVoiceJournaling(q.id)}
                                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                  isListening[q.id]
                                    ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                                    : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                                }`}
                                title="Voice Dictation"
                              >
                                {isListening[q.id] ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {/* One-Tap Yes/No Buttons */}
                          {q.type === 'boolean' && (
                            <div className="space-y-1.5 font-ios-rounded">
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleAnswerChange(q.id, true)}
                                  style={value === true ? (habitType === 'bad' ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' } : { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }) : {}}
                                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                                    value === true
                                      ? 'shadow'
                                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-450 hover:text-zinc-200'
                                  }`}
                                >
                                  <Check className={`w-3.5 h-3.5 ${value === true ? 'scale-110' : ''}`} />
                                  <span>Yes</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnswerChange(q.id, false)}
                                  style={value === false ? (habitType === 'bad' ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' } : {}) : {}}
                                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                                    value === false
                                      ? (habitType === 'bad' ? 'shadow' : 'bg-red-500/10 border-red-500/40 text-red-400 shadow')
                                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-450 hover:text-zinc-200'
                                  }`}
                                >
                                  <X className={`w-3.5 h-3.5 ${value === false ? 'scale-110' : ''}`} />
                                  <span>No</span>
                                </button>
                              </div>

                              {/* Bad Habit Avoidance Cue Banner */}
                              {habitType === 'bad' && value === false && (
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-ios-mono flex items-center space-x-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>Avoided! Great self-control 🛡️ (+20 bonus XP)</span>
                                </div>
                              )}
                            </div>
                          )}

                          {q.type === 'number' && (
                            <div className="relative font-ios-mono">
                              <input
                                type="number"
                                value={value ?? ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter quantity"
                                required
                                className="w-full px-3 py-2 bg-zinc-950/70 border border-zinc-850 rounded-xl text-zinc-200 placeholder-zinc-650 focus:outline-none text-xs font-ios-mono"
                                style={{ borderColor: value !== '' ? 'var(--accent-border)' : '' }}
                              />
                            </div>
                          )}

                          {/* 1-5 Circular Touch Rating Dials */}
                          {q.type === 'scale_1_to_5' && (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center px-1 font-ios-rounded">
                                {[1, 2, 3, 4, 5].map((num) => {
                                  const isSelected = value === num;
                                  return (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => handleAnswerChange(q.id, num)}
                                      style={isSelected ? { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}
                                      className={`w-9 h-9 rounded-full text-xs font-black border transition-all flex items-center justify-center cursor-pointer ${
                                        isSelected
                                          ? 'shadow scale-105'
                                          : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {q.type === 'text' && (
                            <div className="space-y-1.5">
                              <textarea
                                value={value ?? ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                placeholder="Reflect on your day... (Tap mic icon above to dictate)"
                                required
                                rows={2.5}
                                className="w-full px-3 py-2.5 bg-zinc-950/70 border border-zinc-850 rounded-xl text-zinc-200 placeholder-zinc-650 focus:outline-none text-xs font-ios-serif leading-relaxed resize-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: 'var(--accent-gradient)', color: '#09090b' }}
                    className="glow-btn w-full py-3 font-bold text-xs rounded-xl hover:opacity-95 shadow-lg transition-opacity flex justify-center items-center space-x-2 cursor-pointer disabled:opacity-50 font-ios-sans"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <span className="font-handwritten text-lg font-bold">
                        {isTodaySelected ? activeThemeObj.nicheStamp : `Save Past Entry for ${selectedDate} 📜`} (+70 XP)
                      </span>
                    )}
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div 
                className="craft-card p-6 border flex flex-col items-center text-center space-y-3 shadow-xl relative overflow-hidden"
                style={{ borderColor: 'var(--accent-border)', backgroundColor: 'rgba(18, 19, 22, 0.85)' }}
              >
                <div 
                  className="w-12 h-12 rounded-full border flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                >
                  <CheckCircle className="w-7 h-7" />
                </div>
                
                <div className="space-y-1 max-w-md">
                  <span 
                    className="text-[10px] font-ios-mono font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                    style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                  >
                    {selectedDate} Stamped
                  </span>
                  <h3 className="text-xl font-black text-zinc-100 font-ios-serif">Day Complete 🎯</h3>
                  <p className="text-zinc-300 text-lg leading-relaxed font-handwritten">
                    "{motivationalQuote || activeThemeObj.nicheQuote}"
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-1 font-ios-sans">
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setIsEditing(true);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 transition-all text-zinc-300 cursor-pointer shadow"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-450" />
                    <span>Modify Entry</span>
                  </button>
                </div>
              </div>

              {/* Saved entries grid */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-widest pl-1 font-ios-mono">Saved Entries for {selectedDate}</h4>
                <div className={`grid gap-3 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {questions.map((q) => {
                    const val = answers[q.id];
                    const IconComponent = IconMap[q.icon] || HelpCircle;
                    const isText = q.type === 'text';

                    return (
                      <div 
                        key={q.id} 
                        className={`craft-card p-3.5 border border-zinc-850/80 bg-zinc-900/5 flex flex-col justify-between space-y-2 ${
                          isText ? 'col-span-full' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 shrink-0">
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-450 leading-tight font-ios-sans">{q.prompt}</span>
                          </div>
                          <span className="inline-flex items-center text-[10px] font-bold font-ios-mono text-orange-400/90 ml-2 whitespace-nowrap">
                            <Flame className="w-3 h-3 mr-0.5" />
                            {getHabitStreak(q)}
                          </span>
                        </div>

                        {q.type === 'text' ? (
                          <div className="text-sm font-handwritten bg-zinc-950/40 p-2 rounded-lg border border-zinc-900 flex items-start space-x-1.5 text-zinc-300 w-full">
                            <MessageSquare className="w-3 h-3 text-zinc-500 shrink-0 mt-1" />
                            <p className="leading-relaxed whitespace-pre-wrap">{val || '-'}</p>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-zinc-200 self-end font-ios-mono">
                            {val === true ? 'Yes' : val === false ? 'No' : val === '' || val === null ? '-' : String(val)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
