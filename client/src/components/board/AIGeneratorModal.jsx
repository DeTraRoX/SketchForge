import { useState } from 'react';
import { api } from '../../api/client';
import { Sparkles, X, Wand2 } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export default function AIGeneratorModal({ onGenerate, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('');
  const addToast = useCanvasStore((s) => s.addToast);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setSource('');
    try {
      const res = await api.post('/api/ai/generate', { prompt });
      onGenerate(res.data.elements);
      setSource(res.data.source);
      addToast('Diagram generated successfully!');
      onClose();
    } catch {
      addToast('AI generation failed. Check OpenAI key in server/.env', 'error');
    } finally {
      setLoading(false);
    }
  }

  const examples = ['User login flowchart', 'Mind map for project planning', 'UML class diagram for e-commerce'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl p-6.5 w-full max-w-lg border border-slate-100 dark:border-slate-800/80 transition-all duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">AI Diagram Generator</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Describe your diagram in plain English</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Create a flowchart showing user registration with email verification..."
          className="input-field h-32 mt-2 resize-none text-sm leading-relaxed"
        />

        <div className="mt-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Try these examples</span>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button 
                key={ex} 
                type="button"
                onClick={() => setPrompt(ex)} 
                className="text-xs px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/35 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer font-medium border border-slate-100 dark:border-slate-800"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button 
            onClick={generate} 
            disabled={loading} 
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Diagram</span>
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className="btn-ghost border border-slate-200 dark:border-slate-800 px-5 text-slate-600 dark:text-slate-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
