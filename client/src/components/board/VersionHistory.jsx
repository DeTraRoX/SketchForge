import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function VersionHistory({ boardId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    api.get(`/api/boards/${boardId}/versions`).then((r) => setVersions(r.data.versions)).catch(() => {});
  }, [boardId]);

  async function restore(versionId) {
    const res = await api.post(`/api/boards/${boardId}/versions/${versionId}/restore`);
    onRestore(res.data.board);
    onClose();
  }

  async function snapshot() {
    await api.post(`/api/boards/${boardId}/versions`, { label: 'Manual snapshot' });
    const r = await api.get(`/api/boards/${boardId}/versions`);
    setVersions(r.data.versions);
  }

  return (
    <div className="absolute right-56 top-14 bottom-0 w-72 bg-white border-l border-border z-40 flex flex-col shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm text-ink">Version History</span>
        <button type="button" onClick={snapshot} className="text-xs px-2.5 py-1 rounded-lg bg-brand-600 text-white font-medium">Save</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {versions.map((v) => (
          <div key={v._id} className="p-3 rounded-xl border border-border text-sm hover:border-brand-500 transition bg-white">
            <div className="font-medium text-ink">{v.label}</div>
            <div className="text-xs text-muted mt-0.5">{new Date(v.createdAt).toLocaleString()}</div>
            <button type="button" onClick={() => restore(v._id)} className="mt-2 text-xs text-brand-600 font-medium hover:underline">Restore</button>
          </div>
        ))}
        {versions.length === 0 && <p className="text-sm text-muted text-center py-8">No versions saved</p>}
      </div>
      <button type="button" onClick={onClose} className="p-3 border-t border-border text-sm text-muted hover:bg-slate-50 transition">Close</button>
    </div>
  );
}
