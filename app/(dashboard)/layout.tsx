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
    <div className="app-container" style={{ overflow: 'hidden' }}>
      {/* Background Decorative Elements */}
      <div style={{ position: 'fixed', top: '10%', left: '15%', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', filter: 'blur(80px)', zIndex: -1 }}></div>
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: '400px', height: '400px', background: 'rgba(29, 78, 216, 0.12)', borderRadius: '50%', filter: 'blur(100px)', zIndex: -1 }}></div>
      <div style={{ position: 'fixed', top: '40%', right: '25%', width: '250px', height: '250px', background: 'rgba(30, 58, 138, 0.1)', borderRadius: '50%', filter: 'blur(70px)', zIndex: -1 }}></div>

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
