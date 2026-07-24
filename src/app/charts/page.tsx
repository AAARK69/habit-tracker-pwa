'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout } from '@/contexts/DeviceLayoutContext';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { 
  BarChart3, TrendingUp, Smile, Bed, Flame, Award, 
  Loader2, Activity, PieChart as PieIcon, Sparkles
} from 'lucide-react';

export default function ChartsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeDevice } = useDeviceLayout();
  const [logs, setLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
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

        setQuestions(qData || []);

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

  // 1. Prepare 14-Day Activity Trend Data
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

  // 2. Prepare Habit Completion Rates
  const getHabitCompletionData = () => {
    if (!questions || questions.length === 0 || !logs || logs.length === 0) return [];

    return questions.map((q) => {
      let completedCount = 0;
      logs.forEach((log) => {
        const resp = log.responses?.[q.id];
        if (resp !== undefined && resp !== null && resp !== '') {
          if (q.type === 'boolean' && resp === true) completedCount++;
          else if (q.type !== 'boolean') completedCount++;
        }
      });

      const rate = Math.round((completedCount / logs.length) * 100);
      return {
        name: q.prompt.length > 18 ? q.prompt.slice(0, 18) + '...' : q.prompt,
        completionRate: rate,
      };
    });
  };

  // 3. Prepare Sleep vs Mood Correlation Data
  const getSleepMoodData = () => {
    const sleepQ = questions.find((q) => q.type === 'number' || q.prompt.toLowerCase().includes('sleep'));
    const moodQ = questions.find((q) => q.type === 'scale_1_to_5' || q.prompt.toLowerCase().includes('mood'));

    return logs.map((log) => {
      const d = new Date(log.date);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sleep = sleepQ ? Number(log.responses?.[sleepQ.id]) || 0 : 7;
      const mood = moodQ ? Number(log.responses?.[moodQ.id]) || 3 : 3;

      return {
        date: dateLabel,
        sleepHours: sleep,
        moodScore: mood,
      };
    });
  };

  // 4. Calculate Key Metrics
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
  const trendData = get14DayTrendData();
  const habitData = getHabitCompletionData();
  const sleepMoodData = getSleepMoodData();
  const metrics = getSummaryMetrics();

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
          Visual metrics, habit completion rates, and sleep-mood correlations.
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

      {/* Main Charts Grid: 2-column on 16:9 PC Desktop vs 1-column on Mobile */}
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

        {/* Chart 2: Habit Completion Rates Bar Chart */}
        <div className="craft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">Habit Completion Rates (%)</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-ios-mono">By Prompt</span>
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
                  <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={10} width={100} tickLine={false} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Bar dataKey="completionRate" name="Completion Rate (%)" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Sleep vs Mood Correlation Area Chart */}
        <div className="craft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">Sleep vs Mood Correlation</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-ios-mono">Health Overlay</span>
          </div>

          <div className="h-60 w-full pt-2">
            {sleepMoodData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-handwritten text-lg">
                Log entries with sleep and mood to reveal health insights.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sleepMoodData}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                  <YAxis stroke="#71717a" fontSize={10} />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Area type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#06b6d4" fillOpacity={1} fill="url(#sleepGrad)" />
                  <Area type="monotone" dataKey="moodScore" name="Mood (1-5)" stroke="#f59e0b" fillOpacity={1} fill="url(#moodGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: 30-Day Consistency Doughnut */}
        <div className="craft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">Monthly Consistency Gauge</h2>
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
                  innerRadius={60}
                  outerRadius={85}
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
