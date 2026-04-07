import Link from "next/link";
import SmsBalanceBadge from "@/components/SmsBalanceBadge";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">₪ AirPulse</div>
        
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
             {/* Search removed as requested */}
          </div>
          <div className="header-right" style={{ gap: '20px' }}>
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
