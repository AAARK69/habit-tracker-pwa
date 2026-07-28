'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout } from '@/contexts/DeviceLayoutContext';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, Line
} from 'recharts';
import { 
  BarChart3, TrendingUp, Smile, Bed, Award, 
  Loader2, Activity, PieChart as PieIcon, Sparkles, SlidersHorizontal,
  ArrowRightLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info
} from 'lucide-react';

interface CalendarDayScore {
  dateStr: string;
  dayNum: number;
  goodCount: number;
  badAvoidedCount: number;
  badIndulgedCount: number;
  netScore: number;
  hasLog: boolean;
  inCurrentMonth: boolean;
}

export default function ChartsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeDevice } = useDeviceLayout();
  const [logs, setLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [metricAId, setMetricAId] = useState<string>('');
  const [metricBId, setMetricBId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Month Navigation State for Monthly Habit Score Calendar Grid
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDayHover, setSelectedDayHover] = useState<CalendarDayScore | null>(null);

  const getLocalHabitTypeMap = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('reflect_habit_types') || '{}');
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('user_id', user.id);

        const localHabits = getLocalHabitTypeMap();
        const loadedQuestions = (qData || []).map((q: any) => ({
          ...q,
          habit_type: localHabits[q.id] || q.habit_type || 'good',
        }));

        setQuestions(loadedQuestions);

        if (loadedQuestions.length > 0) {
          setMetricAId(loadedQuestions[0].id);
          if (loadedQuestions.length > 1) {
            setMetricBId(loadedQuestions[1].id);
          } else {
            setMetricBId(loadedQuestions[0].id);
          }
        }

        const { data: logData } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        setLogs(logData || []);
      } catch (err) {
        console.error('Error fetching data for charts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Generate Monthly Habit Score Calendar Grid Days
  const getMonthlyCalendarGrid = (): CalendarDayScore[] => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const logMap = new Map(logs.map((l) => [l.date, l]));
    const days: CalendarDayScore[] = [];

    // Padding for previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDayNum);
      const yyyy = prevDate.getFullYear();
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(prevDayNum).padStart(2, '0');
      days.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: prevDayNum,
        goodCount: 0,
        badAvoidedCount: 0,
        badIndulgedCount: 0,
        netScore: 0,
        hasLog: false,
        inCurrentMonth: false,
      });
    }

    // Days for current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const logEntry = logMap.get(dateStr);

      let goodCount = 0;
      let badAvoidedCount = 0;
      let badIndulgedCount = 0;
      let hasLog = Boolean(logEntry);

      if (logEntry && questions.length > 0) {
        questions.forEach((q) => {
          const resp = logEntry.responses?.[q.id];
          const habitType = q.habit_type || 'good';

          if (resp !== undefined && resp !== null && resp !== '') {
            if (q.type === 'boolean') {
              if (habitType === 'good') {
                if (resp === true) goodCount++;
              } else if (habitType === 'bad') {
                if (resp === false) badAvoidedCount++;
                else if (resp === true) badIndulgedCount++;
              }
            } else if (q.type === 'scale_1_to_5') {
              if (Number(resp) >= 4) goodCount++;
            } else if (q.type === 'number') {
              if (Number(resp) > 0) goodCount++;
            }
          }
        });
      }

      const netScore = (goodCount + badAvoidedCount) - (badIndulgedCount * 1.5);

      days.push({
        dateStr,
        dayNum: day,
        goodCount,
        badAvoidedCount,
        badIndulgedCount,
        netScore,
        hasLog,
        inCurrentMonth: true,
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  // 1. Dynamic Metric Correlation Data Extractor
  const getCustomCorrelationData = () => {
    if (!metricAId || !metricBId || logs.length === 0) return [];

    const qA = questions.find((q) => q.id === metricAId);
    const qB = questions.find((q) => q.id === metricBId);

    const parseVal = (resp: any, q: any) => {
      if (resp === undefined || resp === null || resp === '') return 0;
      if (q?.type === 'boolean') {
        if (q?.habit_type === 'bad') return resp === false ? 1 : 0;
        return resp === true ? 1 : 0;
      }
      if (q?.type === 'number' || q?.type === 'scale_1_to_5') return Number(resp) || 0;
      return 1;
    };

    return logs.map((log) => {
      const d = new Date(log.date);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const rawA = log.responses?.[metricAId];
      const rawB = log.responses?.[metricBId];

      const valA = parseVal(rawA, qA);
      const valB = parseVal(rawB, qB);

      return {
        date: dateLabel,
        valA,
        valB,
        labelA: qA?.prompt || 'Metric A',
        labelB: qB?.prompt || 'Metric B',
      };
    });
  };

  // 2. Compute Statistical Correlation Insight Text
  const getCorrelationInsightText = () => {
    const correlationData = getCustomCorrelationData();
    if (correlationData.length < 2) {
      return "Log more daily entries to unlock automated statistical correlation insights!";
    }

    const qA = questions.find((q) => q.id === metricAId);
    const qB = questions.find((q) => q.id === metricBId);

    const sumA = correlationData.reduce((acc, d) => acc + d.valA, 0);
    const sumB = correlationData.reduce((acc, d) => acc + d.valB, 0);
    const avgA = sumA / correlationData.length;
    const avgB = sumB / correlationData.length;

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    correlationData.forEach((d) => {
      const diffA = d.valA - avgA;
      const diffB = d.valB - avgB;
      numerator += diffA * diffB;
      denomA += diffA * diffA;
      denomB += diffB * diffB;
    });

    const denominator = Math.sqrt(denomA * denomB);
    const r = denominator !== 0 ? numerator / denominator : 0;

    const labelA = qA?.prompt.length > 25 ? qA?.prompt.slice(0, 25) + '...' : qA?.prompt;
    const labelB = qB?.prompt.length > 25 ? qB?.prompt.slice(0, 25) + '...' : qB?.prompt;

    if (r > 0.4) {
      return `📈 Strong Alignment: Higher values in "${labelA}" consistently align with higher outcomes in "${labelB}" (r = ${r.toFixed(2)}).`;
    } else if (r < -0.4) {
      return `📉 Inverse Correlation: Higher values in "${labelA}" correspond to lower outcomes in "${labelB}" (r = ${r.toFixed(2)}).`;
    } else {
      return `⚖️ Balanced Patterns: "${labelA}" and "${labelB}" show steady, independent daily tracking trends.`;
    }
  };

  // 3. Prepare 14-Day Activity Trend Data
  const get14DayTrendData = () => {
    const logMap = new Map(logs.map((l) => [l.date, l]));
    const data = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const entry = logMap.get(dateStr);

      data.push({
        date: shortLabel,
        checkIn: entry ? 1 : 0,
      });
    }
    return data;
  };

  // 4. Prepare Habit Completion Rates
  const getHabitCompletionData = () => {
    if (!questions || questions.length === 0 || !logs || logs.length === 0) return [];

    return questions.map((q) => {
      let successCount = 0;
      const isBadHabit = q.habit_type === 'bad';

      logs.forEach((log) => {
        const resp = log.responses?.[q.id];
        if (resp !== undefined && resp !== null && resp !== '') {
          if (q.type === 'boolean') {
            if (isBadHabit && resp === false) successCount++;
            else if (!isBadHabit && resp === true) successCount++;
          } else {
            successCount++;
          }
        }
      });

      const rate = Math.round((successCount / logs.length) * 100);
      const prefix = isBadHabit ? 'Avoided ' : '';
      const promptText = q.prompt.length > 16 ? q.prompt.slice(0, 16) + '...' : q.prompt;

      return {
        name: `${prefix}${promptText}`,
        completionRate: rate,
        habitType: q.habit_type || 'good',
      };
    });
  };

  // 5. Calculate Key Metrics
  const getSummaryMetrics = () => {
    const totalLogs = logs.length;
    const daysInMonth = 30;
    const consistencyRate = Math.min(100, Math.round((totalLogs / daysInMonth) * 100));

    const sleepQ = questions.find((q) => q.type === 'number' || q.prompt.toLowerCase().includes('sleep'));
    const moodQ = questions.find((q) => q.type === 'scale_1_to_5' || q.prompt.toLowerCase().includes('mood'));

    let avgSleep = 0;
    let avgMood = 0;

    if (totalLogs > 0) {
      if (sleepQ) {
        const totalSleep = logs.reduce((sum, l) => sum + (Number(l.responses?.[sleepQ.id]) || 0), 0);
        avgSleep = Math.round((totalSleep / totalLogs) * 10) / 10;
      }
      if (moodQ) {
        const totalMood = logs.reduce((sum, l) => sum + (Number(l.responses?.[moodQ.id]) || 0), 0);
        avgMood = Math.round((totalMood / totalLogs) * 10) / 10;
      }
    }

    return { totalLogs, consistencyRate, avgSleep, avgMood };
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-zinc-500 text-xs font-handwritten text-lg">Generating interactive charts...</span>
      </div>
    );
  }

  const isDesktop = activeDevice === 'desktop';
  const correlationData = getCustomCorrelationData();
  const correlationInsight = getCorrelationInsightText();
  const trendData = get14DayTrendData();
  const habitData = getHabitCompletionData();
  const metrics = getSummaryMetrics();
  const calendarGrid = getMonthlyCalendarGrid();

  const selectedQA = questions.find((q) => q.id === metricAId);
  const selectedQB = questions.find((q) => q.id === metricBId);

  const monthYearLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const pieData = [
    { name: 'Completed Days', value: metrics.consistencyRate },
    { name: 'Remaining', value: 100 - metrics.consistencyRate },
  ];

  const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="craft-card p-3 border border-zinc-800 text-xs font-ios-mono space-y-1 shadow-xl bg-zinc-950">
          <p className="font-bold text-zinc-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || 'var(--accent)' }}>
              {entry.name}: <span className="font-black">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs uppercase tracking-widest font-extrabold font-ios-mono" style={{ color: 'var(--accent)' }}>
            Analytics & Insights
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight font-ios-serif">
          Performance Charts & Habit Calendar
        </h1>
        <p className="text-base text-zinc-400 font-handwritten text-xl leading-snug">
          Monthly habit score heatmap (Good 🟢 vs Bad 🔴), habit completion rates, and correlation analysis.
        </p>
      </div>

      {/* Metric Cards Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="craft-card p-4 space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-ios-mono">
            <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Check-ins</span>
          </div>
          <span className="text-2xl font-black font-ios-rounded text-zinc-100">{metrics.totalLogs}</span>
          <span className="block text-[10px] text-zinc-500 font-ios-mono">Total reflections</span>
        </div>

        <div className="craft-card p-4 space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-ios-mono">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Consistency</span>
          </div>
          <span className="text-2xl font-black font-ios-rounded text-emerald-400">{metrics.consistencyRate}%</span>
          <span className="block text-[10px] text-zinc-500 font-ios-mono">30-Day Rate</span>
        </div>

        <div className="craft-card p-4 space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-ios-mono">
            <Bed className="w-4 h-4 text-cyan-400" />
            <span>Avg Sleep</span>
          </div>
          <span className="text-2xl font-black font-ios-rounded text-cyan-300">{metrics.avgSleep || '-'} hrs</span>
          <span className="block text-[10px] text-zinc-500 font-ios-mono">Nightly average</span>
        </div>

        <div className="craft-card p-4 space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-ios-mono">
            <Smile className="w-4 h-4 text-amber-400" />
            <span>Avg Mood</span>
          </div>
          <span className="text-2xl font-black font-ios-rounded text-amber-300">{metrics.avgMood || '-'}/5</span>
          <span className="block text-[10px] text-zinc-500 font-ios-mono">Overall score</span>
        </div>
      </div>

      {/* NEW FEATURE: Monthly Habit Score Calendar Grid (Green 🟢 / Red 🔴 Spectrum) */}
      <div className="craft-card p-5 space-y-4 border-2" style={{ borderColor: 'var(--accent-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-3">
          <div className="flex items-center space-x-2.5">
            <CalendarIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="text-lg font-extrabold text-zinc-100 font-ios-serif">Monthly Habit Score Heatmap</h2>
              <p className="text-xs text-zinc-400 font-ios-sans">Daily boxes shaded by Good 🟢 vs Bad 🔴 habit balance score.</p>
            </div>
          </div>

          {/* Month Navigation Toolbar */}
          <div className="flex items-center space-x-3 self-end sm:self-auto font-ios-mono">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-200 min-w-[110px] text-center font-ios-rounded">{monthYearLabel}</span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Color Spectrum Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 text-[10px] font-ios-mono text-zinc-400">
          <span className="font-bold text-zinc-300">Habit Score Spectrum:</span>
          <div className="flex items-center space-x-2.5">
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400 shadow-sm"></div>
              <span>Awesome (+3)</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/50"></div>
              <span>Good (+1)</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700"></div>
              <span>Neutral (0)</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-red-500/40 border border-red-500/50"></div>
              <span>Struggle (-1)</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-red-500 border border-red-400 shadow-sm"></div>
              <span>Heavy Bad (-3)</span>
            </span>
          </div>
        </div>

        {/* 7-Column Monthly Calendar Grid */}
        <div className="space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-zinc-500 font-ios-mono uppercase">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Squares Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((day, idx) => {
              if (!day.inCurrentMonth) {
                return (
                  <div key={idx} className="h-11 sm:h-14 rounded-xl bg-zinc-950/20 border border-zinc-900/40 opacity-20"></div>
                );
              }

              // Spectrum style selection
              let bgStyle = "bg-zinc-950/40 border-zinc-850/60 text-zinc-650";
              if (day.hasLog) {
                if (day.netScore >= 3) {
                  bgStyle = "bg-emerald-500 text-zinc-950 font-black border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]";
                } else if (day.netScore >= 1) {
                  bgStyle = "bg-emerald-500/40 text-emerald-200 font-bold border-emerald-500/60";
                } else if (day.netScore === 0) {
                  bgStyle = "bg-zinc-800 text-zinc-300 font-bold border-zinc-700";
                } else if (day.netScore <= -3) {
                  bgStyle = "bg-red-500 text-zinc-50 font-black border-red-400 shadow-md shadow-red-500/20 scale-[1.02]";
                } else if (day.netScore <= -1) {
                  bgStyle = "bg-red-500/40 text-red-200 font-bold border-red-500/60";
                }
              }

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setSelectedDayHover(day)}
                  onClick={() => setSelectedDayHover(day)}
                  className={`h-11 sm:h-14 rounded-xl border p-1.5 flex flex-col justify-between transition-all cursor-pointer relative group ${bgStyle}`}
                >
                  <span className="text-xs font-ios-mono font-bold leading-none">{day.dayNum}</span>
                  
                  {day.hasLog && (
                    <div className="flex items-center justify-end space-x-1 text-[9px] font-ios-mono">
                      {day.goodCount + day.badAvoidedCount > 0 && (
                        <span className="text-emerald-300 font-bold">🟢{day.goodCount + day.badAvoidedCount}</span>
                      )}
                      {day.badIndulgedCount > 0 && (
                        <span className="text-red-300 font-bold">🔴{day.badIndulgedCount}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Card */}
        {selectedDayHover && (
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-ios-mono space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
              <span className="font-bold text-zinc-200">Details for {selectedDayHover.dateStr}</span>
              <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                selectedDayHover.netScore > 0 ? 'bg-emerald-500/20 text-emerald-300' : selectedDayHover.netScore < 0 ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-400'
              }`}>
                Net Score: {selectedDayHover.netScore > 0 ? `+${selectedDayHover.netScore}` : selectedDayHover.netScore}
              </span>
            </div>
            {selectedDayHover.hasLog ? (
              <div className="flex flex-wrap gap-4 text-zinc-300 pt-1">
                <span>🟢 Good Habits Done: <strong>{selectedDayHover.goodCount}</strong></span>
                <span>🛡️ Bad Habits Avoided: <strong>{selectedDayHover.badAvoidedCount}</strong></span>
                <span>🔴 Bad Habits Indulged: <strong>{selectedDayHover.badIndulgedCount}</strong></span>
              </div>
            ) : (
              <p className="text-zinc-500">No log recorded for this date.</p>
            )}
          </div>
        )}
      </div>

      {/* TOP FEATURE: Custom 2-Metric Correlation Explorer */}
      <div className="craft-card p-5 space-y-4 border-2" style={{ borderColor: 'var(--accent-border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div 
              className="p-2 rounded-xl border shrink-0"
              style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-100 font-ios-serif">2-Metric Correlation Explorer</h2>
              <p className="text-xs text-zinc-400 font-ios-sans">Compare any 2 prompts to discover how habits affect your daily mindset.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-ios-mono uppercase font-bold">Interactive Dual-Axis</span>
          </div>
        </div>

        {/* Dropdown Selectors Toolbar */}
        <div className="grid gap-3 sm:grid-cols-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-400 font-ios-mono uppercase">
              Metric A (Primary / Area Fill):
            </label>
            <select
              value={metricAId}
              onChange={(e) => setMetricAId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-ios-sans text-zinc-200 focus:outline-none cursor-pointer"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.habit_type === 'bad' ? '🔴' : q.habit_type === 'good' ? '🟢' : '⚪'} {q.prompt} ({q.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-400 font-ios-mono uppercase">
              Metric B (Secondary / Line Stroke):
            </label>
            <select
              value={metricBId}
              onChange={(e) => setMetricBId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-ios-sans text-zinc-200 focus:outline-none cursor-pointer"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.habit_type === 'bad' ? '🔴' : q.habit_type === 'good' ? '🟢' : '⚪'} {q.prompt} ({q.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Insight Badge */}
        <div 
          className="p-3.5 rounded-xl border text-xs text-zinc-200 flex items-start space-x-2.5 font-ios-sans"
          style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
        >
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <span>{correlationInsight}</span>
        </div>

        {/* Dynamic Dual-Axis Correlation Chart */}
        <div className="h-72 w-full pt-2">
          {correlationData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-handwritten text-lg">
              Log daily entries to visualize your 2-metric correlation line.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={correlationData}>
                <defs>
                  <linearGradient id="metricAGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                <YAxis yAxisId="left" stroke="var(--accent)" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={10} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="valA" 
                  name={selectedQA?.prompt || 'Metric A'} 
                  stroke="var(--accent)" 
                  fillOpacity={1} 
                  fill="url(#metricAGrad)" 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="valB" 
                  name={selectedQB?.prompt || 'Metric B'} 
                  stroke="#fbbf24" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#fbbf24' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className={`grid gap-6 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Chart 1: 14-Day Check-in Activity Trend */}
        <div className="craft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">14-Day Check-in Trend</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-ios-mono">Daily Activity</span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} domain={[0, 1]} ticks={[0, 1]} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="checkIn" name="Completed" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Habit Completion & Bad Habit Avoidance Rates */}
        <div className="craft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">Habit Success Rates (%)</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-ios-mono">Good / Bad Avoidance</span>
          </div>

          <div className="h-60 w-full pt-2">
            {habitData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-handwritten text-lg">
                No active habit data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" domain={[0, 100]} stroke="#71717a" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={10} width={110} tickLine={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Bar dataKey="completionRate" name="Success Rate (%)" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: 30-Day Consistency Doughnut */}
        <div className="craft-card p-5 space-y-4 col-span-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">Monthly Consistency Ratio</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-ios-mono">Overall Ratio</span>
          </div>

          <div className="h-60 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell key="cell-0" fill="var(--accent)" />
                  <Cell key="cell-1" fill="rgba(255,255,255,0.05)" />
                </Pie>
                <Tooltip content={<CUSTOM_TOOLTIP />} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-ios-rounded" style={{ color: 'var(--accent)' }}>
                {metrics.consistencyRate}%
              </span>
              <span className="text-[10px] text-zinc-500 font-ios-mono font-bold uppercase">Consistency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
