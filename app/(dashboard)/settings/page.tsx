'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import UssdSimulator from '@/components/UssdSimulator';
import { ArrowRight, Copy, Globe, Link2, ShieldCheck, Smartphone } from 'lucide-react';

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
  note?: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'CALLBACKS' | 'SIMULATOR'>('CALLBACKS');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string | null>(null);
  const [sharedSettings, setSharedSettings] = useState<SharedSettings | null>(null);
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
      } catch (err) {
        console.error('Failed to load shared callback data', err);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const isSuperAdmin = role === 'SUPERADMIN';

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel(label);
      window.setTimeout(() => setCopyLabel((current) => (current === label ? null : current)), 1500);
    } catch (error) {
      console.error('Copy failed', error);
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

  const sharedCallbacks = sharedSettings?.sharedCallbacks;
  const callbackRows = [
    {
      label: 'M-Pesa callback',
      value: sharedCallbacks?.mpesaCallbackUrl || '',
      description: 'Safaricom uses this to post STK verification updates.',
    },
    {
      label: 'Tupay webhook',
      value: sharedCallbacks?.tupayWebhookUrl || '',
      description: 'Tupay posts airtime delivery status here.',
    },
    {
      label: 'USSD endpoint',
      value: sharedCallbacks?.ussdEndpointUrl || '',
      description: 'The USSD gateway hits this shared menu endpoint.',
    },
  ];

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-header">
        <div>
          <h1>Shared Callbacks</h1>
          <p>Universal endpoints that stay the same across every business account.</p>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <ShieldCheck size={14} color="var(--success-color)" />
            <span>Shared across all tenants</span>
          </div>
          {selectedBusinessName ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                backgroundColor: 'var(--bg-hover)',
                borderRadius: 999,
                fontSize: 13,
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Globe size={14} color="var(--accent-color)" />
              <span>{selectedBusinessName}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
        These URLs do not change when you switch business filters. Tenant-specific credentials live under the business account itself.
      </div>

      <div className="settings-tabs" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border-color)', marginTop: '24px', marginBottom: '32px' }}>
        <div
          onClick={() => setActiveTab('CALLBACKS')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'CALLBACKS' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'CALLBACKS' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '14px',
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link2 size={14} />
          Shared callbacks
        </div>
        <div
          onClick={() => setActiveTab('SIMULATOR')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            color: activeTab === 'SIMULATOR' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'SIMULATOR' ? '2px solid var(--accent-color)' : '2px solid transparent',
            fontWeight: 600,
            fontSize: '14px',
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Smartphone size={14} />
          Menu Simulator (iPhone)
        </div>
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
                  onClick={() => row.value ? void copyToClipboard(row.label, row.value) : undefined}
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
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <UssdSimulator />
        </div>
      )}
    </div>
  );
}
