'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertTriangle, Fingerprint } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const router = useRouter();

  const isPlaceholder = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder-anon-key');

  // Trigger iOS Native Passkey / WebAuthn Conditional Mediation on iOS Safari
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      PublicKeyCredential.isConditionalMediationAvailable
    ) {
      PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
        setPasskeyAvailable(available);
        if (available) {
          try {
            // Signal conditional mediation request to Safari for native iOS Passkey & Keychain prompt
            navigator.credentials?.get({
              mediation: 'conditional',
              publicKey: {
                challenge: new Uint8Array([1, 2, 3, 4]),
                rpId: window.location.hostname,
                userVerification: 'preferred',
              },
            } as any).catch(() => {
              // Ignore conditional mediation dismissal/abort
            });
          } catch (e) {
            // Passkey conditional mediation fallback
          }
        }
      });
    }
  }, []);

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
          setMessage('Sign-up successful! If email confirmation is enabled in your Supabase dashboard, check your inbox to confirm your account. Otherwise, you can log in now.');
          setIsSignUp(false);
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
        {isPlaceholder && (
          <div className="mb-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-amber-200 text-xs flex items-start space-x-2.5 shadow-md">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-normal">
              <span className="font-bold block mb-0.5">Configuration Required</span>
              Your Supabase keys are not configured yet. Please copy the credentials into the <code className="bg-black/40 px-1 py-0.5 rounded font-mono border border-zinc-800">.env.local</code> file in your project root, then restart your dev server.
            </div>
          </div>
        )}

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

          <form className="space-y-6" onSubmit={handleAuth} autoComplete="on">
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
                  name="username"
                  type="email"
                  required
                  autoComplete="username webauthn"
                  inputMode="email"
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
                  autoComplete={isSignUp ? "new-password" : "current-password"}
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

          {passkeyAvailable && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center text-[11px] text-zinc-500 font-mono">
                <Fingerprint className="w-3.5 h-3.5 mr-1 text-teal-400" /> iOS Passkey / Face ID Autofill Ready
              </span>
            </div>
          )}

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
