'use client';

import { useState, useEffect } from 'react';
import { User, Shield, ShieldAlert, Edit, Trash2, X, Loader2 } from 'lucide-react';

export default function SystemUsersPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'MODERATOR' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/system-users');
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error('Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    const res = await fetch(`/api/admin/system-users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (res.ok) {
       setAdmins(admins.map(a => a.id === id ? { ...a, role } : a));
    } else {
       alert('Failed to update role. Only Superadmins can perform this action.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    
    const res = await fetch(`/api/admin/system-users/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      setAdmins(admins.filter(a => a.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const newAdmin = await res.json();
        setAdmins([newAdmin, ...admins]);
        setShowModal(false);
        setFormData({ name: '', email: '', password: '', role: 'MODERATOR' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create admin');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading access control...</div>;

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>System Access & Permissions</h1>
          <p>Manage administrative roles and dashboard access levels.</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff' }}
          >
            + Invite Admin
          </button>
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
            {admins.map(admin => (
              <tr key={admin.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="User" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} color="var(--text-secondary)" />
                     </div>
                     <div>
                        <div style={{ fontWeight: 600 }}>{admin.name || 'Admin'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{admin.email}</div>
                     </div>
                  </div>
                </td>
                <td data-label="Access Level" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     {admin.role === 'SUPERADMIN' ? <ShieldAlert size={14} color="var(--warning-color)" /> : <Shield size={14} color="var(--text-muted)" />}
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
                         outline: 'none'
                       }}
                     >
                        <option value="SUPERADMIN">Superadmin</option>
                        <option value="MODERATOR">Moderator</option>
                     </select>
                  </div>
                </td>
                <td data-label="Last Active" style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                   {new Date(admin.updatedAt).toLocaleDateString()}
                </td>
                <td data-label="Actions" style={{ padding: '16px 24px', textAlign: 'right' }}>
                   <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleDelete(admin.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
         <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} color="var(--warning-color)" />
            <div>
               <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Role Permissions Overview</div>
               <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  • **Superadmin**: Full access to all modules, including editing AirPulse and SMS API credentials.<br/>
                  • **Moderator**: Can view transactions and manage customers, but cannot edit system-wide API configurations.
               </div>
            </div>
         </div>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-sidebar)', padding: '32px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Invite New Admin</h2>
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
                     type="text" required
                     placeholder="John Doe"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                   />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                   <input 
                     type="email" required
                     placeholder="admin@example.com"
                     value={formData.email}
                     onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                     style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                   />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Initial Password</label>
                   <input 
                     type="password" required
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
                     onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                     style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                   >
                      <option value="MODERATOR">Moderator</option>
                      <option value="SUPERADMIN">Superadmin</option>
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
