'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie, setCookie } from 'cookies-next';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { BUSINESS_CONTEXT_COOKIE } from '@/lib/businessContext';

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
  serviceCode?: string | null;
};

type Props = {
  role: string | null;
  currentBusinessId: string | null;
  currentBusinessName: string | null;
  businesses: BusinessOption[];
  onBusinessChange?: (businessId: string | null, businessName?: string | null) => void;
  compact?: boolean;
};

export default function BusinessSwitcher({
  role,
  currentBusinessId,
  currentBusinessName,
  businesses,
  onBusinessChange,
  compact = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === currentBusinessId) ?? null,
    [businesses, currentBusinessId]
  );
  const isSuperAdmin = role === 'SUPERADMIN';

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const currentCookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${BUSINESS_CONTEXT_COOKIE}=`))
      ?.split('=')[1];

    if (currentBusinessId && !currentCookie) {
      setCookie(BUSINESS_CONTEXT_COOKIE, currentBusinessId, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    } else if (!currentBusinessId && currentCookie) {
      deleteCookie(BUSINESS_CONTEXT_COOKIE, { path: '/' });
    }
  }, [currentBusinessId, isSuperAdmin]);

  if (!currentBusinessId && !currentBusinessName && !isSuperAdmin) {
    return null;
  }

  const label = selectedBusiness?.name || currentBusinessName || 'Platform Admin';
  const canSwitch = isSuperAdmin && businesses.length > 0;

  const applyBusiness = (businessId: string) => {
    const nextBusiness = businesses.find((business) => business.id === businessId) ?? null;
    setCookie(BUSINESS_CONTEXT_COOKIE, businessId, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    onBusinessChange?.(businessId, nextBusiness?.name ?? null);
    setOpen(false);
    router.refresh();
  };

  const clearBusiness = () => {
    deleteCookie(BUSINESS_CONTEXT_COOKIE, { path: '/' });
    onBusinessChange?.(null, null);
    setOpen(false);
    router.refresh();
  };

  if (!canSwitch) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 6 : 8,
          padding: compact ? '4px 10px' : '6px 12px',
          backgroundColor: 'var(--bg-hover)',
          borderRadius: compact ? 10 : 8,
          fontSize: compact ? 12 : 13,
          color: 'var(--text-primary)',
          fontWeight: 600,
          border: '1px solid var(--border-color)',
          minWidth: 0,
          width: compact ? '100%' : 'auto',
          justifyContent: compact ? 'space-between' : 'flex-start',
        }}
      >
        <Building2 size={compact ? 13 : 14} color="var(--accent-color)" />
        <span
          style={{
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: compact ? 128 : 'none',
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? 6 : 8,
          padding: compact ? '4px 10px' : '6px 12px',
          backgroundColor: 'var(--bg-hover)',
          borderRadius: 999,
          fontSize: compact ? 12 : 13,
          color: 'var(--text-primary)',
          fontWeight: 600,
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          minWidth: 0,
          width: compact ? '100%' : 'auto',
          justifyContent: compact ? 'space-between' : 'flex-start',
          maxWidth: compact ? '100%' : 'none',
        }}
      >
        <Building2 size={compact ? 13 : 14} color="var(--accent-color)" />
        <span
          style={{
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: compact ? 104 : 'none',
          }}
        >
          {label}
        </span>
        <ChevronDown size={compact ? 13 : 14} color="var(--text-secondary)" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close business picker"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'transparent',
              border: 'none',
              padding: 0,
              zIndex: 998,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: compact ? 246 : 280,
              backgroundColor: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: 14,
              boxShadow: '0 16px 32px rgba(0,0,0,0.35)',
              zIndex: 999,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-secondary)', fontWeight: 700 }}>
                Switch Business
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                View each tenant as its own account.
              </div>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', padding: 6 }}>
              <button
                type="button"
                onClick={clearBusiness}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: !currentBusinessId ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Platform Admin
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    All businesses overview
                  </div>
                </div>
                {!currentBusinessId ? <Check size={14} color="var(--accent-color)" /> : null}
              </button>

              {businesses.map((business) => {
                const active = business.id === currentBusinessId;

                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => applyBusiness(business.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {business.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {business.serviceCode || business.slug}
                      </div>
                    </div>
                    {active ? <Check size={14} color="var(--accent-color)" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
