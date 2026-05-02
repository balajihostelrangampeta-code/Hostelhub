import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Home, CreditCard } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/rooms", label: "Rooms", icon: Home },
  { href: "/payments", label: "Payments", icon: CreditCard },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" || location === "/dashboard" : location.startsWith(href);

  return (
    <div className="layout-root">
      {/* Desktop sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">HostelHub</h1>
          <p className="sidebar-sub">Operations Hub</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`sidebar-link ${isActive(item.href) ? "sidebar-link--active" : ""}`}>
                <item.icon className="nav-icon" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="main-wrapper">
        {/* Mobile top header */}
        <header className="mobile-header">
          <h1 className="mobile-title">HostelHub</h1>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-tabs" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`tab-item ${isActive(item.href) ? "tab-item--active" : ""}`}>
              <item.icon className="tab-icon" />
              <span className="tab-label">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
