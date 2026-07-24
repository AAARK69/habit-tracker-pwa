'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export type LayoutMode = 'auto' | 'mobile' | 'desktop';

interface DeviceLayoutContextType {
  layoutMode: LayoutMode;
  activeDevice: 'mobile' | 'desktop';
  setLayoutMode: (mode: LayoutMode) => void;
}

const DeviceLayoutContext = createContext<DeviceLayoutContextType>({
  layoutMode: 'auto',
  activeDevice: 'desktop',
  setLayoutMode: () => {},
});

export function DeviceLayoutProvider({ children }: { children: React.ReactNode }) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>('auto');
  const [detectedDevice, setDetectedDevice] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    const saved = (localStorage.getItem('reflect_layout_mode') as LayoutMode) || 'auto';
    setLayoutModeState(saved);

    const checkDevice = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isPhoneUA = /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);

      // PC Widescreen Desktop Mode vs Mobile PWA Mode
      // Mobile if width < 768px OR (phone user agent AND portrait aspect ratio)
      if (width < 768 || (isPhoneUA && isPortrait)) {
        setDetectedDevice('mobile');
      } else {
        setDetectedDevice('desktop');
      }
    };

    checkDevice();

    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem('reflect_layout_mode', mode);
  };

  const activeDevice = layoutMode === 'auto' ? detectedDevice : layoutMode;

  return (
    <DeviceLayoutContext.Provider value={{ layoutMode, activeDevice, setLayoutMode }}>
      <div data-device-mode={activeDevice} className="min-h-screen">
        {children}
      </div>
    </DeviceLayoutContext.Provider>
  );
}

export const useDeviceLayout = () => useContext(DeviceLayoutContext);
