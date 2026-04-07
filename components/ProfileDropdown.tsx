'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { deleteCookie } from 'cookies-next';

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    deleteCookie('admin_session');
    router.push('/login');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          padding: '4px 8px', 
          borderRadius: 8, 
          cursor: 'pointer',
          backgroundColor: open ? 'var(--bg-hover)' : 'transparent',
          transition: '0.2s'
        }}
      >
        <div style={{ 
          width: 32, 
          height: 32, 
          borderRadius: 16, 
          backgroundColor: 'var(--accent-color)', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 14
        }}>
           A
        </div>
        <ChevronDown size={14} color="var(--text-secondary)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </div>

      {open && (
        <>
          <div 
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
          />
          <div style={{ 
            position: 'absolute', 
            top: 'calc(100% + 8px)', 
            right: 0, 
            width: 180, 
            backgroundColor: 'var(--bg-dark)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 12, 
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 999,
            overflow: 'hidden',
            padding: '4px'
          }}>
            <div 
              style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}
              onClick={() => alert('Profile update coming soon...')}
            >
              <User size={16} /> Edit Profile
            </div>
            <div 
              onClick={handleLogout}
              style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 8, fontSize: 13, color: 'var(--danger-color)' }}
            >
              <LogOut size={16} /> Logout
            </div>
          </div>
        </>
      )}
    </div>
  );
}
