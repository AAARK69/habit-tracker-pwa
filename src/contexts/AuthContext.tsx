'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setGuestUser: (email?: string) => void;
  signOut: () => Promise<void>;
}

const GUEST_USER_KEY = 'reflect_guest_user';

export const LOCAL_GUEST_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Guest Reflector' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'guest@reflect.local',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  setGuestUser: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const setGuestUser = (email: string = 'guest@reflect.local') => {
    const customUser = { ...LOCAL_GUEST_USER, email };
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(customUser));
    setUser(customUser as any);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    // Check for saved local guest user first
    const savedGuest = localStorage.getItem(GUEST_USER_KEY);
    if (savedGuest) {
      try {
        const guestObj = JSON.parse(savedGuest);
        if (mounted) {
          setUser(guestObj);
          setLoading(false);
          if (pathname === '/login') {
            router.push('/');
          }
          return;
        }
      } catch (e) {}
    }

    // Get current Supabase session status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (!session && !savedGuest && pathname !== '/login') {
          router.push('/login');
        }
      }
    }).catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session) {
          localStorage.removeItem(GUEST_USER_KEY);
          setSession(session);
          setUser(session.user);
          setLoading(false);
          if (pathname === '/login') {
            router.push('/');
          }
        } else if (!localStorage.getItem(GUEST_USER_KEY)) {
          setSession(null);
          setUser(null);
          setLoading(false);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const signOut = async () => {
    setLoading(true);
    localStorage.removeItem(GUEST_USER_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, setGuestUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
