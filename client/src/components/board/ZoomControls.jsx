import { useCanvasStore } from '../../store/useCanvasStore';
import { ZoomIn, ZoomOut, Grid, Sun, Moon } from 'lucide-react';

export default function ZoomControls({ isDark }) {
  const zoom = useCanvasStore((s) => s.zoom);
  const zoomIn = useCanvasStore((s) => s.zoomIn);
  const zoomOut = useCanvasStore((s) => s.zoomOut);
  const resetZoom = useCanvasStore((s) => s.resetZoom);
  const gridStyle = useCanvasStore((s) => s.gridStyle);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const theme = useCanvasStore((s) => s.theme);
  const setTheme = useCanvasStore((s) => s.setTheme);

  const getGridTitle = () => {
    if (gridStyle === 'dots') return 'Grid: Dots (Click to cycle)';
    if (gridStyle === 'gridlines') return 'Grid: Lines (Click to cycle)';
    return 'Grid: Off (Click to cycle)';
  };

  return (
    <div className={`absolute bottom-5 left-5 flex items-center gap-1 rounded-2xl px-2.5 py-1.5 shadow-premium border z-30 transition-all duration-300 ${isDark ? 'bg-[#12121e] border-[#2a2a42] text-slate-100' : 'bg-white border-slate-100 text-slate-800'}`}>
      <button 
        onClick={zoomOut} 
        className="btn-ghost !w-8 !h-8 !p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button 
        onClick={resetZoom} 
        className="btn-ghost min-w-[50px] !h-8 !px-1.5 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button 
        onClick={zoomIn} 
        className="btn-ghost !w-8 !h-8 !p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      
      <div className={`w-px h-6 mx-1 ${isDark ? 'bg-[#2a2a42]' : 'bg-slate-100'}`} />
      
      <button 
        onClick={toggleGrid} 
        className={`btn-ghost !w-8 !h-8 !p-0 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${gridStyle !== 'none' ? '!text-indigo-600 !bg-indigo-50 dark:!text-indigo-400 dark:!bg-indigo-950/45' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        title={getGridTitle()}
      >
        <Grid className="w-4 h-4" />
      </button>
      
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        className="btn-ghost !w-8 !h-8 !p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
      </button>
    </div>
  );
}
