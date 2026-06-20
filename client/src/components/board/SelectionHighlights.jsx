export default function SelectionHighlights({ selections, canvasRef }) {
  const canvas = canvasRef?.current;
  if (!canvas || !selections?.length) return null;

  const zoom = canvas.getZoom?.() || 1;
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {selections.map((sel) => {
        if (!sel.bounds || !sel.elementIds?.length) return null;
        const { left, top, width, height } = sel.bounds;
        const x = left * zoom + vpt[4];
        const y = top * zoom + vpt[5];
        const w = width * zoom;
        const h = height * zoom;
        return (
          <div
            key={sel.socketId}
            className="absolute rounded-md"
            style={{
              left: x,
              top: y,
              width: w,
              height: h,
              border: `2px solid ${sel.color || '#6366f1'}`,
              boxShadow: `0 0 0 1px ${sel.color || '#6366f1'}33`,
            }}
          >
            <span
              className="absolute -top-5 left-0 text-[10px] font-medium px-1.5 py-0.5 rounded text-white whitespace-nowrap"
              style={{ backgroundColor: sel.color || '#6366f1' }}
            >
              {sel.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
