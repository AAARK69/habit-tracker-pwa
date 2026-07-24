'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage('Sign-up successful! You can now log in using your credentials.');
          setIsSignUp(false); // Switch to sign-in so they can log in
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-6 lg:px-8 bg-zinc-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center shadow-lg shadow-black/40 mb-4">
          <span className="font-extrabold text-2xl text-teal-400">R</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {isSignUp ? 'Start tracking your habits and reflection journey' : 'Sign in to log today\'s habits'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel p-8 rounded-2xl shadow-xl shadow-black/60 border border-zinc-800/80">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-lg text-sm">
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-450 text-zinc-100 placeholder-zinc-500 text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-450 text-zinc-100 placeholder-zinc-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="glow-btn w-full flex justify-center py-2.5 px-4 border border-zinc-800 rounded-lg text-sm font-medium text-black bg-gradient-to-r from-teal-400 to-emerald-400 hover:opacity-95 transition shadow-lg shadow-teal-500/10 focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : isSignUp ? (
                  'Sign Up'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-zinc-400 bg-transparent">
                {isSignUp ? 'Already have an account?' : 'New to Reflect?'}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 text-teal-450 hover:text-teal-400 underline font-medium cursor-pointer"
                >
                  {isSignUp ? 'Sign In' : 'Create an account'}
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
