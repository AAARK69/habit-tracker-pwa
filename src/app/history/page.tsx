'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, MessageSquare, Check, X, Award, Loader2, Sparkles } from 'lucide-react';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // 1. Fetch all questions to map prompts
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

        // 2. Fetch all daily logs ordered by date desc
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
    // Prevent timezone shifts during parsing by appending standard time offset or parsing date parts
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-zinc-500 text-xs font-mono">Retrieving your journey logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-teal-400">
          <Calendar className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Timeline</span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight sm:text-3xl">
          Reflection History
        </h1>
        <p className="text-sm text-zinc-400">
          Scroll through your entries and reflect on your growth over time.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3 border-zinc-800">
          <Calendar className="w-12 h-12 text-zinc-650 mx-auto" />
          <p className="text-zinc-400 text-sm">
            No reflections logged yet. Submit your first daily checklist on the Track tab!
          </p>
        </div>
      ) : (
        <div className="relative border-l border-zinc-800/80 ml-3.5 pl-6 space-y-6">
          {logs.map((log) => {
            const responses = log.responses || {};
            const answeredIds = Object.keys(responses);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-teal-400/80 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-teal-400/80 transition-all"></div>
                </div>

                {/* Entry Card */}
                <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10 space-y-4 hover:border-zinc-700/60 transition-colors">
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2.5">
                    <span className="text-xs font-semibold text-teal-400/90 font-mono">
                      {formatDate(log.date)}
                    </span>
                    <span className="text-[10px] text-zinc-550 font-medium">
                      Logged at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {answeredIds.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No answers saved for this day.</p>
                  ) : (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {answeredIds.map((qId) => {
                        const q = questionsMap[qId];
                        const val = responses[qId];
                        const prompt = q ? q.prompt : 'Deleted Prompt';
                        const type = q ? q.type : 'text';

                        return (
                          <div 
                            key={qId} 
                            className={`p-3 rounded-xl border border-zinc-800/40 bg-zinc-950/20 ${
                              type === 'text' ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <span className="block text-xs font-semibold text-zinc-400 mb-1">
                              {prompt}
                            </span>

                            {/* Yes/No answer */}
                            {type === 'boolean' && (
                              <div className="flex items-center space-x-1.5">
                                {val === true ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/25">
                                    <Check className="w-3 h-3 mr-0.5" /> Yes
                                  </span>
                                ) : val === false ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/25">
                                    <X className="w-3 h-3 mr-0.5" /> No
                                  </span>
                                ) : (
                                  <span className="text-xs text-zinc-500 italic">-</span>
                                )}
                              </div>
                            )}

                            {/* Numeric answer */}
                            {type === 'number' && (
                              <span className="text-sm font-bold text-zinc-200 font-mono">
                                {val !== null && val !== undefined ? String(val) : '-'}
                              </span>
                            )}

                            {/* Scale rating */}
                            {type === 'scale_1_to_5' && (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-sm font-bold text-teal-400 font-mono">
                                  {val}
                                </span>
                                <span className="text-zinc-600 text-xs">/ 5</span>
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  ({val === 5 ? 'Excellent' : val === 4 ? 'Good' : val === 3 ? 'Neutral' : val === 2 ? 'Bad' : 'Terrible'})
                                </span>
                              </div>
                            )}

                            {/* Written reflection */}
                            {type === 'text' && (
                              <div className="mt-1 flex items-start space-x-2 text-zinc-300 bg-zinc-900/35 border border-zinc-800/40 p-2.5 rounded-lg">
                                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                <p className="text-xs italic leading-normal text-zinc-300 font-sans whitespace-pre-wrap">
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
      )}
    </div>
  );
}
