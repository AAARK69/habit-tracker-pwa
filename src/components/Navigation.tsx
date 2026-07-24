'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceLayout, LayoutMode } from '@/contexts/DeviceLayoutContext';
import { ClipboardList, History, Settings, LogOut, Smartphone, Monitor, Zap, BarChart3 } from 'lucide-react';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { layoutMode, activeDevice, setLayoutMode } = useDeviceLayout();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/', label: 'Track', icon: ClipboardList },
    { href: '/history', label: 'History', icon: History },
    { href: '/charts', label: 'Charts', icon: BarChart3 },
    { href: '/settings/questions', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full craft-card border-b border-zinc-800/80 px-4 py-3 sm:px-8 flex items-center justify-between rounded-none shadow-md">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-lg border flex items-center justify-center shadow-inner"
              style={{ backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent-border)' }}
            >
              <span className="font-bold text-base font-handwritten text-xl" style={{ color: 'var(--accent)' }}>R</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-2xl tracking-tight font-serif-journal" style={{ color: 'var(--foreground)' }}>
                Reflect<span style={{ color: 'var(--accent)' }}>.</span>
              </span>
              <span className="hidden md:inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {activeDevice === 'desktop' ? '💻 16:9 Desktop Studio' : '📱 Mobile PWA'}
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={isActive ? { backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'var(--accent-border)' } : {}}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-sm transition-all duration-200 border border-transparent ${
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

        {/* Layout Switcher & User toolbar */}
        <div className="flex items-center space-x-3">
          {/* Layout Mode Selector Toggle */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              onClick={() => setLayoutMode('auto')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                layoutMode === 'auto' ? 'bg-zinc-850 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Auto Detect Device"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline text-[10px]">Auto</span>
            </button>

            <button
              onClick={() => setLayoutMode('mobile')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                layoutMode === 'mobile' ? 'bg-zinc-850 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Force Mobile Vertical Layout"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline text-[10px]">Mobile</span>
            </button>

            <button
              onClick={() => setLayoutMode('desktop')}
              className={`p-1.5 rounded-lg text-xs font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                layoutMode === 'desktop' ? 'bg-zinc-850 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Force Desktop 16:9 Layout"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline text-[10px]">16:9 PC</span>
            </button>
          </div>

          {user && (
            <span className="hidden lg:inline text-xs text-zinc-500 font-mono border-l border-zinc-800 pl-3">
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
