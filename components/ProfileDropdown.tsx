'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie, setCookie } from 'cookies-next';
import { ChevronDown, LogOut, PencilLine, Shield, X, Lock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type Props = {
  adminName: string | null;
  adminEmail: string | null;
  adminPhoneNumber?: string | null;
  adminRole: string | null;
  showThemeToggle?: boolean;
  compact?: boolean;
  onProfileUpdated?: (updated: { name?: string | null; email?: string | null; phoneNumber?: string | null; role?: string | null }) => void;
};

type ProfileForm = {
  name: string;
  email: string;
  phoneNumber: string;
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

const defaultForm = (adminName: string | null, adminEmail: string | null, adminPhoneNumber?: string | null): ProfileForm => ({
  name: adminName || '',
  email: adminEmail || '',
  phoneNumber: adminPhoneNumber || '',
  currentPassword: '',
  password: '',
  confirmPassword: '',
});

export default function ProfileDropdown({
  adminName,
  adminEmail,
  adminPhoneNumber,
  adminRole,
  showThemeToggle = false,
  compact = false,
  onProfileUpdated,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(defaultForm(adminName, adminEmail, adminPhoneNumber));

  const displayName = adminName?.trim() || adminEmail?.trim() || 'Account';
  const displayEmail = adminEmail?.trim() || 'No email set';
  const avatarInitial = useMemo(() => {
    const source = adminName?.trim() || adminEmail?.trim() || 'A';
    return source.charAt(0).toUpperCase();
  }, [adminEmail, adminName]);

  useEffect(() => {
    if (!editOpen) {
      return;
    }

    setError(null);
    setForm(defaultForm(adminName, adminEmail, adminPhoneNumber));
  }, [adminEmail, adminName, adminPhoneNumber, editOpen]);

  const closeMenu = () => setMenuOpen(false);
  const closeEditor = () => {
    setEditOpen(false);
    setError(null);
    setForm(defaultForm(adminName, adminEmail, adminPhoneNumber));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    deleteCookie('admin_session');
    router.push('/login');
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const nextName = form.name.trim();
    const nextEmail = form.email.trim().toLowerCase();

    if (!nextName) {
      setError('Name is required.');
      return;
    }

    if (!nextEmail) {
      setError('Email is required.');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (form.password && !form.currentPassword) {
      setError('Enter your current password to change it.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          phoneNumber: form.phoneNumber.trim() || undefined,
          currentPassword: form.currentPassword || undefined,
          password: form.password || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.token) {
        setCookie('admin_session', data.token, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
        });
      }

      onProfileUpdated?.(data.user);
      closeEditor();
      closeMenu();
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close profile menu"
          onClick={closeMenu}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            border: 'none',
            padding: 0,
            zIndex: 998,
          }}
        />
      ) : null}

      {editOpen ? (
        <button
          type="button"
          aria-label="Close profile editor"
          onClick={closeEditor}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.42)',
            border: 'none',
            padding: 0,
            zIndex: 1000,
          }}
        />
      ) : null}

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label={`Open profile menu for ${displayName}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 6 : 8,
            padding: compact ? '4px 10px 4px 4px' : '4px 8px 4px 4px',
            borderRadius: 999,
            border: '1px solid var(--border-color)',
            backgroundColor: menuOpen ? 'var(--bg-hover)' : 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: '0.2s ease',
            width: compact ? 'fit-content' : 'auto',
            maxWidth: compact ? '100%' : 'none',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.5,
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.25)',
            }}
          >
            {avatarInitial}
          </div>
          <ChevronDown
            size={14}
            color="var(--text-secondary)"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s ease' }}
          />
        </button>

        {menuOpen ? (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: compact ? 'min(260px, calc(100vw - 32px))' : 260,
              backgroundColor: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
              zIndex: 999,
              overflow: 'hidden',
              padding: 6,
            }}
          >
            <div
              style={{
                padding: '12px 12px 14px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(59, 130, 246, 0.16)',
                    color: 'var(--accent-color)',
                    border: '1px solid rgba(59, 130, 246, 0.28)',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  {avatarInitial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayEmail}
                  </div>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                <Shield size={12} color="var(--accent-color)" />
                <span>{adminRole || 'ADMIN'}</span>
              </div>
            </div>

            {showThemeToggle ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Theme
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Quick appearance switch
                  </div>
                </div>
                <ThemeToggle size={30} />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: 'none',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <PencilLine size={16} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Edit profile</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: 'none',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--danger-color)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <LogOut size={16} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Logout</span>
            </button>
          </div>
        ) : null}
      </div>

      {editOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(560px, 100%)',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(10,15,28,0.98))',
              border: '1px solid var(--border-color)',
              borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              padding: 20,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div id="profile-dialog-title" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit profile
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Update your name, email, and password.
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close profile editor"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-name" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    outline: 'none',
                  }}
                  placeholder="Your full name"
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-email" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    outline: 'none',
                  }}
                  placeholder="name@company.com"
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-phone" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Phone number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) => setForm((value) => ({ ...value, phoneNumber: event.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    outline: 'none',
                  }}
                  placeholder="2547..."
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-current-password" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Current password
                </label>
                <input
                  id="profile-current-password"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) => setForm((value) => ({ ...value, currentPassword: event.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    outline: 'none',
                  }}
                  placeholder="Required only when changing password"
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-password" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  New password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="profile-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      padding: '12px 14px 12px 38px',
                      outline: 'none',
                    }}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="profile-confirm-password" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Confirm new password
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((value) => ({ ...value, confirmPassword: event.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    padding: '12px 14px',
                    outline: 'none',
                  }}
                  placeholder="Repeat the new password"
                />
              </div>

              {error ? (
                <div style={{ color: 'var(--danger-color)', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={closeEditor}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    padding: '11px 16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--accent-color)',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    padding: '11px 16px',
                    fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.75 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
