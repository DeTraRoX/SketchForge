import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const ACTION_ICONS = {
  'board.created': '✨',
  'board.renamed': '✏️',
  'board.moved': '📁',
  'board.trashed': '🗑️',
  'board.restored': '♻️',
  'elements.updated': '🎨',
  'user.joined': '👋',
  'user.invited': '📨',
  'board.shared': '🔗',
};

export default function ActivityFeed({ boardId, socket, onClose }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api.get(`/api/boards/${boardId}/activity`)
      .then((r) => setActivities(r.data.activities || []))
      .catch(() => {});
  }, [boardId]);

  useEffect(() => {
    if (!socket) return;
    const onActivity = ({ activity }) => {
      if (!activity) return;
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    };
    socket.on('board:activity', onActivity);
    return () => socket.off('board:activity', onActivity);
  }, [socket]);

  return (
    <div className="absolute left-16 top-14 bottom-0 w-72 bg-white border-r border-border z-40 flex flex-col shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm text-ink">Activity</span>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-ink">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activities.map((a) => (
          <div key={a._id} className="flex gap-2.5 p-2.5 rounded-xl border border-border bg-slate-50/80">
            <span className="text-base shrink-0">{ACTION_ICONS[a.action] || '•'}</span>
            <div className="min-w-0">
              <p className="text-xs text-ink leading-snug">{a.message}</p>
              <p className="text-[10px] text-muted mt-1">
                {new Date(a.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-muted text-center py-8">No activity yet</p>
        )}
      </div>
    </div>
  );
}
