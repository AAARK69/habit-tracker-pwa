'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ACCENT_THEMES } from '@/lib/gamification';
import { 
  Dumbbell, Bed, Smile, Sparkles, BookOpen, GlassWater, 
  Brain, Flame, Heart, Coffee, ClipboardList, CheckSquare, 
  HelpCircle, Plus, Trash2, Edit2, Check, X, ArrowUp, 
  ArrowDown, Eye, EyeOff, Loader2, Download, Palette, FileSpreadsheet, FileCode
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
  const [newIcon, setNewIcon] = useState('check-square');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('teal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

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
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    const savedTheme = localStorage.getItem('reflect_accent_theme') || 'teal';
    setSelectedTheme(savedTheme);
  }, [user]);

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    localStorage.setItem('reflect_accent_theme', themeId);
  };

  // CSV & JSON Data Export Handler
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
        // CSV Format
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
      
      const { error } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          prompt: newPrompt.trim(),
          type: newType,
          order_index: maxIndex + 1,
          is_active: true,
          icon: newIcon,
        });

      if (error) throw error;

      setNewPrompt('');
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
    if (!confirm('Are you sure you want to delete this question? This will not delete past log answers, but the question will no longer be visible on current or future tracking forms.')) return;
    
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

  const startEditing = (id: string, prompt: string) => {
    setEditingId(id);
    setEditingPrompt(prompt);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingPrompt.trim()) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('questions')
        .update({ prompt: editingPrompt.trim() })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      await fetchQuestions();
    } catch (err: any) {
      alert('Failed to update question: ' + err.message);
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
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-zinc-500 text-xs font-mono">Loading question configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-teal-400">
          <CheckSquare className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-extrabold font-mono">Customization & Privacy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-50 tracking-tight">
          Settings & Customization
        </h1>
        <p className="text-sm text-zinc-400">
          Manage habits, customize UI accent themes, and export your private reflection journal.
        </p>
      </div>

      {/* Theme Accent Switcher */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 space-y-3">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-zinc-300">UI Accent Color Themes</h2>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {ACCENT_THEMES.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 border-teal-500/40 text-teal-400 shadow-md'
                    : 'bg-zinc-950/40 border-zinc-850 text-zinc-450 hover:text-zinc-200'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: t.colorHex }}
                ></div>
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Export & Backup Section */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 space-y-3">
        <div className="flex items-center space-x-2">
          <Download className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-zinc-300">Export Journal Data</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Download your complete daily reflections history for offline backup or analytical review.
        </p>
        <div className="flex space-x-3 pt-1">
          <button
            onClick={() => handleExportData('csv')}
            disabled={exporting}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExportData('json')}
            disabled={exporting}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileCode className="w-4 h-4 text-teal-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Add new question form */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 space-y-4">
        <h2 className="text-sm font-bold text-zinc-300">
          Add Custom Prompt
        </h2>
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-zinc-500 font-mono uppercase tracking-wider pl-0.5">Question Prompt text</label>
              <input
                type="text"
                required
                placeholder="e.g. Did you read at least 10 pages today?"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-zinc-500 font-mono uppercase tracking-wider pl-0.5">Answer format</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-950/65 border border-zinc-850 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm cursor-pointer"
              >
                <option value="boolean">Yes / No</option>
                <option value="number">Numeric Count</option>
                <option value="scale_1_to_5">1 - 5 Scale Rating</option>
                <option value="text">Written reflection</option>
              </select>
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 font-mono uppercase tracking-wider pl-0.5">Choose Icon</label>
            <div className="grid grid-cols-6 gap-2 bg-zinc-950/30 p-3 rounded-xl border border-zinc-850/60 max-w-md">
              {AVAILABLE_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = newIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setNewIcon(item.name)}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/35 text-teal-450 scale-105'
                        : 'bg-zinc-950/20 border-transparent text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/60'
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
            className="glow-btn px-4 py-2.5 bg-gradient-to-r from-teal-400 to-emerald-400 text-zinc-950 font-bold text-sm rounded-xl hover:opacity-95 shadow shadow-teal-500/10 transition-opacity flex justify-center items-center space-x-1 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>Create Prompt</span>
          </button>
        </form>
      </div>

      {/* List of current questions */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-550 uppercase tracking-widest pl-1 font-mono">
          Your Questionnaire Prompts
        </h2>

        {questions.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl text-center border-zinc-850 text-zinc-450 text-sm">
            You don't have any prompts yet. Add one using the panel above!
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditingThis = editingId === q.id;
              const IconComponent = IconMap[q.icon] || HelpCircle;
              
              const typeLabels: Record<string, string> = {
                boolean: 'Yes/No',
                number: 'Number',
                scale_1_to_5: 'Scale 1-5',
                text: 'Reflection text',
              };

              return (
                <div 
                  key={q.id} 
                  className={`glass-panel p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    q.is_active 
                      ? 'border-zinc-850 bg-zinc-900/10' 
                      : 'border-zinc-850/40 bg-zinc-950/40 opacity-55'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    {isEditingThis ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingPrompt}
                          onChange={(e) => setEditingPrompt(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm font-medium"
                        />
                        <button
                          onClick={() => handleSaveEdit(q.id)}
                          className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg cursor-pointer transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-450 rounded-lg cursor-pointer transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3.5">
                        <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-850 text-zinc-400 shrink-0">
                          <IconComponent className="w-4.5 h-4.5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-zinc-200 leading-snug">{q.prompt}</p>
                          <span className="inline-block px-2 py-0.5 bg-zinc-950/80 border border-zinc-900 rounded text-[10px] text-zinc-500 font-mono">
                            {typeLabels[q.type]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions toolbar */}
                  {!isEditingThis && (
                    <div className="flex items-center justify-end space-x-1 shrink-0 self-end sm:self-auto">
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
                        onClick={() => startEditing(q.id, q.prompt)}
                        className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
                        title="Edit text"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(q.id, q.is_active)}
                        className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                          q.is_active 
                            ? 'bg-zinc-955 border-zinc-850 text-teal-400 hover:text-teal-350' 
                            : 'bg-zinc-950 border-zinc-850/50 text-zinc-600 hover:text-zinc-400'
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
