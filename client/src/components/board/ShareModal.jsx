import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Share2, Link, Mail, Copy, Check, X } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

export default function ShareModal({ boardId, onClose }) {
  const [info, setInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const addToast = useCanvasStore((s) => s.addToast);

  const shareLink = useMemo(
    () => info?.shareLink || `${window.location.origin}/board/${boardId}`,
    [info?.shareLink, boardId]
  );

  useEffect(() => {
    setLoading(true);
    api.get(`/api/boards/${boardId}/share`)
      .then((r) => setInfo(r.data))
      .catch(() => setError('Could not load sharing settings'))
      .finally(() => setLoading(false));
  }, [boardId]);

  async function toggleLink() {
    try {
      const res = await api.patch(`/api/boards/${boardId}/share`, {
        linkEnabled: !info?.sharing?.linkEnabled,
      });
      setInfo((i) => ({ ...i, sharing: res.data.sharing }));
      addToast(res.data.sharing?.linkEnabled ? 'Link sharing enabled' : 'Link sharing disabled');
    } catch {
      setError('Failed to update link sharing');
    }
  }

  async function setPermission(permission) {
    try {
      const res = await api.patch(`/api/boards/${boardId}/share`, { permission });
      setInfo((i) => ({ ...i, sharing: res.data.sharing }));
      addToast(`Permission updated to: ${permission}`);
    } catch {
      setError('Failed to update permission');
    }
  }

  async function invite() {
    if (!email.trim()) return;
    setError('');
    try {
      await api.post(`/api/boards/${boardId}/share/invite`, { email });
      addToast(`Invitation sent to ${email}`);
      setEmail('');
      const r = await api.get(`/api/boards/${boardId}/share`);
      setInfo(r.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invite failed');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    addToast('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  const linkEnabled = info?.sharing?.linkEnabled ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl p-6.5 w-full max-w-md border border-slate-100 dark:border-slate-800/80 transition-all duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">Share Board</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Invite collaborators or share a public link</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-4 py-2.5 rounded-xl border border-red-150 dark:border-red-900/40">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Board Link</label>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={shareLink} 
              className="input-field flex-1 text-xs bg-slate-50 dark:bg-slate-900/60 select-all border-slate-200 dark:border-slate-800/80" 
            />
            <button 
              onClick={copyLink} 
              className="btn-primary !px-4 shrink-0 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-normal">
            {linkEnabled
              ? 'Anyone with this link can access the board.'
              : 'Turn on link sharing below so others can open this link.'}
          </p>
        </div>

        {/* Link sharing toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 mb-4 transition-colors">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Link Sharing</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Allow access via the link above</div>
          </div>
          <button
            type="button"
            onClick={toggleLink}
            disabled={loading}
            className={`w-10 h-6 rounded-full transition-all relative border border-transparent cursor-pointer ${linkEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'}`}
          >
            <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${linkEnabled ? 'left-[19px]' : 'left-0.5'}`} />
          </button>
        </div>

        {linkEnabled && (
          <div className="mb-4">
            <select
              value={info?.sharing?.permission || 'view'}
              onChange={(e) => setPermission(e.target.value)}
              className="input-field text-xs cursor-pointer !py-2.5"
            >
              <option value="view">Anyone with link can view</option>
              <option value="edit">Anyone with link can edit</option>
            </select>
          </div>
        )}

        {/* Invite members by email */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4.5">
          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Invite by Email</label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborator@example.com"
              className="input-field flex-1 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && invite()}
            />
            <button onClick={invite} className="btn-primary !px-5 shrink-0 text-xs">Invite</button>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="mt-5 w-full py-3 text-xs font-semibold rounded-xl border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
