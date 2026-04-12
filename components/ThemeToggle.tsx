'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Props = {
  className?: string;
  size?: number;
};

export default function ThemeToggle({ className, size = 32 }: Props) {
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
        borderRadius: 8, 
        backgroundColor: 'var(--bg-hover)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
        padding: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={Math.max(16, Math.floor(size * 0.55))} /> : <Moon size={Math.max(16, Math.floor(size * 0.55))} />}
    </button>
  );
}
