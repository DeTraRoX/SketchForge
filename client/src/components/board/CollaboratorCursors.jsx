export default function CollaboratorCursors({ cursors }) {
  return (
    <>
      {Object.entries(cursors).map(([socketId, { x, y, color, name }]) => (
        <div
          key={socketId}
          className="pointer-events-none absolute z-50 transition-all duration-75"
          style={{ left: x, top: y, transform: 'translate(-2px, -2px)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={color || '#6366f1'}>
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
          </svg>
          <span
            className="absolute left-4 top-4 text-[10px] px-1.5 py-0.5 rounded text-white whitespace-nowrap"
            style={{ backgroundColor: color || '#6366f1' }}
          >
            {name || 'User'}
          </span>
        </div>
      ))}
    </>
  );
}
