'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, KeyRound, Loader2, Plus, Power, Trash2, Users, X } from 'lucide-react';
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
  subscriptionEndsAt: string | null;
  subscription: {
    endsAt: string | null;
    isExpired: boolean;
    daysRemaining: number | null;
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
  subscriptionEndsAt: string;
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
  subscriptionEndsAt: '',
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
    fields: ['name', 'slug', 'serviceCode', 'status', 'description', 'ownerName', 'ownerEmail', 'ownerPassword', 'subscriptionEndsAt'],
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

function formatSubscription(subscription: BusinessRecord['subscription']) {
  if (!subscription.endsAt) {
    return 'No subscription set';
  }

  if (subscription.isExpired) {
    return 'Expired';
  }

  if (subscription.daysRemaining !== null) {
    return `${subscription.daysRemaining} day${subscription.daysRemaining === 1 ? '' : 's'} left`;
  }

  return new Date(subscription.endsAt).toLocaleDateString();
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [role, setRole] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState<BusinessRecord | null>(null);
  const [subscriptionMode, setSubscriptionMode] = useState<'ADD' | 'DEBIT'>('ADD');
  const [subscriptionDays, setSubscriptionDays] = useState('');
  const [subscriptionHours, setSubscriptionHours] = useState('');

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
      subscriptionEndsAt: toDateTimeLocalValue(business.subscriptionEndsAt),
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

  const patchBusiness = async (businessId: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/businesses/${businessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update business');
    }

    await loadBusinesses();
  };

  const handleToggleStatus = async (business: BusinessRecord) => {
    const nextStatus = business.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const prompt = nextStatus === 'SUSPENDED'
      ? `Suspend ${business.name}? They will stop receiving live traffic until reactivated.`
      : `Reactivate ${business.name}?`;

    if (!window.confirm(prompt)) {
      return;
    }

    setActionLoadingId(business.id);

    try {
      await patchBusiness(business.id, { status: nextStatus });
    } catch (error: any) {
      alert(error?.message || 'Failed to update business status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openSubscriptionAdjuster = (business: BusinessRecord) => {
    setSubscriptionTarget(business);
    setSubscriptionMode('ADD');
    setSubscriptionDays('');
    setSubscriptionHours('');
  };

  const closeSubscriptionAdjuster = () => {
    setSubscriptionTarget(null);
    setSubscriptionMode('ADD');
    setSubscriptionDays('');
    setSubscriptionHours('');
  };

  const handleSubscriptionAdjust = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!subscriptionTarget) {
      return;
    }

    const days = Number(subscriptionDays || 0);
    const hours = Number(subscriptionHours || 0);

    if (!Number.isFinite(days) || !Number.isFinite(hours)) {
      alert('Please enter valid days and hours.');
      return;
    }

    if (days === 0 && hours === 0) {
      alert('Enter at least one day or hour adjustment.');
      return;
    }

    setActionLoadingId(subscriptionTarget.id);

    try {
      await patchBusiness(subscriptionTarget.id, {
        subscriptionDeltaDays: days,
        subscriptionDeltaHours: hours,
        subscriptionMode,
      });
      closeSubscriptionAdjuster();
    } catch (error: any) {
      alert(error?.message || 'Failed to update subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBusiness = async (business: BusinessRecord) => {
    const confirmText = `Delete ${business.name} permanently? This removes the business and all attached tenant data.`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setActionLoadingId(business.id);

    try {
      const response = await fetch(`/api/admin/businesses/${business.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete business');
      }

      await loadBusinesses();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete business');
    } finally {
      setActionLoadingId(null);
    }
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

  if (role !== 'SUPERADMIN') {
    return (
      <div className="dashboard-scroll">
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Access restricted</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Business management is available to superadmins only.
          </p>
        </div>
      </div>
    );
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
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Subscription</span>
                <strong style={{ color: business.subscription.isExpired ? 'var(--danger-color)' : 'var(--success-color)' }}>
                  {formatSubscription(business.subscription)}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Users size={14} />
                <span>{business.credentialFill.total} fields set</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openEditModal(business)}
                  disabled={actionLoadingId === business.id}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', cursor: actionLoadingId === business.id ? 'not-allowed' : 'pointer' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openSubscriptionAdjuster(business)}
                  disabled={actionLoadingId === business.id}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', cursor: actionLoadingId === business.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <CalendarClock size={14} />
                  Adjust
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(business)}
                  disabled={actionLoadingId === business.id}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', cursor: actionLoadingId === business.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Power size={14} />
                  {business.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBusiness(business)}
                  disabled={actionLoadingId === business.id}
                  style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger-color)', cursor: actionLoadingId === business.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
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
                        subscriptionEndsAt: 'Subscription Ends At',
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
                        subscriptionEndsAt: 'datetime-local',
                      };

                      if (field === 'name' || field === 'slug' || field === 'serviceCode' || field === 'ownerName' || field === 'ownerEmail' || field === 'ownerPassword' || field === 'subscriptionEndsAt' || field === 'mpesaConsumerKey' || field === 'mpesaConsumerSecret' || field === 'mpesaPasskey' || field === 'mpesaShortcode' || field === 'mpesaBusinessShortcode' || field === 'mpesaPartyB' || field === 'mpesaCallbackUrl' || field === 'tupayUuid' || field === 'tupayApiKey' || field === 'tupaySecret' || field === 'smsProvider' || field === 'smsPartnerId' || field === 'smsApiKey' || field === 'smsSenderId' || field === 'smsAccessKey' || field === 'smsClientId') {
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

      {subscriptionTarget ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1001,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="card glass-card" style={{ width: '100%', maxWidth: 520, backgroundColor: 'var(--bg-sidebar)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Adjust Subscription</h2>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {subscriptionTarget.name}
                </div>
              </div>
              <button onClick={closeSubscriptionAdjuster} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14, marginBottom: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Current expiry</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatSubscription(subscriptionTarget.subscription)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Mode</span>
                <strong style={{ color: subscriptionMode === 'ADD' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {subscriptionMode === 'ADD' ? 'Add time' : 'Debit time'}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSubscriptionAdjust} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Days</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={subscriptionDays}
                    onChange={(e) => setSubscriptionDays(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hours</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={subscriptionHours}
                    onChange={(e) => setSubscriptionHours(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: 10, borderRadius: 8, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSubscriptionMode('ADD')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${subscriptionMode === 'ADD' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    backgroundColor: subscriptionMode === 'ADD' ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriptionMode('DEBIT')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${subscriptionMode === 'DEBIT' ? 'var(--danger-color)' : 'var(--border-color)'}`,
                    backgroundColor: subscriptionMode === 'DEBIT' ? 'rgba(239, 68, 68, 0.14)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Debit
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 10 }}>
                <button
                  type="button"
                  onClick={closeSubscriptionAdjuster}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === subscriptionTarget.id}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', color: '#fff', minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {actionLoadingId === subscriptionTarget.id ? <Loader2 size={16} className="animate-spin" /> : null}
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
