import { TEMPLATES } from '../../canvas/templates';
import { LayoutTemplate, X } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export default function TemplatesModal({ onSelect, onClose }) {
  const addToast = useCanvasStore((s) => s.addToast);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl p-6.5 w-full max-w-lg border border-slate-100 dark:border-slate-800/80 transition-all duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">Templates</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Start from a ready-made diagram layout</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              type="button"
              onClick={() => { 
                onSelect(tpl.elements); 
                addToast(`Loaded template: ${tpl.name}`);
                onClose(); 
              }}
              className="text-left p-4.5 rounded-2xl border border-slate-150 dark:border-slate-800/80 bg-white dark:bg-[#161626] hover:border-indigo-500/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
            >
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{tpl.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tpl.description}</div>
            </button>
          ))}
        </div>

        <button 
          type="button" 
          onClick={onClose} 
          className="mt-5 w-full py-3 text-xs font-semibold rounded-xl border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
