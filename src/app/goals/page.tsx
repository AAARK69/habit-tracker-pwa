'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout } from '@/contexts/DeviceLayoutContext';
import { supabase } from '@/lib/supabase';
import { triggerVariableReward, triggerHaptic, playCompletionChime } from '@/lib/feedback';
import { 
  Target, Plus, Trash2, CheckCircle2, Calendar, 
  Sparkles, Layers, Award, Loader2, ArrowRight, 
  Activity, Zap, Compass, Check
} from 'lucide-react';

const CATEGORIES = ['Health', 'Mindset', 'Career', 'Finance', 'Personal'];

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeDevice } = useDeviceLayout();
  const [goals, setGoals] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [targetValue, setTargetValue] = useState('30');
  const [unit, setUnit] = useState('days');
  const [targetDate, setTargetDate] = useState('');
  const [habitStack, setHabitStack] = useState('');
  const [linkedQuestionId, setLinkedQuestionId] = useState('');

  const fetchGoalsAndQuestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch Questions
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id);
      setQuestions(qData || []);

      // Fetch Goals
      const { data: gData, error: gError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (gError) {
        console.warn('Goals table might not be initialized yet in Supabase:', gError.message);
        setGoals([]);
      } else {
        setGoals(gData || []);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsAndQuestions();
  }, [user]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setCreating(true);

    try {
      const payload: any = {
        user_id: user.id,
        title: title.trim(),
        category,
        target_value: Number(targetValue) || 100,
        current_value: 0,
        unit: unit.trim() || 'days',
        target_date: targetDate || null,
        linked_question_id: linkedQuestionId || null,
        habit_stack: habitStack.trim() || null,
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      triggerVariableReward();
      playCompletionChime();
      triggerHaptic(30);

      setGoals((prev) => [data, ...prev]);
      setTitle('');
      setTargetValue('30');
      setUnit('days');
      setTargetDate('');
      setHabitStack('');
      setLinkedQuestionId('');
      setShowForm(false);
    } catch (err: any) {
      alert('Failed to create goal: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProgress = async (goalId: string, increment: number) => {
    triggerHaptic(15);
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const newCurrent = Math.max(0, goal.current_value + increment);
    const isNowCompleted = newCurrent >= goal.target_value && goal.current_value < goal.target_value;

    try {
      // Optimistic Update
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, current_value: newCurrent } : g))
      );

      const { error } = await supabase
        .from('goals')
        .update({ current_value: newCurrent })
        .eq('id', goalId);

      if (error) throw error;

      if (isNowCompleted) {
        triggerVariableReward();
        playCompletionChime();
        triggerHaptic(50);
      }
    } catch (err: any) {
      console.error('Error updating goal progress:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal milestone?')) return;
    try {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      await supabase.from('goals').delete().eq('id', goalId);
    } catch (err: any) {
      alert('Error deleting goal: ' + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-zinc-500 text-xs font-handwritten text-lg">Retrieving goal milestones...</span>
      </div>
    );
  }

  const isDesktop = activeDevice === 'desktop';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-xs uppercase tracking-widest font-extrabold font-ios-mono" style={{ color: 'var(--accent)' }}>
              Life OKRs & Routines
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight font-ios-serif">
            Goal Milestones
          </h1>
          <p className="text-base text-zinc-400 font-handwritten text-xl leading-snug">
            Set quarterly goals, track habits, and stack routines to lock in long-term momentum.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: 'var(--accent-gradient)', color: '#09090b' }}
          className="glow-btn px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shrink-0 font-ios-sans"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goal Creation Form Drawer / Modal */}
      {showForm && (
        <form onSubmit={handleCreateGoal} className="craft-card p-6 space-y-4 border-2 animate-fade-in" style={{ borderColor: 'var(--accent-border)' }}>
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <h2 className="text-base font-bold text-zinc-100 font-ios-serif">Create Life Goal & Habit Stack</h2>
            <span className="text-xs text-zinc-500 font-ios-mono">Quarterly / Annual</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">Goal Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Read 12 books or Run 100 miles this year"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-serif"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-sans cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">Target Deadline Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-mono cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">Target Amount</label>
              <input
                type="number"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">Unit Label</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. pages, miles, days, hrs"
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-mono"
              />
            </div>

            {/* Habit Stacking Formula */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">
                Habit Stacking Routine Formula
              </label>
              <input
                type="text"
                placeholder="e.g. After Morning Coffee ☕ → Read 10 Pages 📖"
                value={habitStack}
                onChange={(e) => setHabitStack(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-handwritten text-lg"
              />
            </div>

            {/* Link to Questionnaire Prompt */}
            {questions.length > 0 && (
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-zinc-400 font-ios-mono uppercase">
                  Link to Habit Prompt (Optional)
                </label>
                <select
                  value={linkedQuestionId}
                  onChange={(e) => setLinkedQuestionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-sm font-ios-sans cursor-pointer"
                >
                  <option value="">None (Standalone Goal)</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.prompt} ({q.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-850 cursor-pointer font-ios-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              style={{ background: 'var(--accent-gradient)', color: '#09090b' }}
              className="px-5 py-2 rounded-xl font-extrabold text-xs shadow cursor-pointer font-ios-sans disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Goal Milestone'}
            </button>
          </div>
        </form>
      )}

      {/* Goals Feed Grid */}
      {goals.length === 0 ? (
        <div className="craft-card p-12 text-center space-y-3 border-zinc-850 text-zinc-450 font-handwritten text-xl">
          <Compass className="w-10 h-10 text-zinc-650 mx-auto" />
          <p className="text-zinc-400">
            No goals created yet. Click "New Goal" above to create your first milestone!
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {goals.map((g) => {
            const percent = Math.min(100, Math.round((g.current_value / g.target_value) * 100));
            const isCompleted = percent >= 100;
            const linkedQ = questions.find((q) => q.id === g.linked_question_id);

            return (
              <div 
                key={g.id}
                className={`craft-card p-5 space-y-4 border transition-all duration-300 ${
                  isCompleted 
                    ? 'border-emerald-500/40 bg-emerald-500/5' 
                    : 'border-zinc-850 hover:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold font-ios-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {g.category}
                      </span>
                      {g.target_date && (
                        <span className="text-[10px] font-ios-mono text-zinc-500 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {g.target_date}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100 font-ios-serif leading-snug">{g.title}</h3>
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(g.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Habit Stacking Formula Banner */}
                {g.habit_stack && (
                  <div className="p-2.5 rounded-xl border border-zinc-850/80 bg-zinc-950/40 text-xs text-zinc-300 font-handwritten text-lg flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{g.habit_stack}</span>
                  </div>
                )}

                {/* Progress Bar & Percentage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-ios-mono">
                    <span className="font-bold text-zinc-300">
                      {g.current_value} / {g.target_value} {g.unit}
                    </span>
                    <span className={`font-black font-ios-rounded ${isCompleted ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {percent}% {isCompleted ? '🎉 Complete!' : ''}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                    <div 
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ 
                        width: `${percent}%`, 
                        background: isCompleted ? 'linear-gradient(135deg, #10b981, #34d399)' : 'var(--accent-gradient)' 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Linked Habit Indicator & Quick Increments */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-850/60">
                  {linkedQ ? (
                    <span className="text-[10px] text-zinc-500 font-ios-mono flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-teal-400" />
                      <span className="truncate max-w-[140px]">Linked: {linkedQ.prompt}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-650 font-ios-mono">Standalone Goal</span>
                  )}

                  {/* Increment Buttons */}
                  <div className="flex items-center space-x-1.5 font-ios-rounded">
                    <button
                      onClick={() => handleUpdateProgress(g.id, -1)}
                      className="px-2 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="Subtract 1"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(g.id, 1)}
                      style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                      className="px-2.5 py-1 border rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                      title="Add 1"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(g.id, 5)}
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="Add 5"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
