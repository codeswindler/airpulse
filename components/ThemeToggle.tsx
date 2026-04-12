'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Props = {
  className?: string;
  size?: number;
  tone?: 'default' | 'accent';
};

export default function ThemeToggle({ className, size = 32, tone = 'default' }: Props) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={className}
      style={{ 
        width: size, 
        height: size, 
        borderRadius: tone === 'accent' ? 999 : 8, 
        background: tone === 'accent'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.10))'
          : 'var(--bg-hover)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer',
        color: tone === 'accent' ? 'var(--success-color)' : 'var(--text-secondary)',
        border: tone === 'accent'
          ? '1px solid rgba(16, 185, 129, 0.24)'
          : '1px solid var(--border-color)',
        padding: 0,
        boxShadow: tone === 'accent'
          ? '0 0 0 1px rgba(16, 185, 129, 0.06) inset, 0 8px 16px rgba(16, 185, 129, 0.10)'
          : 'none',
      }}
    >
      {theme === 'dark' ? <Sun size={Math.max(16, Math.floor(size * 0.55))} /> : <Moon size={Math.max(16, Math.floor(size * 0.55))} />}
    </button>
  );
}
