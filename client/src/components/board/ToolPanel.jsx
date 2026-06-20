import { 
  MousePointer, 
  Paintbrush, 
  Pencil, 
  Square, 
  Circle, 
  Diamond, 
  Triangle, 
  Star, 
  Layout, 
  Minus, 
  ArrowUpRight, 
  Type, 
  Image as ImageIcon, 
  Eraser 
} from 'lucide-react';

const TOOLS = [
  { id: 'select', label: 'Select', icon: <MousePointer className="w-4 h-4" />, shortcut: 'V' },
  { id: 'freehand', label: 'Freehand', icon: <Paintbrush className="w-4 h-4" />, shortcut: 'F' },
  { id: 'pencil', label: 'Pencil', icon: <Pencil className="w-4 h-4" />, shortcut: 'P' },
  { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: <Circle className="w-4 h-4" />, shortcut: 'O' },
  { id: 'diamond', label: 'Diamond', icon: <Diamond className="w-4 h-4" />, shortcut: 'D' },
  { id: 'triangle', label: 'Triangle', icon: <Triangle className="w-4 h-4" />, shortcut: 'G' },
  { id: 'star', label: 'Star', icon: <Star className="w-4 h-4" />, shortcut: 'S' },
  { id: 'frame', label: 'Frame', icon: <Layout className="w-4 h-4" />, shortcut: 'M' },
  { id: 'line', label: 'Line', icon: <Minus className="w-4.5 h-4.5 -rotate-45" />, shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', icon: <ArrowUpRight className="w-4.5 h-4.5" />, shortcut: 'A' },
  { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, shortcut: 'T' },
  { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" />, shortcut: 'I' },
  { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" />, shortcut: 'E' },
];

export default function ToolPanel({ tool, setTool, onImageClick, canEdit }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 p-1 rounded-2xl border shadow-premium glass-panel max-w-[90vw] overflow-x-auto no-scrollbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.label} (${t.shortcut})`}
          disabled={!canEdit && t.id !== 'select'}
          onClick={() => (t.id === 'image' ? onImageClick() : setTool(t.id))}
          className={`tool-btn !w-9 !h-9 !rounded-xl ${tool === t.id ? 'active' : ''} disabled:opacity-40 transition-all duration-150`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
