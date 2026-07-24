'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout, LayoutMode } from '@/contexts/DeviceLayoutContext';
import { ClipboardList, History, Settings, LogOut, Smartphone, Monitor, Zap, BarChart3, Target } from 'lucide-react';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { layoutMode, activeDevice, setLayoutMode } = useDeviceLayout();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/', label: 'Track', icon: ClipboardList },
    { href: '/history', label: 'History', icon: History },
    { href: '/charts', label: 'Charts', icon: BarChart3 },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/settings/questions', label: 'Settings', icon: Settings },
  ];

  const cycleLayoutMode = () => {
    if (layoutMode === 'auto') setLayoutMode('mobile');
    else if (layoutMode === 'mobile') setLayoutMode('desktop');
    else setLayoutMode('auto');
  };

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full craft-card border-b border-zinc-800/60 px-4 py-3 sm:px-8 flex items-center justify-between rounded-none shadow-md">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div 
              className="w-7 h-7 rounded-lg border flex items-center justify-center shadow-inner transition-transform group-hover:scale-105"
              style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
            >
              <span className="font-bold text-sm font-handwritten text-lg" style={{ color: 'var(--accent)' }}>R</span>
            </div>
            <span className="font-bold text-xl tracking-tight font-serif-journal" style={{ color: 'var(--foreground)' }}>
              Reflect<span style={{ color: 'var(--accent)' }}>.</span>
            </span>
          </Link>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1 font-ios-sans">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={isActive ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border border-transparent ${
                    isActive
                      ? 'shadow-sm font-bold'
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center space-x-2.5 font-ios-sans">
          {/* Layout Mode Switcher */}
          <button
            onClick={cycleLayoutMode}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 text-xs font-ios-mono text-zinc-400 transition-all cursor-pointer"
            title="Cycle Layout (Auto -> Mobile -> 16:9 PC)"
          >
            {layoutMode === 'auto' && <Zap className="w-3 h-3 text-amber-400" />}
            {layoutMode === 'mobile' && <Smartphone className="w-3 h-3 text-teal-400" />}
            {layoutMode === 'desktop' && <Monitor className="w-3 h-3 text-cyan-400" />}
            <span className="font-bold text-[11px] hidden md:inline">
              {layoutMode === 'auto' ? 'Auto ⚡' : layoutMode === 'mobile' ? 'Mobile 📱' : '16:9 PC 💻'}
            </span>
          </button>

          {user && (
            <button
              onClick={signOut}
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors border border-transparent hover:border-zinc-800 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Page Content: Dynamically sizes based on activeDevice */}
      <main className={`flex-1 pb-24 sm:pb-12 w-full mx-auto p-4 sm:p-6 transition-all duration-300 ${
        activeDevice === 'desktop' 
          ? 'max-w-7xl' 
          : 'max-w-md'
      }`}>
        {children}
      </main>

      {/* Bottom Navigation for Mobile Mode */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 craft-card border-t border-zinc-800/80 rounded-none ${
        activeDevice === 'desktop' ? 'sm:hidden' : 'block'
      }`}>
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
