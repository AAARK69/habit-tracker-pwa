'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, History, Settings, LogOut } from 'lucide-react';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/', label: 'Track', icon: ClipboardList },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings/questions', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full craft-card border-b border-zinc-800/80 px-4 py-3 sm:px-6 flex items-center justify-between rounded-none">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg border flex items-center justify-center shadow-inner"
              style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
            >
              <span className="font-bold text-base font-handwritten text-xl" style={{ color: 'var(--accent)' }}>R</span>
            </div>
            <span className="font-bold text-2xl tracking-tight font-serif-journal" style={{ color: 'var(--foreground)' }}>
              Reflect<span style={{ color: 'var(--accent)' }}>.</span>
            </span>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={isActive ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border border-transparent ${
                    isActive
                      ? 'font-bold shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="flex items-center space-x-4">
          {user && (
            <span className="hidden md:inline text-xs text-zinc-500 font-mono">
              {user.email}
            </span>
          )}
          {user && (
            <button
              onClick={signOut}
              className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors border border-transparent hover:border-zinc-800 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 pb-24 sm:pb-12 max-w-2xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 craft-card border-t border-zinc-800/80 sm:hidden rounded-none">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={isActive ? { color: 'var(--accent)' } : {}}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${
                  isActive
                    ? 'font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
