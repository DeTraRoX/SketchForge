import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function CommentsPanel({ boardId, canEdit, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    api.get(`/api/boards/${boardId}/comments`).then((r) => setComments(r.data.comments)).catch(() => {});
  }, [boardId]);

  async function addComment() {
    if (!text.trim() || !canEdit) return;
    const res = await api.post(`/api/boards/${boardId}/comments`, { x: 100, y: 100, text });
    setComments((c) => [res.data.comment, ...c]);
    setText('');
  }

  return (
    <div className="absolute right-56 top-14 bottom-0 w-72 bg-white border-l border-border z-40 flex flex-col shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm text-ink">Comments</span>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-muted hover:text-ink">✕</button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.map((c) => (
          <div key={c._id} className={`p-3 rounded-xl text-sm border border-border ${c.resolved ? 'bg-slate-50 opacity-60' : 'bg-brand-50/60'}`}>
            <div className="font-medium text-xs text-muted">{c.user?.name || 'User'}</div>
            <p className="mt-1 text-ink">{c.text}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-muted text-center py-8">No comments yet</p>}
      </div>
      {canEdit && (
        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            className="input-field flex-1 !py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addComment()}
          />
          <button type="button" onClick={addComment} className="btn-primary !px-3 !py-2 text-sm">Post</button>
        </div>
      )}
    </div>
  );
}
