'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, 
  HelpCircle, Eye, EyeOff, Loader2, Sparkles 
} from 'lucide-react';

export default function QuestionsSettings() {
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newType, setNewType] = useState('boolean');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, [user]);

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
        });

      if (error) throw error;

      setNewPrompt('');
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
      // Swap order indices in database
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
          <Sparkles className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Customization</span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight sm:text-3xl">
          Question Engine Settings
        </h1>
        <p className="text-sm text-zinc-400">
          Add, reorder, edit, or disable questions to design your perfect habits tracker.
        </p>
      </div>

      {/* Add new question form */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10">
        <h2 className="text-sm font-bold text-zinc-300 mb-3 pl-0.5 flex items-center space-x-1">
          <span>Add Custom Prompt</span>
        </h2>
        <form onSubmit={handleAddQuestion} className="space-y-4 sm:space-y-0 sm:flex sm:space-x-3 items-end">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              required
              placeholder="e.g. Did you read at least 10 pages today?"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm"
            />
          </div>

          <div className="sm:w-44 space-y-1">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm cursor-pointer"
            >
              <option value="boolean">Yes / No</option>
              <option value="number">Numeric Count</option>
              <option value="scale_1_to_5">1 - 5 Scale Rating</option>
              <option value="text">Written reflection</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="glow-btn px-4 py-2 bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-semibold text-sm rounded-lg hover:opacity-95 shadow shadow-teal-500/10 transition-opacity flex justify-center items-center space-x-1 cursor-pointer w-full sm:w-auto shrink-0 h-10"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* List of current questions */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
          Active & Inactive Prompts
        </h2>

        {questions.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl text-center border-zinc-800 text-zinc-400 text-sm">
            You don't have any tracking prompts yet. Add one above!
          </div>
        ) : (
          <div className="space-y-2.5">
            {questions.map((q, idx) => {
              const isEditingThis = editingId === q.id;
              
              // Readable types mapping
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
                      ? 'border-zinc-800 bg-zinc-900/10' 
                      : 'border-zinc-800/40 bg-zinc-950/40 opacity-60'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    {isEditingThis ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingPrompt}
                          onChange={(e) => setEditingPrompt(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-450 focus:border-teal-450 text-sm"
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
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-450 rounded-lg cursor-pointer transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2.5">
                        <span className="text-zinc-500 text-xs font-mono mt-0.5 font-bold">
                          #{idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-zinc-205">{q.prompt}</p>
                          <span className="inline-block px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-450 font-mono">
                            {typeLabels[q.type]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions toolbar */}
                  {!isEditingThis && (
                    <div className="flex items-center justify-end space-x-1.5 shrink-0 self-end sm:self-auto">
                      {/* Move buttons */}
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit label button */}
                      <button
                        onClick={() => startEditing(q.id, q.prompt)}
                        className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
                        title="Edit wording"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Disable / Enable toggle */}
                      <button
                        onClick={() => handleToggleActive(q.id, q.is_active)}
                        className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                          q.is_active 
                            ? 'bg-zinc-900 border-zinc-800 text-teal-400 hover:text-teal-350' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:text-zinc-400'
                        }`}
                        title={q.is_active ? 'Disable question' : 'Enable question'}
                      >
                        {q.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete button */}
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
