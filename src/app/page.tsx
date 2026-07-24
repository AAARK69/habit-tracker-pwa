'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import NotificationToggle from '@/components/NotificationToggle';
import { ClipboardList, CheckCircle, Edit3, Loader2, Sparkles } from 'lucide-react';

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
          
          // Pre-populate empty answers object
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
        // Edit existing log
        result = await supabase
          .from('daily_logs')
          .update({ responses: answers })
          .eq('id', log.id)
          .select()
          .single();
      } else {
        // Insert new daily log
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
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-zinc-550 text-xs font-mono">Loading your reflection spaces...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header reflection */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-teal-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Daily Check-in</span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight sm:text-3xl">
          {isEditing ? "Log Your Day" : "Daily Completed"}
        </h1>
        <p className="text-sm text-zinc-400">
          {isEditing 
            ? "Take a moment to reflect on your habits, actions, and mindset."
            : "You've successfully checked in. Have a peaceful evening!"}
        </p>
      </div>

      {/* Subscription banner */}
      <NotificationToggle />

      {/* Form / Summary */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl text-center space-y-3 border-zinc-800">
              <ClipboardList className="w-12 h-12 text-zinc-500 mx-auto" />
              <p className="text-zinc-400 text-sm">
                No active questions found. Go to Settings to set up your tracker.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const value = answers[q.id];
                return (
                  <div 
                    key={q.id} 
                    className="glass-panel p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/10 space-y-3 transition-colors hover:border-zinc-700/60"
                  >
                    <label className="block text-sm font-semibold text-zinc-200">
                      {q.prompt}
                    </label>

                    {/* RENDER DYNAMIC FIELD TYPES */}
                    {q.type === 'boolean' && (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, true)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                            value === true
                              ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-sm'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, false)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                            value === false
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-sm'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {q.type === 'number' && (
                      <input
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Enter quantity"
                        required
                        className="w-full px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm"
                      />
                    )}

                    {q.type === 'scale_1_to_5' && (
                      <div className="space-y-2">
                        <div className="flex justify-between space-x-1.5">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const labels = ['Terrible', 'Bad', 'Neutral', 'Good', 'Excellent'];
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, num)}
                                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                                  value === num
                                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                }`}
                                title={labels[num - 1]}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 px-1 font-medium">
                          <span>Terrible</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                    )}

                    {q.type === 'text' && (
                      <textarea
                        value={value ?? ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Journal your thoughts..."
                        required
                        rows={3}
                        className="w-full px-3 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm leading-normal resize-none"
                      />
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={submitting}
                className="glow-btn w-full py-3 bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-semibold text-sm rounded-xl hover:opacity-95 shadow-md shadow-teal-500/10 transition-opacity flex justify-center items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <span>Submit Today's Log</span>
                )}
              </button>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-teal-500/10 bg-teal-500/5 flex flex-col items-center text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-teal-400" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-200">Completed for Today</h3>
              <p className="text-zinc-400 text-sm">
                Your entries for {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} have been stored.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors text-zinc-250 cursor-pointer shadow-sm shadow-black/40"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Log Responses</span>
            </button>
          </div>

          {/* Render read-only responses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Your Responses</h4>
            {questions.map((q) => {
              const val = answers[q.id];
              return (
                <div key={q.id} className="glass-panel p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-400">{q.prompt}</span>
                  <span className="text-sm font-bold text-zinc-200">
                    {val === true ? 'Yes' : val === false ? 'No' : val === '' || val === null ? '-' : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
