'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, Loader2, Plus, Users, X } from 'lucide-react';
import StatusPill from '@/components/StatusPill';

type BusinessRecord = {
  id: string;
  name: string;
  slug: string;
  serviceCode: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  description: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  credentialFill: {
    mpesa: boolean;
    tupay: boolean;
    sms: boolean;
    total: number;
  };
  credentials: Record<string, string>;
  adminCount: number;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  slug: string;
  serviceCode: string;
  status: 'ACTIVE' | 'SUSPENDED';
  description: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaPasskey: string;
  mpesaShortcode: string;
  mpesaBusinessShortcode: string;
  mpesaPartyB: string;
  mpesaEnvironment: string;
  mpesaTransactionType: string;
  mpesaCallbackUrl: string;
  tupayUuid: string;
  tupayApiKey: string;
  tupaySecret: string;
  smsProvider: string;
  smsPartnerId: string;
  smsApiKey: string;
  smsSenderId: string;
  smsAccessKey: string;
  smsClientId: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  serviceCode: '',
  status: 'ACTIVE',
  description: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  mpesaConsumerKey: '',
  mpesaConsumerSecret: '',
  mpesaPasskey: '',
  mpesaShortcode: '',
  mpesaBusinessShortcode: '',
  mpesaPartyB: '',
  mpesaEnvironment: 'production',
  mpesaTransactionType: 'CustomerBuyGoodsOnline',
  mpesaCallbackUrl: '',
  tupayUuid: '',
  tupayApiKey: '',
  tupaySecret: '',
  smsProvider: '',
  smsPartnerId: '',
  smsApiKey: '',
  smsSenderId: '',
  smsAccessKey: '',
  smsClientId: '',
};

const FIELD_GROUPS: Array<{ title: string; fields: Array<keyof FormState> }> = [
  {
    title: 'Business Profile',
    fields: ['name', 'slug', 'serviceCode', 'status', 'description', 'ownerName', 'ownerEmail', 'ownerPassword'],
  },
  {
    title: 'M-Pesa',
    fields: [
      'mpesaConsumerKey',
      'mpesaConsumerSecret',
      'mpesaPasskey',
      'mpesaShortcode',
      'mpesaBusinessShortcode',
      'mpesaPartyB',
      'mpesaEnvironment',
      'mpesaTransactionType',
      'mpesaCallbackUrl',
    ],
  },
  {
    title: 'Tupay & SMS',
    fields: [
      'tupayUuid',
      'tupayApiKey',
      'tupaySecret',
      'smsProvider',
      'smsPartnerId',
      'smsApiKey',
      'smsSenderId',
      'smsAccessKey',
      'smsClientId',
    ],
  },
];

function toDisplay(value: string | null | undefined) {
  return value && value.trim() ? value : 'Not set';
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getStatusTone(status: BusinessRecord['status']) {
  return status === 'ACTIVE' ? 'success' : 'warning';
}

function metricTone(ready: boolean) {
  return ready ? 'success' : 'danger';
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [role, setRole] = useState<string | null>(null);

  const editingBusiness = useMemo(
    () => businesses.find((business) => business.id === editingId) ?? null,
    [businesses, editingId]
  );

  useEffect(() => {
    void loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const [meRes, businessesRes] = await Promise.all([
        fetch('/api/admin/me', { cache: 'no-store' }),
        fetch('/api/admin/businesses', { cache: 'no-store' }),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setRole(meData.role || null);
      }

      const data = await businessesRes.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Failed to load businesses', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (business: BusinessRecord) => {
    setEditingId(business.id);
    setForm({
      ...EMPTY_FORM,
      name: business.name,
      slug: business.slug,
      serviceCode: business.serviceCode || '',
      status: business.status,
      description: business.description || '',
      ownerName: business.ownerName || '',
      ownerEmail: business.ownerEmail || '',
      mpesaConsumerKey: business.credentials.mpesaConsumerKey || '',
      mpesaConsumerSecret: business.credentials.mpesaConsumerSecret || '',
      mpesaPasskey: business.credentials.mpesaPasskey || '',
      mpesaShortcode: business.credentials.mpesaShortcode || '',
      mpesaBusinessShortcode: business.credentials.mpesaBusinessShortcode || '',
      mpesaPartyB: business.credentials.mpesaPartyB || '',
      mpesaEnvironment: business.credentials.mpesaEnvironment || 'production',
      mpesaTransactionType: business.credentials.mpesaTransactionType || 'CustomerBuyGoodsOnline',
      mpesaCallbackUrl: business.credentials.mpesaCallbackUrl || '',
      tupayUuid: business.credentials.tupayUuid || '',
      tupayApiKey: business.credentials.tupayApiKey || '',
      tupaySecret: business.credentials.tupaySecret || '',
      smsProvider: business.credentials.smsProvider || '',
      smsPartnerId: business.credentials.smsPartnerId || '',
      smsApiKey: business.credentials.smsApiKey || '',
      smsSenderId: business.credentials.smsSenderId || '',
      smsAccessKey: business.credentials.smsAccessKey || '',
      smsClientId: business.credentials.smsClientId || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        slug: form.slug || normalizeSlug(form.name),
      };

      const endpoint = editingId ? `/api/admin/businesses/${editingId}` : '/api/admin/businesses';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save business');
      }

      await loadBusinesses();
      closeModal();
    } catch (error: any) {
      alert(error?.message || 'Failed to save business');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading businesses...</div>;
  }

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Businesses</h1>
          <p>Superadmin view for tenant accounts, credentials, and ownership.</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {role === 'SUPERADMIN' ? <StatusPill label="Superadmin access" tone="success" /> : null}
          <button
            className="btn-primary"
            onClick={openCreateModal}
            style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} />
            Create Business
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
        {businesses.map((business) => (
          <div key={business.id} className="card" style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Building2 size={18} color="var(--accent-color)" />
                  <h3 style={{ margin: 0, fontSize: 18 }}>{business.name}</h3>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  /{business.slug}
                </div>
              </div>
              <StatusPill label={business.status === 'ACTIVE' ? 'Active' : 'Suspended'} tone={getStatusTone(business.status)} />
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>USSD Code</span>
                <strong style={{ color: 'var(--text-primary)' }}>{toDisplay(business.serviceCode)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Owner</span>
                <strong style={{ color: 'var(--text-primary)' }}>{toDisplay(business.ownerName || business.ownerEmail)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Admin Accounts</span>
                <strong style={{ color: 'var(--text-primary)' }}>{business.adminCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>M-Pesa Ready</span>
                <StatusPill label={business.credentialFill.mpesa ? 'Ready' : 'Not ready'} tone={metricTone(business.credentialFill.mpesa)} />
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button
                type="button"
                onClick={() => openEditModal(business)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                Edit
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Users size={14} />
                <span>{business.credentialFill.total} fields set</span>
              </div>
            </div>
          </div>
        ))}

        {businesses.length === 0 ? (
          <div className="card" style={{ flex: '1 1 100%', textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
            No businesses yet. Create the first tenant to get started.
          </div>
        ) : null}
      </div>

      {showModal ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: 960, maxHeight: '90vh', overflow: 'auto', backgroundColor: 'var(--bg-sidebar)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{editingBusiness ? `Edit ${editingBusiness.name}` : 'Create Business'}</h2>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {editingBusiness ? 'Update tenant details and stored credentials.' : 'Create a tenant and its first owner account.'}
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              {FIELD_GROUPS.map((group) => (
                <section key={group.title} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <KeyRound size={14} color="var(--accent-color)" />
                    <h3 style={{ margin: 0, fontSize: 14, letterSpacing: 0.2 }}>{group.title}</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {group.fields.map((field) => {
                      if (field === 'description') {
                        return (
                          <label key={field} style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Description</span>
                            <textarea
                              value={form.description}
                              onChange={(e) => updateField('description', e.target.value)}
                              rows={3}
                              style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                            />
                          </label>
                        );
                      }

                      if (field === 'status') {
                        return (
                          <label key={field} style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status</span>
                            <select
                              value={form.status}
                              onChange={(e) => updateField('status', e.target.value)}
                              style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="SUSPENDED">Suspended</option>
                            </select>
                          </label>
                        );
                      }

                      if (field === 'mpesaEnvironment') {
                        return (
                          <label key={field} style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>M-Pesa Environment</span>
                            <select
                              value={form.mpesaEnvironment}
                              onChange={(e) => updateField('mpesaEnvironment', e.target.value)}
                              style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                            >
                              <option value="production">Production</option>
                              <option value="sandbox">Sandbox</option>
                            </select>
                          </label>
                        );
                      }

                      if (field === 'mpesaTransactionType') {
                        return (
                          <label key={field} style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>M-Pesa Transaction Type</span>
                            <input
                              value={form.mpesaTransactionType}
                              onChange={(e) => updateField('mpesaTransactionType', e.target.value)}
                              style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                            />
                          </label>
                        );
                      }

                      const labelMap: Record<keyof FormState, string> = {
                        name: 'Business Name',
                        slug: 'Slug',
                        serviceCode: 'USSD Service Code',
                        status: 'Status',
                        description: 'Description',
                        ownerName: 'Owner Name',
                        ownerEmail: 'Owner Email',
                        ownerPassword: 'Owner Password',
                        mpesaConsumerKey: 'Consumer Key',
                        mpesaConsumerSecret: 'Consumer Secret',
                        mpesaPasskey: 'Passkey',
                        mpesaShortcode: 'Shortcode',
                        mpesaBusinessShortcode: 'Business Shortcode',
                        mpesaPartyB: 'Party B',
                        mpesaEnvironment: 'M-Pesa Environment',
                        mpesaTransactionType: 'M-Pesa Transaction Type',
                        mpesaCallbackUrl: 'Callback URL',
                        tupayUuid: 'Tupay UUID',
                        tupayApiKey: 'Tupay API Key',
                        tupaySecret: 'Tupay Secret',
                        smsProvider: 'SMS Provider',
                        smsPartnerId: 'SMS Partner ID',
                        smsApiKey: 'SMS API Key',
                        smsSenderId: 'SMS Sender ID',
                        smsAccessKey: 'SMS Access Key',
                        smsClientId: 'SMS Client ID',
                      };

                      const typeMap: Partial<Record<keyof FormState, string>> = {
                        ownerPassword: 'password',
                        ownerEmail: 'email',
                        mpesaCallbackUrl: 'url',
                        serviceCode: 'text',
                      };

                      if (field === 'name' || field === 'slug' || field === 'serviceCode' || field === 'ownerName' || field === 'ownerEmail' || field === 'ownerPassword' || field === 'mpesaConsumerKey' || field === 'mpesaConsumerSecret' || field === 'mpesaPasskey' || field === 'mpesaShortcode' || field === 'mpesaBusinessShortcode' || field === 'mpesaPartyB' || field === 'mpesaCallbackUrl' || field === 'tupayUuid' || field === 'tupayApiKey' || field === 'tupaySecret' || field === 'smsProvider' || field === 'smsPartnerId' || field === 'smsApiKey' || field === 'smsSenderId' || field === 'smsAccessKey' || field === 'smsClientId') {
                        return (
                          <label key={field} style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{labelMap[field]}</span>
                            <input
                              type={typeMap[field] || 'text'}
                              value={form[field]}
                              onChange={(e) => updateField(field, e.target.value)}
                              placeholder={field === 'slug' ? 'auto-generated from name' : undefined}
                              required={field === 'name' || (!editingId && (field === 'ownerEmail' || field === 'ownerPassword'))}
                              style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                            />
                          </label>
                        );
                      }

                      return null;
                    })}
                  </div>
                </section>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 10 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff', minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingBusiness ? 'Save Changes' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
