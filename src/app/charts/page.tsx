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
  ArrowRightLeft
} from 'lucide-react';

export default function ChartsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeDevice } = useDeviceLayout();
  const [logs, setLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [metricAId, setMetricAId] = useState<string>('');
  const [metricBId, setMetricBId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('user_id', user.id);

        const loadedQuestions = qData || [];
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

  // 1. Dynamic Metric Correlation Data Extractor
  const getCustomCorrelationData = () => {
    if (!metricAId || !metricBId || logs.length === 0) return [];

    const qA = questions.find((q) => q.id === metricAId);
    const qB = questions.find((q) => q.id === metricBId);

    const parseVal = (resp: any, q: any) => {
      if (resp === undefined || resp === null || resp === '') return 0;
      if (q?.type === 'boolean') {
        if (q?.habit_type === 'bad') return resp === false ? 1 : 0; // Avoidance score for bad habits
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

  // 4. Prepare Habit Completion Rates (Supports Bad Habit Avoidance Rates!)
  const getHabitCompletionData = () => {
    if (!questions || questions.length === 0 || !logs || logs.length === 0) return [];

    return questions.map((q) => {
      let successCount = 0;
      const isBadHabit = q.habit_type === 'bad';

      logs.forEach((log) => {
        const resp = log.responses?.[q.id];
        if (resp !== undefined && resp !== null && resp !== '') {
          if (q.type === 'boolean') {
            if (isBadHabit && resp === false) successCount++; // Avoided bad habit!
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

  const selectedQA = questions.find((q) => q.id === metricAId);
  const selectedQB = questions.find((q) => q.id === metricBId);

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
          Performance Charts
        </h1>
        <p className="text-base text-zinc-400 font-handwritten text-xl leading-snug">
          Visual metrics, habit completion rates (Good 🟢 vs Bad 🔴 Avoidance), and correlation analysis.
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
