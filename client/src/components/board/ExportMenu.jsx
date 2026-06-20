import { exportAsJSON, exportAsPNG, exportAsSVG, exportAsPDF } from '../../canvas/exportUtils';

const OPTIONS = [
  { type: 'png', label: 'Export PNG', desc: 'Raster image' },
  { type: 'svg', label: 'Export SVG', desc: 'Vector graphic' },
  { type: 'json', label: 'Export JSON', desc: 'Board data' },
  { type: 'pdf', label: 'Export PDF', desc: 'Printable document' },
];

export default function ExportMenu({ canvasRef, elements, settings, title, onClose }) {
  const canvas = canvasRef?.current;

  const handle = async (type) => {
    try {
      if (type === 'png' && canvas) exportAsPNG(canvas, title);
      else if (type === 'svg' && canvas) exportAsSVG(canvas, title);
      else if (type === 'json') exportAsJSON(elements, settings, title);
      else if (type === 'pdf' && canvas) await exportAsPDF(canvas, title);
    } catch (e) {
      console.error('Export failed', e);
    }
    onClose?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-12 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-border p-2 min-w-[220px]">
        <div className="px-3 py-2 border-b border-border mb-1">
          <div className="text-sm font-semibold text-ink">Export board</div>
          <div className="text-xs text-muted">Choose a format</div>
        </div>
        {OPTIONS.map(({ type, label, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => handle(type)}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-brand-50 transition group"
          >
            <div className="text-sm font-medium text-ink group-hover:text-brand-600">{label}</div>
            <div className="text-xs text-muted">{desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
