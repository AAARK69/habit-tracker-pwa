'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ACCENT_THEMES } from '@/lib/gamification';
import { 
  Dumbbell, Bed, Smile, Sparkles, BookOpen, GlassWater, 
  Brain, Flame, Heart, Coffee, ClipboardList, CheckSquare, 
  HelpCircle, Plus, Trash2, Edit2, Check, X, ArrowUp, 
  ArrowDown, Eye, EyeOff, Loader2, Download, Palette, FileSpreadsheet, FileCode,
  Volume2, VolumeX, Smartphone, Clock, RotateCcw, Shuffle, ShieldAlert, ShieldCheck, Activity
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'dumbbell', label: 'Exercise', icon: Dumbbell },
  { name: 'bed', label: 'Sleep', icon: Bed },
  { name: 'smile', label: 'Mood', icon: Smile },
  { name: 'sparkles', label: 'Highlight', icon: Sparkles },
  { name: 'book-open', label: 'Reading', icon: BookOpen },
  { name: 'glass-water', label: 'Hydration', icon: GlassWater },
  { name: 'brain', label: 'Mindfulness', icon: Brain },
  { name: 'flame', label: 'Energy', icon: Flame },
  { name: 'heart', label: 'Health', icon: Heart },
  { name: 'coffee', label: 'Caffeine', icon: Coffee },
  { name: 'clipboard-list', label: 'General', icon: ClipboardList },
  { name: 'check-square', label: 'Habit', icon: CheckSquare },
];

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

export default function QuestionsSettings() {
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newType, setNewType] = useState('boolean');
  const [newHabitType, setNewHabitType] = useState<'good' | 'bad' | 'neutral'>('good');
  const [newIcon, setNewIcon] = useState('check-square');
  
  // Full Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingType, setEditingType] = useState('boolean');
  const [editingHabitType, setEditingHabitType] = useState<'good' | 'bad' | 'neutral'>('good');
  const [editingIcon, setEditingIcon] = useState('check-square');

  const [selectedTheme, setSelectedTheme] = useState('teal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [randomizeEnabled, setRandomizeEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('22:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const getLocalHabitTypeMap = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('reflect_habit_types') || '{}');
    } catch {
      return {};
    }
  };

  const saveLocalHabitType = (qId: string, habitType: string) => {
    if (typeof window === 'undefined') return;
    const current = getLocalHabitTypeMap();
    current[qId] = habitType;
    localStorage.setItem('reflect_habit_types', JSON.stringify(current));
  };

  const fetchQuestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      
      const localHabits = getLocalHabitTypeMap();
      const merged = (data || []).map((q: any) => ({
        ...q,
        habit_type: localHabits[q.id] || q.habit_type || 'good',
      }));

      setQuestions(merged);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    
    const savedTheme = localStorage.getItem('reflect_accent_theme') || 'teal';
    const savedSound = localStorage.getItem('reflect_sound_enabled') !== 'false';
    const savedHaptics = localStorage.getItem('reflect_haptics_enabled') !== 'false';
    const savedRandomize = localStorage.getItem('reflect_randomize_questions') === 'true';
    const savedReminder = localStorage.getItem('reflect_reminder_time') || '22:00';

    setSelectedTheme(savedTheme);
    setSoundEnabled(savedSound);
    setHapticsEnabled(savedHaptics);
    setRandomizeEnabled(savedRandomize);
    setReminderTime(savedReminder);

    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [user]);

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    localStorage.setItem('reflect_accent_theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    window.dispatchEvent(new Event('reflect_theme_change'));
  };

  const handleToggleSound = () => {
    const val = !soundEnabled;
    setSoundEnabled(val);
    localStorage.setItem('reflect_sound_enabled', String(val));
  };

  const handleToggleHaptics = () => {
    const val = !hapticsEnabled;
    setHapticsEnabled(val);
    localStorage.setItem('reflect_haptics_enabled', String(val));
  };

  const handleToggleRandomize = () => {
    const val = !randomizeEnabled;
    setRandomizeEnabled(val);
    localStorage.setItem('reflect_randomize_questions', String(val));
  };

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('reflect_reminder_time', time);
  };

  const handleResetDefaults = async () => {
    if (!user) return;
    if (!confirm('Restore default habit prompts? Existing custom prompts will remain untouched.')) return;
    setSaving(true);

    try {
      const defaultPrompts = [
        { user_id: user.id, prompt: 'Did you exercise today?', type: 'boolean', habit_type: 'good', order_index: 0, icon: 'dumbbell' },
        { user_id: user.id, prompt: 'Hours of sleep last night', type: 'number', habit_type: 'neutral', order_index: 1, icon: 'bed' },
        { user_id: user.id, prompt: 'Overall mood today', type: 'scale_1_to_5', habit_type: 'neutral', order_index: 2, icon: 'smile' },
        { user_id: user.id, prompt: 'What was the highlight of your day?', type: 'text', habit_type: 'neutral', order_index: 3, icon: 'sparkles' },
      ];

      let { data, error } = await supabase.from('questions').insert(defaultPrompts).select();
      
      if (error && (error.message.includes("habit_type") || error.message.includes("icon") || error.message.includes("column"))) {
        const fallbackPrompts = defaultPrompts.map(({ habit_type, icon, ...rest }) => rest);
        const retry = await supabase.from('questions').insert(fallbackPrompts).select();
        error = retry.error;
        data = retry.data;
      }

      if (error) throw error;

      if (data) {
        data.forEach((q: any, i: number) => {
          saveLocalHabitType(q.id, defaultPrompts[i]?.habit_type || 'good');
        });
      }

      await fetchQuestions();
    } catch (err: any) {
      alert('Failed to reset defaults: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    if (!user) return;
    setExporting(true);

    try {
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      if (format === 'json') {
        const jsonStr = JSON.stringify(logs, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reflect-journal-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        let csv = 'ID,Date,Responses,CreatedAt\n';
        logs?.forEach((l) => {
          const respStr = JSON.stringify(l.responses).replace(/"/g, '""');
          csv += `"${l.id}","${l.date}","${respStr}","${l.created_at}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reflect-journal-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPrompt.trim()) return;
    setSaving(true);

    try {
      const maxIndex = questions.reduce((max, q) => Math.max(max, q.order_index), -1);
      
      const insertPayload: any = {
        user_id: user.id,
        prompt: newPrompt.trim(),
        type: newType,
        habit_type: newHabitType,
        order_index: maxIndex + 1,
        is_active: true,
        icon: newIcon,
      };

      let { data, error } = await supabase
        .from('questions')
        .insert(insertPayload)
        .select()
        .single();

      if (error && (error.message.includes("habit_type") || error.message.includes("icon") || error.message.includes("column"))) {
        delete insertPayload.habit_type;
        let retry = await supabase.from('questions').insert(insertPayload).select().single();
        if (retry.error) {
          delete insertPayload.icon;
          retry = await supabase.from('questions').insert(insertPayload).select().single();
        }
        error = retry.error;
        data = retry.data;
      }

      if (error) throw error;

      if (data) {
        saveLocalHabitType(data.id, newHabitType);
      }

      setNewPrompt('');
      setNewHabitType('good');
      setNewIcon('check-square');
      await fetchQuestions();
    } catch (err: any) {
      alert('Failed to add question: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchQuestions();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchQuestions();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const startEditing = (q: any) => {
    setEditingId(q.id);
    setEditingPrompt(q.prompt);
    setEditingType(q.type || 'boolean');
    setEditingHabitType(q.habit_type || 'good');
    setEditingIcon(q.icon || 'check-square');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingPrompt.trim()) return;
    setSaving(true);

    // Save locally immediately
    saveLocalHabitType(id, editingHabitType);

    // Optimistic UI update
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, prompt: editingPrompt.trim(), type: editingType, habit_type: editingHabitType, icon: editingIcon }
          : q
      )
    );

    try {
      const updatePayload: any = {
        prompt: editingPrompt.trim(),
        type: editingType,
        habit_type: editingHabitType,
        icon: editingIcon,
      };

      let { error } = await supabase
        .from('questions')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        delete updatePayload.habit_type;
        delete updatePayload.icon;
        const retry = await supabase.from('questions').update(updatePayload).eq('id', id);
        if (retry.error) throw retry.error;
      }

      setEditingId(null);
      await fetchQuestions();
    } catch (err: any) {
      console.error('Database update notice:', err.message);
      setEditingId(null);
      await fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const q1 = questions[index];
    const q2 = questions[targetIndex];

    try {
      const { error: err1 } = await supabase
        .from('questions')
        .update({ order_index: q2.order_index })
        .eq('id', q1.id);

      const { error: err2 } = await supabase
        .from('questions')
        .update({ order_index: q1.order_index })
        .eq('id', q2.id);

      if (err1 || err2) throw (err1 || err2);
      await fetchQuestions();
    } catch (err: any) {
      alert('Failed to reorder: ' + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-zinc-500 text-xs font-handwritten text-lg">Opening settings journal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-xs uppercase tracking-widest font-extrabold font-ios-mono" style={{ color: 'var(--accent)' }}>
            Journal Settings
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight font-ios-serif">
          Settings & Preferences
        </h1>
        <p className="text-base text-zinc-400 font-handwritten text-xl leading-snug">
          Tailor your habit prompts (Good 🟢, Bad 🔴, Neutral ⚪), UI themes, and data exports.
        </p>
      </div>

      {/* Dynamic Theme Accent Switcher */}
      <div className="craft-card p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold text-zinc-300 font-ios-sans">UI Accent Color Themes</h2>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-1 font-ios-sans">
          {ACCENT_THEMES.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                style={isSelected ? { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'shadow-md scale-105'
                    : 'bg-zinc-950/40 border-zinc-850 text-zinc-450 hover:text-zinc-200'
                }`}
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full shadow-sm border border-black/40 shrink-0"
                  style={{ backgroundColor: t.colorHex }}
                ></div>
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* App Feedback & Notification Preferences */}
      <div className="craft-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-300 font-ios-sans">
          App Feedback & Preferences
        </h2>

        <div className="space-y-3">
          {/* Randomize Prompt Order Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850/80 bg-zinc-950/40">
            <div className="flex items-center space-x-3">
              <Shuffle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <div>
                <span className="block text-xs font-bold text-zinc-200 font-ios-sans">Randomize Prompt Order 🎲</span>
                <span className="text-[10px] text-zinc-500 font-ios-mono">Shuffle question sequence randomly on each daily check-in</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleRandomize}
              style={randomizeEnabled ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                randomizeEnabled ? '' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {randomizeEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Audio Chimes Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850/80 bg-zinc-950/40">
            <div className="flex items-center space-x-3">
              {soundEnabled ? <Volume2 className="w-4 h-4" style={{ color: 'var(--accent)' }} /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              <div>
                <span className="block text-xs font-bold text-zinc-200 font-ios-sans">Completion Chimes</span>
                <span className="text-[10px] text-zinc-500 font-ios-mono">Play web audio chord on check-in submission</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              style={soundEnabled ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                soundEnabled ? '' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850/80 bg-zinc-950/40">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <div>
                <span className="block text-xs font-bold text-zinc-200 font-ios-sans">Haptic Vibrations</span>
                <span className="text-[10px] text-zinc-500 font-ios-mono">Tactile haptic feedback on mobile button taps</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHaptics}
              style={hapticsEnabled ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                hapticsEnabled ? '' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {hapticsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Target Reminder Hour Picker */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850/80 bg-zinc-950/40">
            <div className="flex items-center space-x-3">
              <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <div>
                <span className="block text-xs font-bold text-zinc-200 font-ios-sans">Reminder Time Window</span>
                <span className="text-[10px] text-zinc-500 font-ios-mono">Target hour for daily push notifications</span>
              </div>
            </div>
            <select
              value={reminderTime}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-ios-mono text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="20:00">8:00 PM</option>
              <option value="21:00">9:00 PM</option>
              <option value="22:00">10:00 PM (Default)</option>
              <option value="23:00">11:00 PM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add new question form */}
      <div className="craft-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-300 font-ios-sans">
          Add Custom Journal Prompt
        </h2>
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-12">
            {/* Prompt Text Input */}
            <div className="sm:col-span-6 space-y-1">
              <label className="block text-xs font-semibold text-zinc-500 font-ios-mono uppercase tracking-wider pl-0.5">Prompt text</label>
              <input
                type="text"
                required
                placeholder="e.g. Did you exercise today? or Late night screen time?"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 placeholder-zinc-650 focus:outline-none text-sm font-ios-serif"
              />
            </div>

            {/* Answer Format */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-xs font-semibold text-zinc-500 font-ios-mono uppercase tracking-wider pl-0.5">Answer format</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 focus:outline-none text-sm cursor-pointer font-ios-sans"
              >
                <option value="boolean">Yes / No</option>
                <option value="number">Numeric Count</option>
                <option value="scale_1_to_5">1 - 5 Scale Rating</option>
                <option value="text">Reflection text</option>
              </select>
            </div>

            {/* Habit Type Selector (Good / Bad / Neutral) */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-xs font-semibold text-zinc-500 font-ios-mono uppercase tracking-wider pl-0.5">Habit Category</label>
              <select
                value={newHabitType}
                onChange={(e) => setNewHabitType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 focus:outline-none text-sm cursor-pointer font-ios-sans font-bold"
              >
                <option value="good">🟢 Good Habit (Build)</option>
                <option value="bad">🔴 Bad Habit (Break)</option>
                <option value="neutral">⚪ Neutral Metric (Track)</option>
              </select>
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 font-ios-mono uppercase tracking-wider pl-0.5">Choose Icon</label>
            <div className="grid grid-cols-6 gap-2 bg-zinc-950/30 p-3 rounded-xl border border-zinc-850/60 max-w-md">
              {AVAILABLE_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = newIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setNewIcon(item.name)}
                    style={isSelected ? { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'scale-105'
                        : 'bg-zinc-955 border-transparent text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/60'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ background: 'var(--accent-gradient)', color: '#09090b' }}
            className="glow-btn px-4 py-2.5 font-bold text-sm rounded-xl hover:opacity-95 shadow transition-opacity flex justify-center items-center space-x-1 cursor-pointer w-full sm:w-auto font-ios-sans"
          >
            <Plus className="w-4 h-4" />
            <span className="font-handwritten text-lg font-bold">Create Prompt ✒️</span>
          </button>
        </form>
      </div>

      {/* List of current questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-550 uppercase tracking-widest pl-1 font-ios-mono">
            Your Questionnaire Prompts ({questions.length})
          </h2>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1 text-[10px] font-ios-mono text-zinc-450 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Defaults</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="craft-card p-6 text-center border-zinc-850 text-zinc-450 text-sm font-handwritten text-xl">
            You don't have any prompts yet. Create one above!
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditingThis = editingId === q.id;
              const iconKey = q.icon || 'help-circle';
              const IconComponent = IconMap[iconKey] || HelpCircle;
              const habitType = q.habit_type || 'good';
              
              const typeLabels: Record<string, string> = {
                boolean: 'Yes/No',
                number: 'Number',
                scale_1_to_5: 'Scale 1-5',
                text: 'Reflection text',
              };

              return (
                <div 
                  key={q.id} 
                  className={`craft-card p-4 border transition-all duration-200 ${
                    q.is_active 
                      ? 'border-zinc-850 bg-zinc-900/10' 
                      : 'border-zinc-850/40 bg-zinc-950/40 opacity-55'
                  }`}
                >
                  {isEditingThis ? (
                    /* Full Expanded Edit Form Box */
                    <div className="space-y-4 p-3 bg-zinc-950/90 rounded-xl border border-teal-500/40">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <span className="text-xs font-bold text-teal-400 font-ios-mono">Editing Prompt #{idx + 1}</span>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(q.id)}
                            disabled={saving}
                            style={{ background: 'var(--accent-gradient)', color: '#09090b' }}
                            className="px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 cursor-pointer shadow"
                          >
                            <Check className="w-4 h-4" />
                            <span>Save Changes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg font-bold text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-12">
                        {/* Prompt text input */}
                        <div className="sm:col-span-6 space-y-1">
                          <label className="block text-[10px] font-bold text-zinc-400 font-ios-mono uppercase">Prompt text</label>
                          <input
                            type="text"
                            value={editingPrompt}
                            onChange={(e) => setEditingPrompt(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-xs font-ios-serif"
                          />
                        </div>

                        {/* Answer Format */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-[10px] font-bold text-zinc-400 font-ios-mono uppercase">Answer Format</label>
                          <select
                            value={editingType}
                            onChange={(e) => setEditingType(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-xs font-ios-sans cursor-pointer"
                          >
                            <option value="boolean">Yes / No</option>
                            <option value="number">Numeric Count</option>
                            <option value="scale_1_to_5">1 - 5 Scale Rating</option>
                            <option value="text">Reflection text</option>
                          </select>
                        </div>

                        {/* Habit Category */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-[10px] font-bold text-zinc-400 font-ios-mono uppercase">Category</label>
                          <select
                            value={editingHabitType}
                            onChange={(e) => setEditingHabitType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none text-xs font-ios-sans font-bold cursor-pointer"
                          >
                            <option value="good">🟢 Good Habit (Build)</option>
                            <option value="bad">🔴 Bad Habit (Break)</option>
                            <option value="neutral">⚪ Neutral Metric (Track)</option>
                          </select>
                        </div>
                      </div>

                      {/* Icon Selector Grid inside Edit Box */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-400 font-ios-mono uppercase">Change Icon</label>
                        <div className="grid grid-cols-6 gap-1.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 max-w-sm">
                          {AVAILABLE_ICONS.map((item) => {
                            const Icon = item.icon;
                            const isSelected = editingIcon === item.name;
                            return (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => setEditingIcon(item.name)}
                                style={isSelected ? { backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}
                                className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                  isSelected ? 'scale-105 shadow' : 'bg-zinc-950 border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode Card */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3.5">
                        <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-850 text-zinc-400 shrink-0">
                          <IconComponent className="w-4.5 h-4.5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-bold text-zinc-200 leading-snug font-ios-serif">{q.prompt}</p>
                            
                            {/* Habit Type Badge */}
                            <span 
                              className={`text-[9px] font-bold font-ios-mono uppercase px-2 py-0.5 rounded-full border ${
                                habitType === 'good'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : habitType === 'bad'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/40'
                              }`}
                            >
                              {habitType === 'good' ? '🟢 Good Habit' : habitType === 'bad' ? '🔴 Bad Habit' : '⚪ Neutral Metric'}
                            </span>
                          </div>

                          <span className="inline-block px-2 py-0.5 bg-zinc-950/80 border border-zinc-900 rounded text-[10px] text-zinc-500 font-ios-mono">
                            {typeLabels[q.type]}
                          </span>
                        </div>
                      </div>

                      {/* Actions toolbar */}
                      <div className="flex items-center justify-end space-x-1 shrink-0 self-end sm:self-auto font-ios-sans">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded-lg cursor-pointer transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === questions.length - 1}
                          className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded-lg cursor-pointer transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEditing(q)}
                          className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-teal-400 hover:text-teal-300 rounded-lg cursor-pointer transition-colors"
                          title="Edit prompt, category & format"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(q.id, q.is_active)}
                          className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                            q.is_active 
                              ? 'bg-zinc-955 border-zinc-850 text-teal-400' 
                              : 'bg-zinc-950 border-zinc-850/50 text-zinc-600'
                          }`}
                          title={q.is_active ? 'Disable question' : 'Enable question'}
                        >
                          {q.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/15 rounded-lg cursor-pointer transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Export & Backup Section */}
      <div className="craft-card p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-bold text-zinc-300 font-ios-sans">Export Journal Data</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-handwritten text-lg">
          Export your reflection entries for backup or offline review.
        </p>
        <div className="flex space-x-3 pt-1">
          <button
            onClick={() => handleExportData('csv')}
            disabled={exporting}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 font-ios-sans"
          >
            <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExportData('json')}
            disabled={exporting}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 font-ios-sans"
          >
            <FileCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
