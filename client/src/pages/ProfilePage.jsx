import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { User, Lock, Camera, Palette, Check, Save, ArrowLeft } from 'lucide-react';

const CURSOR_COLORS = [
  { value: '#6366f1', name: 'Indigo' },
  { value: '#10b981', name: 'Emerald' },
  { value: '#f43f5e', name: 'Rose' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#8b5cf6', name: 'Purple' },
];

function resizeAvatar(dataUrl, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Invalid image'));
    img.src = dataUrl;
  });
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [cursorColor, setCursorColor] = useState('#6366f1');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/users/me')
      .then((r) => {
        setName(r.data.user.name || '');
        setAvatar(r.data.user.avatar || '');
        setCursorColor(r.data.user.cursorColor || '#6366f1');
        setUser(r.data.user);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [setUser]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = { name: name.trim(), cursorColor };

      if (avatar && avatar !== user?.avatar) {
        if (avatar.startsWith('data:')) {
          const resized = await resizeAvatar(avatar);
          const upload = await api.post('/api/upload/image', { image: resized });
          payload.avatar = upload.data.url;
        } else {
          payload.avatar = avatar;
        }
      }

      if (newPassword) {
        if (!currentPassword) {
          setError('Enter your current password to set a new one');
          setSaving(false);
          return;
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.patch('/api/users/me', payload);
      setUser(res.data.user);
      setAvatar(res.data.user.avatar || '');
      setCursorColor(res.data.user.cursorColor || '#6366f1');
      setMessage('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f1a] flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090e] transition-colors duration-300 pb-12">
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#12121e]/80 backdrop-blur-xl sticky top-0 z-10 transition-colors">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:opacity-85 transition">
            <ArrowLeft className="w-4.5 h-4.5" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Profile Settings</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-[#12121e] rounded-3xl shadow-premium border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
          
          {/* Decorative Cover */}
          <div className="h-32 bg-gradient-brand relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          </div>

          <div className="px-6 sm:px-8 pb-8 -mt-14 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 mb-8">
              <label className="relative cursor-pointer group inline-block self-start shrink-0">
                <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-[#12121e] shadow-md bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center overflow-hidden transition-colors">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{(name || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-2xl bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition duration-200">
                  <Camera className="w-5 h-5" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
              </label>
              <div className="mb-1">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{name || 'Your Profile'}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{user?.email}</p>
              </div>
            </div>

            {message && (
              <div className="mb-6 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-4.5 py-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {message}
              </div>
            )}
            {error && (
              <div className="mb-6 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-4.5 py-3.5 rounded-2xl border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={onSave} className="space-y-6">
              
              {/* Account Details */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Account Details
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Display Name</label>
                  <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="input-field" 
                    required 
                    minLength={1} 
                  />
                </div>
              </div>

              {/* Collaboration Settings */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-500" />
                  Collaboration Settings
                </h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Live Cursor Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {CURSOR_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCursorColor(c.value)}
                        className="w-10 h-10 rounded-xl border-2 transition-transform relative duration-200 hover:scale-105 active:scale-95"
                        style={{ 
                          backgroundColor: c.value, 
                          borderColor: cursorColor === c.value ? '#4f46e5' : 'transparent',
                          boxShadow: cursorColor === c.value ? `0 0 12px ${c.value}60` : 'none'
                        }}
                        title={c.name}
                      >
                        {cursorColor === c.value && (
                          <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This color represents your cursor and selections on team boards.</p>
                </div>
              </div>

              {/* Password updates */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Security Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Leave blank if you do not wish to update your password.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="input-field" 
                      autoComplete="current-password" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">New Password</label>
                    <input 
                      type="password" 
                      placeholder="Min 6 characters" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="input-field" 
                      minLength={6} 
                      autoComplete="new-password" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto px-8 py-3.5 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
