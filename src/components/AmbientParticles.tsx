'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  pulseSpeed: number;
}

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let isPaused = false;

    // Debounced window resize handler
    let resizeTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Pause rendering when tab is hidden to preserve 100% CPU/GPU performance
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && !animationFrameId) {
        render();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Particle density based on screen size
    const particleCount = width < 768 ? 18 : 35;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2 - 0.06, // Slow upward drift
        alpha: Math.random() * 0.18 + 0.05,
        maxAlpha: Math.random() * 0.22 + 0.08,
        pulseSpeed: Math.random() * 0.006 + 0.002,
      });
    }

    let cachedRGB = '45, 212, 191';

    const updateCachedRGB = () => {
      if (typeof window === 'undefined') return;
      try {
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim();

        if (accent.startsWith('#')) {
          const hex = accent.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) || 45;
          const g = parseInt(hex.substring(2, 4), 16) || 212;
          const b = parseInt(hex.substring(4, 6), 16) || 191;
          cachedRGB = `${r}, ${g}, ${b}`;
        } else {
          cachedRGB = '45, 212, 191';
        }
      } catch {
        cachedRGB = '45, 212, 191';
      }
    };

    updateCachedRGB();
    window.addEventListener('reflect_theme_change', updateCachedRGB);

    const render = () => {
      if (isPaused) return;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Subtle alpha pulsing
        p.alpha += p.pulseSpeed;
        if (p.alpha > p.maxAlpha || p.alpha < 0.03) {
          p.pulseSpeed = -p.pulseSpeed;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cachedRGB}, ${Math.abs(p.alpha)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('reflect_theme_change', updateCachedRGB);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
    />
  );
}
