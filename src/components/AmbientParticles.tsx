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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle density based on screen size
    const particleCount = width < 768 ? 22 : 45;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25 - 0.08, // Slow upward drift
        alpha: Math.random() * 0.2 + 0.05,
        maxAlpha: Math.random() * 0.25 + 0.1,
        pulseSpeed: Math.random() * 0.008 + 0.002,
      });
    }

    const getAccentColor = () => {
      if (typeof window === 'undefined') return '45, 212, 191';
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue('--accent').trim();

      // Fallbacks if computed hex/hsl needs RGB breakdown
      if (accent.startsWith('#')) {
        const hex = accent.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 45;
        const g = parseInt(hex.substring(2, 4), 16) || 212;
        const b = parseInt(hex.substring(4, 6), 16) || 191;
        return `${r}, ${g}, ${b}`;
      }
      return '45, 212, 191';
    };

    let rgb = getAccentColor();

    const updateRGB = () => {
      rgb = getAccentColor();
    };

    window.addEventListener('reflect_theme_change', updateRGB);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
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
        ctx.fillStyle = `rgba(${rgb}, ${Math.abs(p.alpha)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${rgb}, ${Math.abs(p.alpha) * 0.8})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('reflect_theme_change', updateRGB);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
    />
  );
}
