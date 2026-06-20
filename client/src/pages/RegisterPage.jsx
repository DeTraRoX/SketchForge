import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, ArrowRight, Brush } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    }
  }

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
            Join the whiteboard revolution.
          </h1>
          <p className="text-lg text-indigo-100/80 leading-relaxed font-light">
            Create an account in seconds and unlock real-time collaboration, shape grouping, custom text fonts, and SVG exports.
          </p>
        </div>

        <div className="relative z-10 text-xs text-indigo-200/60 font-light">
          © 2026 SketchForge Inc. All rights reserved.
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

          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Create account</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Get started sketching and planning with your team.</p>

          {error && (
            <div className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-4.5 py-3.5 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-shake">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
                <input 
                  className="input-field input-icon-padding" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  type="text"
                  required 
                  placeholder="Your Name" 
                />
              </div>
            </div>

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
                  minLength={6}
                  placeholder="Min 6 characters" 
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm mt-8 text-center text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline" to="/login">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

