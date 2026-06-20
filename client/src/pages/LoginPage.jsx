import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, ArrowRight, Sparkles, Brush, Users, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    }
  }

  const features = [
    { icon: <Brush className="w-5 h-5 text-indigo-400" />, text: 'Infinite Drawing Canvas' },
    { icon: <Users className="w-5 h-5 text-purple-400" />, text: 'Real-Time Team Sync' },
    { icon: <Sparkles className="w-5 h-5 text-pink-400" />, text: 'AI-Generated Diagrams' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 dark:bg-[#09090e] transition-colors duration-300">
      {/* Brand & Marketing Column */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-16 bg-gradient-brand text-white relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
        
        {/* Animated ambient glowing circles */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-45 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur">
            <Brush className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SketchForge</span>
        </div>

        <div className="relative z-10 max-w-lg my-auto space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
            Think together, sketch faster.
          </h1>
          <p className="text-lg text-indigo-100/80 leading-relaxed font-light">
            The collaborative online whiteboard for crafting beautiful, hand-drawn diagrams, user flows, mind maps, and wireframes.
          </p>

          <div className="pt-6 space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3.5 bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/25">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-indigo-200/60 font-light flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Used by developers, designers, and product teams globally.</span>
        </div>
      </div>

      {/* Form Column */}
      <div className="flex lg:col-span-5 items-center justify-center p-8 sm:p-16">
        <div className="w-full max-w-md bg-white dark:bg-[#12121e] border border-slate-100 dark:border-slate-800/80 p-8 sm:p-10 rounded-3xl shadow-premium relative z-10 transition-all duration-300">
          
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Brush className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">SketchForge</span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Sign in to access and collaborate on your whiteboards.</p>

          {error && (
            <div className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-4.5 py-3.5 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-shake">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
                <input 
                  className="input-field input-icon-padding" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  type="email" 
                  required 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
                <input 
                  className="input-field input-icon-padding" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2 transition-all duration-300"
            >
              {loading ? (
                <span className="inline-block w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm mt-8 text-center text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline" to="/register">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

