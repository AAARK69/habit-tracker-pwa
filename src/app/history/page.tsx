'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Dumbbell, Bed, Smile, Sparkles, BookOpen, GlassWater, 
  Brain, Flame, Heart, Coffee, ClipboardList, CheckSquare, 
  HelpCircle, Calendar, MessageSquare, Check, X, Loader2,
  Activity, Search, Filter, Layers, LayoutGrid, List
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

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'matrix'>('timeline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data: questions, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('user_id', user.id);

        if (qError) throw qError;

        const qMap: Record<string, any> = {};
        questions?.forEach((q) => {
          qMap[q.id] = q;
        });
        setQuestionsMap(qMap);

        const { data: dailyLogs, error: logsError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (logsError) throw logsError;
        setLogs(dailyLogs || []);
      } catch (err) {
        console.error('Error fetching reflection history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const generateHeatmapDays = () => {
    const loggedDatesSet = new Set(logs.map((l) => l.date));
    const days = [];
    const now = new Date();

    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      days.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isLogged: loggedDatesSet.has(dateStr),
      });
    }
    return days;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const dateMatch = formatDate(log.date).toLowerCase().includes(query);
    const respMatch = Object.values(log.responses || {}).some(
      (val) => String(val).toLowerCase().includes(query)
    );
    return dateMatch || respMatch;
  });

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-zinc-500 text-xs font-handwritten text-lg">Retrieving your journal logs...</span>
      </div>
    );
  }

  const heatmapDays = generateHeatmapDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs uppercase tracking-widest font-extrabold font-ios-mono" style={{ color: 'var(--accent)' }}>Timeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight font-ios-serif">
          Reflection History
        </h1>
        <p className="text-base text-zinc-400 font-handwritten text-xl leading-snug">
          Scroll through your past journal entries, search written reflections, and track consistency.
        </p>
      </div>

      {/* Toolbar: Keyword Search & View Switcher */}
      <div className="craft-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search entries or reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-zinc-950/70 border border-zinc-850 rounded-xl text-xs font-ios-sans text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-850 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded-lg text-xs font-ios-mono flex items-center space-x-1.5 transition-colors cursor-pointer ${
              viewMode === 'timeline' ? 'bg-zinc-850 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 rounded-lg text-xs font-ios-mono flex items-center space-x-1.5 transition-colors cursor-pointer ${
              viewMode === 'matrix' ? 'bg-zinc-850 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
            <span>28-Day Grid</span>
          </button>
        </div>
      </div>

      {/* 28-Day Matrix View Mode */}
      {viewMode === 'matrix' ? (
        <div className="craft-card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-bold text-zinc-200 font-ios-sans">28-Day Consistency Heatmap Grid</h2>
            </div>
            <span className="text-xs text-zinc-500 font-ios-mono">{logs.length} Total Check-ins</span>
          </div>

          <div className="grid grid-cols-7 gap-2.5 pt-2">
            {heatmapDays.map((day) => (
              <div
                key={day.dateStr}
                style={day.isLogged ? { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  day.isLogged
                    ? 'shadow-md scale-105 font-bold'
                    : 'bg-zinc-950/40 border-zinc-850/60 text-zinc-650'
                }`}
              >
                <span className="text-[10px] font-bold font-ios-mono uppercase opacity-80">{day.dayName}</span>
                <span className="text-base font-black font-ios-rounded mt-0.5">{day.dayNum}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Timeline Feed Mode */
        filteredLogs.length === 0 ? (
          <div className="craft-card p-12 text-center space-y-3 border-zinc-850 text-zinc-450 font-handwritten text-xl">
            <Calendar className="w-10 h-10 text-zinc-650 mx-auto" />
            <p className="text-zinc-400">
              {searchQuery ? 'No matching reflections found.' : 'No reflections logged yet.'}
            </p>
          </div>
        ) : (
          <div className="relative border-l border-zinc-850 ml-3.5 pl-6 space-y-6">
            {filteredLogs.map((log) => {
              const responses = log.responses || {};
              const answeredIds = Object.keys(responses);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center group-hover:border-teal-400/80 transition-all duration-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-teal-450 transition-all duration-300"></div>
                  </div>

                  {/* Entry Card */}
                  <div className="craft-card p-5 space-y-4 hover:border-zinc-800 transition-all duration-300 shadow">
                    <div className="flex justify-between items-center border-b border-zinc-850/65 pb-2.5">
                      <span className="text-xs font-bold font-ios-mono" style={{ color: 'var(--accent)' }}>
                        {formatDate(log.date)}
                      </span>
                      <span className="text-[10px] text-zinc-550 font-ios-mono">
                        Logged at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {answeredIds.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No answers saved for this day.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {answeredIds.map((qId) => {
                          const q = questionsMap[qId];
                          const val = responses[qId];
                          const prompt = q ? q.prompt : 'Deleted Prompt';
                          const type = q ? q.type : 'text';
                          const icon = q ? q.icon : 'help-circle';
                          const IconComponent = IconMap[icon] || HelpCircle;

                          return (
                            <div 
                              key={qId} 
                              className={`p-3 rounded-xl border border-zinc-850/50 bg-zinc-950/20 flex flex-col justify-between space-y-2 ${
                                type === 'text' ? 'sm:col-span-2' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="p-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 shrink-0">
                                  <IconComponent className="w-3.5 h-3.5" />
                                </div>
                                <span className="block text-xs font-semibold text-zinc-450 leading-tight font-ios-sans">
                                  {prompt}
                                </span>
                              </div>

                              {/* Yes/No answer */}
                              {type === 'boolean' && (
                                <div className="flex items-center mt-1 font-ios-rounded">
                                  {val === true ? (
                                    <span 
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border"
                                      style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                                    >
                                      <Check className="w-3.5 h-3.5 mr-0.5" /> Yes
                                    </span>
                                  ) : val === false ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/20">
                                      <X className="w-3.5 h-3.5 mr-0.5" /> No
                                    </span>
                                  ) : (
                                    <span className="text-xs text-zinc-500 italic">-</span>
                                  )}
                                </div>
                              )}

                              {/* Numeric answer */}
                              {type === 'number' && (
                                <span className="text-sm font-bold text-zinc-200 font-ios-mono mt-1 pl-0.5">
                                  {val !== null && val !== undefined ? String(val) : '-'}
                                </span>
                              )}

                              {/* Scale rating */}
                              {type === 'scale_1_to_5' && (
                                <div className="flex items-center space-x-1 mt-1 pl-0.5 font-ios-rounded">
                                  <span className="text-sm font-black font-ios-rounded text-lg" style={{ color: 'var(--accent)' }}>
                                    {val}
                                  </span>
                                  <span className="text-zinc-650 text-xs font-ios-mono">/ 5</span>
                                  <span className="text-[10px] text-zinc-500 font-bold font-ios-mono uppercase tracking-wider ml-1">
                                    ({val === 5 ? 'Excellent' : val === 4 ? 'Good' : val === 3 ? 'Neutral' : val === 2 ? 'Bad' : 'Terrible'})
                                  </span>
                                </div>
                              )}

                              {/* Written reflection */}
                              {type === 'text' && (
                                <div className="mt-1 flex items-start space-x-2 text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-lg w-full">
                                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-1" />
                                  <p className="text-base font-handwritten leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                    {val || '-'}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
