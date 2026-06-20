import { useCanvasStore } from '../../store/useCanvasStore';
import { Palette, Sliders, Type, Paintbrush } from 'lucide-react';

const COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#7c3aed', '#ffffff', '#94a3b8'];
const FONTS = ['Virgil, Segoe UI, sans-serif', 'Arial', 'Georgia', 'Courier New', 'Plus Jakarta Sans'];

export default function PropertiesPanel({ onApply, canEdit, isDark }) {
  const styles = useCanvasStore((s) => s.styles);
  const setStyle = useCanvasStore((s) => s.setStyle);

  const panelCls = isDark 
    ? 'bg-[#12121e]/90 border-[#2a2a42] text-slate-200' 
    : 'bg-white/95 border-slate-100 text-slate-800';

  if (!canEdit) {
    return (
      <aside className={`w-56 border-l p-4.5 flex items-center justify-center text-center ${panelCls}`}>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">View-only mode</p>
      </aside>
    );
  }

  return (
    <aside className={`w-56 border-l p-4.5 overflow-y-auto z-20 shadow-premium transition-all duration-300 ${panelCls}`}>
      <div className="flex items-center gap-2 mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <Sliders className="w-4 h-4 text-indigo-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Properties</h3>
      </div>

      <div className="space-y-5">
        {/* Stroke Section */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Paintbrush className="w-3.5 h-3.5" />
            Stroke Color
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStyle('stroke', c)}
                className={`w-7.5 h-7.5 rounded-lg border-2 transition-all duration-150 cursor-pointer ${styles.stroke === c ? 'scale-110 border-indigo-600 dark:border-indigo-400' : 'border-transparent hover:scale-105'}`}
                style={{ 
                  backgroundColor: c,
                  boxShadow: styles.stroke === c ? `0 0 8px ${c}50` : 'none'
                }}
              />
            ))}
            <label className="w-7.5 h-7.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 relative overflow-hidden transition-colors">
              <span className="text-[10px] font-bold text-slate-500">Custom</span>
              <input 
                type="color" 
                value={styles.stroke} 
                onChange={(e) => setStyle('stroke', e.target.value)} 
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" 
              />
            </label>
          </div>
        </div>

        {/* Fill Section */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Palette className="w-3.5 h-3.5" />
            Fill Background
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            <button 
              type="button"
              onClick={() => setStyle('fill', 'transparent')} 
              className={`w-7.5 h-7.5 rounded-lg border-2 text-[10px] font-bold cursor-pointer transition-all ${styles.fill === 'transparent' ? 'border-indigo-600 dark:border-indigo-400 bg-slate-50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800'}`}
            >
              ∅
            </button>
            {COLORS.slice(0, 8).map((c) => (
              <button 
                key={c} 
                type="button"
                onClick={() => setStyle('fill', c)} 
                className={`w-7.5 h-7.5 rounded-lg border-2 transition-all duration-150 cursor-pointer ${styles.fill === c ? 'scale-110 border-indigo-600 dark:border-indigo-400' : 'border-transparent hover:scale-105'}`} 
                style={{ 
                  backgroundColor: c,
                  boxShadow: styles.fill === c ? `0 0 8px ${c}50` : 'none'
                }} 
              />
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/60 my-2" />

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Stroke Width</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{styles.strokeWidth}px</span>
            </div>
            <input 
              type="range" 
              min={1} 
              max={12} 
              value={styles.strokeWidth} 
              onChange={(e) => setStyle('strokeWidth', +e.target.value)} 
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400" 
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Opacity</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.round(styles.opacity * 100)}%</span>
            </div>
            <input 
              type="range" 
              min={0.1} 
              max={1} 
              step={0.1} 
              value={styles.opacity} 
              onChange={(e) => setStyle('opacity', +e.target.value)} 
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400" 
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Font Size</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{styles.fontSize}px</span>
            </div>
            <input 
              type="range" 
              min={12} 
              max={72} 
              value={styles.fontSize} 
              onChange={(e) => setStyle('fontSize', +e.target.value)} 
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400" 
            />
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/60 my-2" />

        {/* Font & Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Font Family
            </label>
            <select 
              value={styles.fontFamily} 
              onChange={(e) => setStyle('fontFamily', e.target.value)} 
              className="input-field text-xs cursor-pointer !py-2"
            >
              {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0]}</option>)}
            </select>
          </div>

          {/* Styled Checkboxes */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={styles.dashed} 
                onChange={(e) => setStyle('dashed', e.target.checked)} 
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600" 
              />
              Dashed
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={styles.rounded} 
                onChange={(e) => setStyle('rounded', e.target.checked)} 
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600" 
              />
              Rounded
            </label>
          </div>
        </div>

        <button 
          onClick={onApply} 
          className="btn-primary w-full py-2.5 text-xs shadow-md mt-2 flex items-center justify-center"
        >
          Apply to selection
        </button>
      </div>
    </aside>
  );
}
