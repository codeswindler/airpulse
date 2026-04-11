'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Loader2, Shield, ShieldAlert, Trash2, User, X } from 'lucide-react';

type AdminRecord = {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  role: string;
  updatedAt: string;
  businessId: string | null;
  business?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type MeRecord = {
  role: string | null;
  selectedBusinessId: string | null;
  selectedBusiness?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  business?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function SystemUsersPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'BUSINESS_STAFF' as 'BUSINESS_OWNER' | 'BUSINESS_STAFF',
  });

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const meRes = await fetch('/api/admin/me', { cache: 'no-store' });
      const meData: MeRecord | null = meRes.ok ? await meRes.json() : null;

      setRole(meData?.role || null);
      setSelectedBusinessId(meData?.selectedBusinessId || null);
      setSelectedBusinessName(meData?.selectedBusiness?.name || meData?.business?.name || null);

      if (meData?.role === 'SUPERADMIN' && !meData.selectedBusinessId) {
        setAdmins([]);
        return;
      }

      const adminsRes = await fetch('/api/admin/system-users', { cache: 'no-store' });
      const adminsData = await adminsRes.json();
      setAdmins(Array.isArray(adminsData.admins) ? adminsData.admins : []);
    } catch (err) {
      console.error('Failed to fetch access data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, nextRole: string) => {
    const res = await fetch(`/api/admin/system-users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });

    if (res.ok) {
      const updated = await res.json();
      setAdmins(admins.map((admin) => (admin.id === id ? { ...admin, ...updated } : admin)));
      return;
    }

    const data = await res.json().catch(() => null);
    alert(data?.error || 'Failed to update role. Select a business first.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;

    const res = await fetch(`/api/admin/system-users/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setAdmins(admins.filter((admin) => admin.id !== id));
      return;
    }

    const data = await res.json().catch(() => null);
    alert(data?.error || 'Failed to delete account');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedBusinessId) {
      alert('Select a business from the top bar first.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            businessId: selectedBusinessId,
          }),
      });

      if (res.ok) {
        const newAdmin = await res.json();
        setAdmins([newAdmin, ...admins]);
        setShowModal(false);
        setFormData({
          name: '',
          email: '',
          phoneNumber: '',
          password: '',
          role: 'BUSINESS_STAFF',
        });
        return;
      }

      const data = await res.json();
      alert(data.error || 'Failed to create admin');
    } catch (err) {
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading access control...</div>;
  }

  if (role === 'SUPERADMIN' && !selectedBusinessId) {
    return (
      <div className="dashboard-scroll">
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Select an account first</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Access users are now tied to a business account. Pick a tenant from the top bar to manage its staff.
          </p>
          <Link href="/" style={{ color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none' }}>
            Go to admin portal
          </Link>
        </div>
      </div>
    );
  }

  const canManage = role === 'SUPERADMIN' && Boolean(selectedBusinessId);
  const roleOptions: Array<'BUSINESS_OWNER' | 'BUSINESS_STAFF'> = ['BUSINESS_OWNER', 'BUSINESS_STAFF'];

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Business Access</h1>
          <p>Manage the access accounts attached to the selected business.</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-hover)',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--text-primary)',
              fontWeight: 600,
              border: '1px solid var(--border-color)',
            }}
          >
            <Building2 size={14} color="var(--accent-color)" />
            <span>{selectedBusinessName || 'Current business'}</span>
          </div>
          {canManage ? (
            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
              style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff' }}
            >
              + Invite Admin
            </button>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 0 }}>
        <table className="responsive-table">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px' }}>User</th>
              <th style={{ padding: '16px 24px' }}>Access Level</th>
              <th style={{ padding: '16px 24px' }}>Last Active</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{admin.name || 'Admin'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{admin.email}</div>
                      {admin.phoneNumber ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{admin.phoneNumber}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td data-label="Access Level" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {admin.role === 'SUPERADMIN' ? <ShieldAlert size={14} color="var(--warning-color)" /> : <Shield size={14} color="var(--text-muted)" />}
                    {canManage ? (
                      <select
                        value={admin.role}
                        onChange={(e) => handleRoleChange(admin.id, e.target.value)}
                        style={{
                          backgroundColor: 'transparent',
                          color: admin.role === 'SUPERADMIN' ? 'var(--warning-color)' : 'var(--text-primary)',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {roleOptions.map((value) => (
                          <option key={value} value={value}>
                            {value === 'BUSINESS_OWNER' ? 'Business Owner' : 'Business Staff'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{admin.role}</span>
                    )}
                  </div>
                </td>
                <td data-label="Last Active" style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                  {new Date(admin.updatedAt).toLocaleDateString()}
                </td>
                <td data-label="Actions" style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    {canManage ? (
                      <button
                        onClick={() => handleDelete(admin.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Read only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} data-no-label="true" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No access accounts found for this business
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <ShieldAlert size={20} color="var(--warning-color)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Business-scoped access</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Access accounts now belong to the selected business only. Switch tenants from the header to manage a different client.
            </div>
          </div>
        </div>
      </div>

      {showModal && canManage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card glass-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-sidebar)', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Invite Business User</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="2547..."
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'BUSINESS_OWNER' | 'BUSINESS_STAFF' })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                >
                  <option value="BUSINESS_OWNER">Business Owner</option>
                  <option value="BUSINESS_STAFF">Business Staff</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', marginTop: '12px', backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
