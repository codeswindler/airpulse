'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import UssdSimulator from '@/components/UssdSimulator';
import { ArrowRight, Copy, Globe, Link2, Mail, MessageSquareText, ShieldCheck, Smartphone } from 'lucide-react';

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

type SharedSettings = {
  sharedCallbacks?: {
    mpesaCallbackUrl: string;
    tupayWebhookUrl: string;
    ussdEndpointUrl: string;
  };
  platformSms?: {
    sms_provider: string;
    sms_threshold: string;
    advanta_partner_id: string;
    advanta_api_key: string;
    advanta_sender_id: string;
    onfon_access_key: string;
    onfon_api_key: string;
    onfon_client_id: string;
    onfon_sender_id: string;
  };
  platformEmail?: {
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: string;
    smtp_from_email: string;
    smtp_from_name: string;
    smtp_enabled: string;
    email_threshold: string;
  };
  note?: string;
};

type SettingsForm = {
  sms_provider: string;
  sms_threshold: string;
  advanta_partner_id: string;
  advanta_api_key: string;
  advanta_sender_id: string;
  onfon_access_key: string;
  onfon_api_key: string;
  onfon_client_id: string;
  onfon_sender_id: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: string;
  email_threshold: string;
};

const DEFAULT_FORM: SettingsForm = {
  sms_provider: 'advanta',
  sms_threshold: '500',
  advanta_partner_id: '',
  advanta_api_key: '',
  advanta_sender_id: '',
  onfon_access_key: '',
  onfon_api_key: '',
  onfon_client_id: '',
  onfon_sender_id: '',
  smtp_host: '',
  smtp_port: '',
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: 'tls',
  smtp_from_email: '',
  smtp_from_name: '',
  smtp_enabled: 'true',
  email_threshold: '0',
};

const cardFieldStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  padding: '12px 14px',
  outline: 'none',
};

const topBadgeStyle: CSSProperties = {
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
};

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function mergeForm(settings: SharedSettings | null): SettingsForm {
  return {
    ...DEFAULT_FORM,
    sms_provider: normalizeString(settings?.platformSms?.sms_provider, DEFAULT_FORM.sms_provider),
    sms_threshold: normalizeString(settings?.platformSms?.sms_threshold, DEFAULT_FORM.sms_threshold),
    advanta_partner_id: normalizeString(settings?.platformSms?.advanta_partner_id),
    advanta_api_key: normalizeString(settings?.platformSms?.advanta_api_key),
    advanta_sender_id: normalizeString(settings?.platformSms?.advanta_sender_id),
    onfon_access_key: normalizeString(settings?.platformSms?.onfon_access_key),
    onfon_api_key: normalizeString(settings?.platformSms?.onfon_api_key),
    onfon_client_id: normalizeString(settings?.platformSms?.onfon_client_id),
    onfon_sender_id: normalizeString(settings?.platformSms?.onfon_sender_id),
    smtp_host: normalizeString(settings?.platformEmail?.smtp_host),
    smtp_port: normalizeString(settings?.platformEmail?.smtp_port),
    smtp_user: normalizeString(settings?.platformEmail?.smtp_user),
    smtp_pass: normalizeString(settings?.platformEmail?.smtp_pass),
    smtp_secure: normalizeString(settings?.platformEmail?.smtp_secure, DEFAULT_FORM.smtp_secure),
    smtp_from_email: normalizeString(settings?.platformEmail?.smtp_from_email),
    smtp_from_name: normalizeString(settings?.platformEmail?.smtp_from_name),
    smtp_enabled: normalizeString(settings?.platformEmail?.smtp_enabled, DEFAULT_FORM.smtp_enabled),
    email_threshold: normalizeString(settings?.platformEmail?.email_threshold, DEFAULT_FORM.email_threshold),
  };
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {label}
      </label>
      {children}
      {help ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {help}
        </div>
      ) : null}
    </div>
  );
}

export default function PlatformSettingsPanel() {
  const [activeTab, setActiveTab] = useState<'CALLBACKS' | 'SMS' | 'EMAIL' | 'SIMULATOR'>('CALLBACKS');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string | null>(null);
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, settingsRes] = await Promise.all([
          fetch('/api/admin/me', { cache: 'no-store' }),
          fetch('/api/admin/settings', { cache: 'no-store' }),
        ]);

        const meData: MeRecord | null = meRes.ok ? await meRes.json() : null;
        const settingsData: SharedSettings | null = settingsRes.ok ? await settingsRes.json() : null;

        setRole(meData?.role || null);
        setSelectedBusinessName(meData?.selectedBusiness?.name || meData?.business?.name || null);
        setSharedSettings(settingsData);
        setForm(mergeForm(settingsData));
      } catch (err) {
        console.error('Failed to load shared callback data', err);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const isSuperAdmin = role === 'SUPERADMIN';
  const callbackRows = [
    {
      label: 'M-Pesa callback',
      value: sharedSettings?.sharedCallbacks?.mpesaCallbackUrl || '',
      description: 'Safaricom uses this to post STK verification updates.',
    },
    {
      label: 'Tupay webhook',
      value: sharedSettings?.sharedCallbacks?.tupayWebhookUrl || '',
      description: 'Tupay posts airtime delivery status here.',
    },
    {
      label: 'USSD endpoint',
      value: sharedSettings?.sharedCallbacks?.ussdEndpointUrl || '',
      description: 'The USSD gateway hits this shared menu endpoint.',
    },
  ];

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel(label);
      window.setTimeout(() => setCopyLabel((current) => (current === label ? null : current)), 1500);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  const updateForm = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const savePlatformSettings = async () => {
    if (!isSuperAdmin || saving) {
      return;
    }

    setSaving(true);
    setSaveFeedback(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save platform settings');
      }

      setSaveFeedback({
        tone: 'success',
        message: 'Platform SMS and email settings saved.',
      });
      window.dispatchEvent(new Event('settings-updated'));
    } catch (error) {
      setSaveFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Failed to save platform settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading shared callbacks...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="dashboard-scroll">
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Shared callbacks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configuration is reserved for superadmins. Business-specific credentials live inside each business account.
          </p>
        </div>
      </div>
    );
  }

  const showSaveButton = activeTab === 'SMS' || activeTab === 'EMAIL';

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Shared Callbacks</h1>
          <p>Shared endpoints, platform SMS, and platform email for all tenants.</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={topBadgeStyle}>
            <ShieldCheck size={14} color="var(--success-color)" />
            <span>Shared across all tenants</span>
          </div>
          {selectedBusinessName ? (
            <div style={topBadgeStyle}>
              <Globe size={14} color="var(--accent-color)" />
              <span>{selectedBusinessName}</span>
            </div>
          ) : null}
          {showSaveButton ? (
            <button
              type="button"
              onClick={() => void savePlatformSettings()}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.8 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save platform settings'}
            </button>
          ) : null}
        </div>
      </div>

      {saveFeedback ? (
        <div
          style={{
            marginTop: 12,
            marginBottom: 8,
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${saveFeedback.tone === 'success' ? 'rgba(34, 197, 94, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
            background: saveFeedback.tone === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            color: saveFeedback.tone === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {saveFeedback.message}
        </div>
      ) : null}

      <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        These URLs stay the same when you switch business filters. Tenant credentials live under each business account.
      </div>

      <div className="settings-tabs" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-color)', marginTop: 24, marginBottom: 32, overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveTab('CALLBACKS')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'CALLBACKS' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'CALLBACKS' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: 14,
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          }}
        >
          <Link2 size={14} />
          Shared callbacks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SMS')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'SMS' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'SMS' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: 14,
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          }}
        >
          <MessageSquareText size={14} />
          Platform SMS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EMAIL')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'EMAIL' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'EMAIL' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: 14,
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          }}
        >
          <Mail size={14} />
          Platform Email
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SIMULATOR')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'SIMULATOR' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'SIMULATOR' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: 14,
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          }}
        >
          <Smartphone size={14} />
          Menu Simulator (iPhone)
        </button>
      </div>

      {activeTab === 'CALLBACKS' ? (
        <div className="settings-grid" style={{ display: 'grid', gap: 24 }}>
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            {callbackRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 180px) 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{row.description}</div>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.value || 'Not available'}
                </div>
                <button
                  type="button"
                  disabled={!row.value}
                  onClick={() => (row.value ? void copyToClipboard(row.label, row.value) : undefined)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-hover)',
                    color: row.value ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: row.value ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Copy size={14} />
                  {copyLabel === row.label ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                Shared callbacks are derived from the platform URL and apply to every tenant. Business credentials and USSD codes are managed in the business profile.
              </div>
              <Link href="/businesses" style={{ color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Open businesses
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {sharedSettings?.note ? (
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <ShieldCheck size={18} color="var(--success-color)" />
              <span>{sharedSettings.note}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'SMS' ? (
        <div className="settings-grid" style={{ display: 'grid', gap: 24 }}>
          <div className="card" style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="card-title" style={{ color: 'var(--text-primary)', marginBottom: 4 }}>Platform SMS</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  These credentials drive admin OTPs, password alerts, and expiry reminders across every business.
                </div>
              </div>
              <div style={topBadgeStyle}>
                <MessageSquareText size={14} color="var(--accent-color)" />
                <span>{form.sms_provider || 'sms'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="SMS Provider" help="Choose the gateway you use for platform-wide alerts.">
                <select
                  value={form.sms_provider}
                  onChange={(event) => updateForm('sms_provider', event.target.value)}
                  style={cardFieldStyle}
                >
                  <option value="advanta">Advanta</option>
                  <option value="onfon">Onfon</option>
                </select>
              </Field>

              <Field label="SMS Threshold" help="Warn the admin when platform SMS units fall below this value.">
                <input
                  type="number"
                  value={form.sms_threshold}
                  onChange={(event) => updateForm('sms_threshold', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="500"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="Advanta Partner ID">
                <input
                  type="text"
                  value={form.advanta_partner_id}
                  onChange={(event) => updateForm('advanta_partner_id', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="Partner ID"
                />
              </Field>
              <Field label="Advanta API Key">
                <input
                  type="password"
                  value={form.advanta_api_key}
                  onChange={(event) => updateForm('advanta_api_key', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="API key"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="Advanta Sender ID">
                <input
                  type="text"
                  value={form.advanta_sender_id}
                  onChange={(event) => updateForm('advanta_sender_id', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="Sender ID"
                />
              </Field>
              <Field label="Onfon Access Key">
                <input
                  type="password"
                  value={form.onfon_access_key}
                  onChange={(event) => updateForm('onfon_access_key', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="Access key"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="Onfon API Key">
                <input
                  type="password"
                  value={form.onfon_api_key}
                  onChange={(event) => updateForm('onfon_api_key', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="API key"
                />
              </Field>
              <Field label="Onfon Client ID">
                <input
                  type="text"
                  value={form.onfon_client_id}
                  onChange={(event) => updateForm('onfon_client_id', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="Client ID"
                />
              </Field>
            </div>

            <Field label="Onfon Sender ID">
              <input
                type="text"
                value={form.onfon_sender_id}
                onChange={(event) => updateForm('onfon_sender_id', event.target.value)}
                style={cardFieldStyle}
                placeholder="Sender ID"
              />
            </Field>
          </div>

          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} color="var(--accent-color)" />
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>SMS usage</div>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              The badge in the top bar reads from the active business when one is selected, or from the global admin account when no business is selected.
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'EMAIL' ? (
        <div className="settings-grid" style={{ display: 'grid', gap: 24 }}>
          <div className="card" style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="card-title" style={{ color: 'var(--text-primary)', marginBottom: 4 }}>Platform Email</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Use these SMTP credentials for admin OTPs, internal notices, and business alerts.
                </div>
              </div>
              <div style={topBadgeStyle}>
                <Mail size={14} color="var(--accent-color)" />
                <span>{form.smtp_enabled === 'true' ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="SMTP Host">
                <input
                  type="text"
                  value={form.smtp_host}
                  onChange={(event) => updateForm('smtp_host', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="smtp.godaddy.com"
                />
              </Field>
              <Field label="SMTP Port">
                <input
                  type="number"
                  value={form.smtp_port}
                  onChange={(event) => updateForm('smtp_port', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="587"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="SMTP User">
                <input
                  type="text"
                  value={form.smtp_user}
                  onChange={(event) => updateForm('smtp_user', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="no-reply@yourdomain.com"
                />
              </Field>
              <Field label="SMTP Password">
                <input
                  type="password"
                  value={form.smtp_pass}
                  onChange={(event) => updateForm('smtp_pass', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="Password"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="From Email">
                <input
                  type="email"
                  value={form.smtp_from_email}
                  onChange={(event) => updateForm('smtp_from_email', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="alerts@yourdomain.com"
                />
              </Field>
              <Field label="From Name">
                <input
                  type="text"
                  value={form.smtp_from_name}
                  onChange={(event) => updateForm('smtp_from_name', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="AirPulse"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="SMTP Secure">
                <select
                  value={form.smtp_secure}
                  onChange={(event) => updateForm('smtp_secure', event.target.value)}
                  style={cardFieldStyle}
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="off">Off</option>
                </select>
              </Field>
              <Field label="Email Threshold" help="Used as the warning level for outbound email usage.">
                <input
                  type="number"
                  value={form.email_threshold}
                  onChange={(event) => updateForm('email_threshold', event.target.value)}
                  style={cardFieldStyle}
                  placeholder="0"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="Enable SMTP">
                <select
                  value={form.smtp_enabled}
                  onChange={(event) => updateForm('smtp_enabled', event.target.value)}
                  style={cardFieldStyle}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} color="var(--accent-color)" />
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Email alerts</div>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              Borrow the same SMTP pattern we used in LeaseMaster: a host, port, user, password, from address, from name, and an enable switch.
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'SIMULATOR' ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <UssdSimulator />
        </div>
      ) : null}
    </div>
  );
}
