"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import SmsBalanceBadge from "@/components/SmsBalanceBadge";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const fetchAdminRole = async () => {
      try {
        const response = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (active) {
          setAdminRole(data.role || null);
        }
      } catch (error) {
        console.warn('[LAYOUT] Failed to load admin role', error);
      }
    };

    void fetchAdminRole();

    return () => {
      active = false;
    };
  }, []);

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
          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <li className="sidebar-item">
              <span>Configurations</span>
            </li>
          </Link>
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
            <SmsBalanceBadge />
            <div className="badge-date">Apr 05</div>
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
