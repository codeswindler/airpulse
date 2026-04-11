"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import SmsBalanceBadge from "@/components/SmsBalanceBadge";
import BusinessSwitcher from "@/components/BusinessSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";
import { BUSINESS_CONTEXT_COOKIE } from "@/lib/businessContext";

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
  serviceCode?: string | null;
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminPhoneNumber, setAdminPhoneNumber] = useState<string | null>(null);
  const [adminBusinessId, setAdminBusinessId] = useState<string | null>(null);
  const [adminBusinessName, setAdminBusinessName] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const fetchAdminMeta = async () => {
      try {
        const [meResponse, businessesResponse] = await Promise.all([
          fetch('/api/admin/me', { cache: 'no-store' }),
          fetch('/api/admin/businesses', { cache: 'no-store' }),
        ]);

        if (!meResponse.ok) {
          return;
        }

        const meData = await meResponse.json();
        const businessData = businessesResponse.ok ? await businessesResponse.json() : { businesses: [] };

        const nextBusinesses = Array.isArray(businessData.businesses) ? businessData.businesses : [];
        const cookieBusinessId = getCookie(BUSINESS_CONTEXT_COOKIE);
        const isSuperAdmin = meData.role === 'SUPERADMIN';
        const cookieCandidate = typeof cookieBusinessId === 'string' && cookieBusinessId.trim()
          ? cookieBusinessId.trim()
          : null;
        const cookieMatchesTenant = cookieCandidate
          ? nextBusinesses.some((business: BusinessOption) => business.id === cookieCandidate)
          : false;
        const resolvedBusinessId = isSuperAdmin
          ? (cookieMatchesTenant
            ? cookieCandidate
            : meData.businessId || null)
          : (meData.businessId || nextBusinesses[0]?.id || null);

        if (active) {
          setAdminRole(meData.role || null);
          setAdminName(meData.name || null);
          setAdminEmail(meData.email || null);
          setAdminPhoneNumber(meData.phoneNumber || null);
          setAdminBusinessId(resolvedBusinessId);
          setAdminBusinessName(
            nextBusinesses.find((business: BusinessOption) => business.id === resolvedBusinessId)?.name
              || meData.business?.name
              || null
          );
          setBusinesses(nextBusinesses);
        }

        const shouldRefresh = isSuperAdmin && (cookieCandidate !== resolvedBusinessId);

        if (resolvedBusinessId) {
          setCookie(BUSINESS_CONTEXT_COOKIE, resolvedBusinessId, {
            path: '/',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
          });
        } else if (isSuperAdmin && cookieCandidate) {
          deleteCookie(BUSINESS_CONTEXT_COOKIE, { path: '/' });
        }

        if (shouldRefresh) {
          router.refresh();
        }
      } catch (error) {
        console.warn('[LAYOUT] Failed to load admin metadata', error);
      }
    };

    void fetchAdminMeta();

    return () => {
      active = false;
    };
  }, []);

  const handleBusinessChange = (businessId: string | null, businessName?: string | null) => {
    setAdminBusinessId(businessId);
    setAdminBusinessName(
      businessName
      || businesses.find((business) => business.id === businessId)?.name
      || null
    );
  };

  const handleProfileUpdated = (updated: { name?: string | null; email?: string | null; phoneNumber?: string | null; role?: string | null }) => {
    if (typeof updated.name !== 'undefined') {
      setAdminName(updated.name || null);
    }

    if (typeof updated.email !== 'undefined') {
      setAdminEmail(updated.email || null);
    }

    if (typeof updated.phoneNumber !== 'undefined') {
      setAdminPhoneNumber(updated.phoneNumber || null);
    }

    if (typeof updated.role !== 'undefined') {
      setAdminRole(updated.role || null);
    }
  };

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="app-container">
      {/* Background Decorative Elements */}
      <div style={{ position: 'fixed', top: '10%', left: '15%', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', filter: 'blur(80px)', zIndex: -1 }}></div>
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: '400px', height: '400px', background: 'rgba(29, 78, 216, 0.12)', borderRadius: '50%', filter: 'blur(100px)', zIndex: -1 }}></div>
      <div style={{ position: 'fixed', top: '40%', right: '25%', width: '250px', height: '250px', background: 'rgba(30, 58, 138, 0.1)', borderRadius: '50%', filter: 'blur(70px)', zIndex: -1 }}></div>

      {mobileMenuOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside className={`sidebar${mobileMenuOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-logo">₪ AirPulse</div>
        
        <div className="sidebar-mobile-header">
          <div className="sidebar-logo">AirPulse</div>
          <button
            type="button"
            className="sidebar-close-button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <ul className="sidebar-menu">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <li className="sidebar-item">
              <span>Overview</span>
            </li>
          </Link>
          <Link href="/transactions" style={{ textDecoration: 'none' }}>
            <li className="sidebar-item">
              <span>Transactions</span>
            </li>
          </Link>
          
          <div className="sidebar-section">MANAGEMENT</div>
          <Link href="/customers-wallets" style={{ textDecoration: 'none' }}>
            <li className="sidebar-item">
              <span>Customers & Wallets</span>
            </li>
          </Link>
          {adminRole === 'SUPERADMIN' ? (
            <Link href="/businesses" style={{ textDecoration: 'none' }}>
              <li className="sidebar-item">
                <span>Businesses</span>
              </li>
            </Link>
          ) : null}

          <div className="sidebar-section">SYSTEM</div>
          <Link href="/system-users" style={{ textDecoration: 'none' }}>
            <li className="sidebar-item">
              <span>Users (Access)</span>
            </li>
          </Link>
          {adminRole === 'SUPERADMIN' && !adminBusinessId ? (
            <Link href="/settings" style={{ textDecoration: 'none' }}>
              <li className="sidebar-item">
                <span>Shared Callbacks</span>
              </li>
            </Link>
          ) : null}
        </ul>
      </aside>
      
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="mobile-header-brand">AirPulse</span>
          </div>
          <div className="header-right">
            <BusinessSwitcher
              role={adminRole}
              currentBusinessId={adminBusinessId}
              currentBusinessName={adminBusinessName}
              businesses={businesses}
              onBusinessChange={handleBusinessChange}
            />
            <SmsBalanceBadge businessId={adminBusinessId} />
            <div className="badge-date">Apr 05</div>
            <ThemeToggle />
            <ProfileDropdown
              adminName={adminName}
              adminEmail={adminEmail}
              adminPhoneNumber={adminPhoneNumber}
              adminRole={adminRole}
              onProfileUpdated={handleProfileUpdated}
            />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
