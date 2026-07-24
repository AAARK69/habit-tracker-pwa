'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import NotificationToggle from '@/components/NotificationToggle';
import { 
  Dumbbell, Bed, Smile, Sparkles, BookOpen, GlassWater, 
  Brain, Flame, Heart, Coffee, ClipboardList, CheckSquare, 
  HelpCircle, CheckCircle, Edit3, Loader2, Check, X, 
  MessageSquare
} from 'lucide-react';

// Client-side Icon Mapper
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
  const [questions, setQuestions] = useState<any[]>([]);
  const [log, setLog] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const getLocalTodayDateStr = () => {
    const dateObj = new Date();
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const todayStr = getLocalTodayDateStr();

        // 1. Fetch active questions
        const { data: activeQuestions, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (qError) throw qError;
        setQuestions(activeQuestions || []);

        // 2. Fetch today's log
        const { data: todayLog, error: logError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', todayStr)
          .maybeSingle();

        if (logError) throw logError;

        if (todayLog) {
          setLog(todayLog);
          setAnswers(todayLog.responses || {});
          setIsEditing(false);
        } else {
          setLog(null);
          setIsEditing(true);
          
          const initialAnswers: Record<string, any> = {};
          activeQuestions?.forEach((q) => {
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

    fetchData();
  }, [user]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const todayStr = getLocalTodayDateStr();

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
            date: todayStr,
            responses: answers,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

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
        <Loader2 className="w-8 h-8 animate-spin text-teal-450" />
        <span className="text-zinc-550 text-xs font-mono">Loading your daily reflection...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header reflection */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-teal-405">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-extrabold font-mono">Daily Check-in</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight">
          {isEditing ? "Log Your Day" : "Daily Completed"}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {isEditing 
            ? "Take a moment to reflect on your habits, actions, and mindset."
            : "Your entry is saved. Rest well and check in again tomorrow!"}
        </p>
      </div>

      {/* Subscription Settings Banner */}
      <NotificationToggle />

      {/* Main Form or Log Completed View */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center space-y-3 border-zinc-800 bg-zinc-900/10">
              <ClipboardList className="w-10 h-10 text-zinc-650 mx-auto" />
              <p className="text-zinc-400 text-sm">
                No active questions found. Go to Settings to configure your tracker checklist.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const value = answers[q.id];
                const IconComponent = IconMap[q.icon] || HelpCircle;

                return (
                  <div 
                    key={q.id} 
                    className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 space-y-4 transition-all duration-200 hover:border-zinc-800"
                  >
                    {/* Header: Icon + Prompt */}
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/10 shrink-0">
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>
                      <label className="block text-sm font-bold text-zinc-200">
                        {q.prompt}
                      </label>
                    </div>

                    {/* Boolean Selector */}
                    {q.type === 'boolean' && (
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, true)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer ${
                            value === true
                              ? 'bg-teal-500/10 border-teal-500/40 text-teal-400 shadow-lg shadow-teal-500/5'
                              : 'bg-zinc-900/40 border-zinc-850 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/80 hover:border-zinc-800'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 transition-transform ${value === true ? 'scale-110' : ''}`} />
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, false)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer ${
                            value === false
                              ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-lg shadow-red-500/5'
                              : 'bg-zinc-900/40 border-zinc-850 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/80 hover:border-zinc-800'
                          }`}
                        >
                          <X className={`w-3.5 h-3.5 transition-transform ${value === false ? 'scale-110' : ''}`} />
                          <span>No</span>
                        </button>
                      </div>
                    )}

                    {/* Number Input */}
                    {q.type === 'number' && (
                      <div className="relative">
                        <input
                          type="number"
                          value={value ?? ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Enter quantity"
                          required
                          className="w-full px-3.5 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm font-mono"
                        />
                      </div>
                    )}

                    {/* Scale Rating (1-5 circles) */}
                    {q.type === 'scale_1_to_5' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const labels = ['Terrible', 'Bad', 'Neutral', 'Good', 'Excellent'];
                            const isSelected = value === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, num)}
                                className={`w-10 h-10 rounded-full text-xs font-extrabold border transition-all duration-350 flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-500/15 border-teal-500/40 text-teal-400 shadow-md shadow-teal-500/5 scale-110'
                                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                                }`}
                                title={labels[num - 1]}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-550 px-1 font-mono uppercase tracking-wider">
                          <span>Terrible</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                    )}

                    {/* Text Reflection */}
                    {q.type === 'text' && (
                      <textarea
                        value={value ?? ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Reflect on your day..."
                        required
                        rows={3}
                        className="w-full px-3.5 py-3 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-205 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm leading-relaxed resize-none"
                      />
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={submitting}
                className="glow-btn w-full py-3.5 bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-bold text-sm rounded-xl hover:opacity-95 shadow-lg shadow-teal-500/10 transition-opacity flex justify-center items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
                ) : (
                  <span>Submit Today's Reflections</span>
                )}
              </button>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-teal-500/15 bg-teal-500/5 flex flex-col items-center text-center space-y-3.5 shadow-md shadow-teal-900/5">
            <CheckCircle className="w-12 h-12 text-teal-400" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-200">Completed for Today</h3>
              <p className="text-zinc-400 text-sm">
                Responses for {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} have been logged.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 transition-all text-zinc-300 cursor-pointer shadow shadow-black/60"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-450" />
              <span>Modify Responses</span>
            </button>
          </div>

          {/* Render read-only responses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-widest pl-1 font-mono">Your Entry Summary</h4>
            {questions.map((q) => {
              const val = answers[q.id];
              const IconComponent = IconMap[q.icon] || HelpCircle;

              return (
                <div 
                  key={q.id} 
                  className="glass-panel p-4 rounded-xl border border-zinc-850/80 bg-zinc-900/5 flex flex-col space-y-2.5 sm:flex-row sm:space-y-0 sm:items-center sm:justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-zinc-900/70 border border-zinc-850 text-zinc-400 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-450 leading-tight">{q.prompt}</span>
                  </div>

                  {q.type === 'text' ? (
                    <div className="text-xs italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 flex items-start space-x-1.5 text-zinc-350 sm:max-w-md w-full">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed whitespace-pre-wrap">{val || '-'}</p>
                    </div>
                  ) : (
                    <span className="text-sm font-extrabold text-zinc-200 self-end sm:self-auto font-mono">
                      {val === true ? 'Yes' : val === false ? 'No' : val === '' || val === null ? '-' : String(val)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
