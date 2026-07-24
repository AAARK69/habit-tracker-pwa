'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('reflect_accent_theme') || 'teal';
      document.documentElement.setAttribute('data-theme', theme);
    };

    applyTheme();

    window.addEventListener('reflect_theme_change', applyTheme);
    return () => window.removeEventListener('reflect_theme_change', applyTheme);
  }, []);

  return <>{children}</>;
}
