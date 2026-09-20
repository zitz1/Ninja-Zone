"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "../app/globals.css";

type User = {
  id: string;
  phone: string;
  name: string;
  role: "CUSTOMER" | "CASHIER" | "ADMIN";
};

const nav = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/sections", label: "الأقسام", icon: "▦" },
  { href: "/bookings", label: "حجوزاتي", icon: "□" },
  { href: "/menu", label: "المنيو", icon: "☷" },
  { href: "/support", label: "الدعم والمساعدة", icon: "◌" },
  { href: "/account", label: "حسابي", icon: "♙" },
];

export function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) setUser(null);
          return;
        }

        const data = await response.json();
        if (mounted) setUser(data.user ?? null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }

  return (
    <div className="nz-app" dir="rtl">
      <div className="nz-ambient nz-ambient-a" />
      <div className="nz-ambient nz-ambient-b" />
      <div className="nz-noise" />

      {/* SIDEBAR */}
      <aside className="nz-sidebar">
        <Link
          href="/"
          className="nz-sidebar-brand"
          aria-label="Ninja Zone"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 14px 10px",
            textDecoration: "none",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "185px",
              background: "#080911",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
            }}
          >
            <img
              src="/ninja-zone-logo-reference.jpg"
              alt="Ninja Zone Gaming Center"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "155px",
                objectFit: "contain",
                display: "block",
                borderRadius: "10px",
              }}
            />
          </div>
        </Link>

        <nav className="nz-side-nav" aria-label="التنقل الرئيسي">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active(item.href) ? "active" : ""}
            >
              <span className="nz-side-icon">{item.icon}</span>
              <span>{item.label}</span>
              {active(item.href) && <i aria-hidden="true" />}
            </Link>
          ))}
        </nav>

        <Link href="/sections" className="nz-sidebar-book">
          احجز الآن <span>□</span>
        </Link>

        <div className="nz-sidebar-hours">
          <small>ساعات العمل</small>
          <strong>10:00 صباحًا — 3:00 فجرًا</strong>
          <span>
            <i /> متاح جميع أيام الأسبوع
          </span>
        </div>

        <div className="nz-sidebar-social" aria-label="روابط التواصل">
          <span>◉</span>
          <span>◎</span>
          <span>◌</span>
          <span>◍</span>
        </div>
      </aside>

      {/* MAIN */}
      <div className="nz-main">
        <header className="nz-topbar">
          <div className="nz-top-controls">
            <button className="nz-mobile-menu" aria-label="فتح القائمة">
              ☰
            </button>
          </div>

          <label className="nz-search">
            <span>⌕</span>
            <input placeholder="إبحث عن جهاز أو قسم..." aria-label="البحث" />
          </label>

          <div className="nz-top-actions">
            {loadingUser ? (
              <div className="nz-account-top">جاري التحميل...</div>
            ) : user ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Link href="/account" className="nz-account-top">
                  <span>♙</span>
                  <span>{user.name}</span>
                </Link>

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="nz-account-top"
                    style={{ background: "#8d69f2", color: "#fff", border: "none" }}
                  >
                    لوحة الأدمن
                  </Link>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="nz-account-top"
                  style={{
                    border: 0,
                    cursor: "pointer",
                    background: "transparent",
                    color: "#ff5c5c",
                  }}
                >
                  خروج
                </button>
              </div>
            ) : (
              <Link href="/login" className="nz-account-top">
                <span>♙</span>
                تسجيل الدخول
              </Link>
            )}
          </div>
        </header>

        {children}

        <footer className="nz-footer nz-container">
          <div>
            <strong>NINJA ZONE</strong>
            <small>Gaming Center • Ramadi</small>
          </div>

          <div>
            <span>10:00 صباحًا — 3:00 فجرًا</span>
            <span>© {new Date().getFullYear()} Ninja Zone</span>
          </div>
        </footer>
      </div>

      {/* MOBILE NAV */}
      <nav className="nz-bottom-nav" aria-label="تنقل الهاتف">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active(item.href) ? "active" : ""}
          >
            <span>{item.icon}</span>
            <small>
              {item.label === "الدعم والمساعدة" ? "الدعم" : item.label}
            </small>
          </Link>
        ))}
      </nav>
    </div>
  );
}