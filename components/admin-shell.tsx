"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../app/globals.css";

type User = {
  id: string;
  name: string;
  role: "ADMIN" | "CASHIER" | "CUSTOMER";
};

const NAV_ITEMS = [
  { href: "/admin", label: "لوحة الإدارة", icon: "◈", exact: true },
  { href: "/admin/services", label: "الأقسام", icon: "▦" },
  { href: "/admin/menu-items", label: "إدارة المنيو", icon: "☷" },
  { href: "/admin/resources", label: "الأجهزة", icon: "◉" },
  { href: "/admin/customers", label: "العملاء", icon: "👥" },
  { href: "/admin/staff", label: "الموظفون", icon: "♙" },
  { href: "/admin/pricing", label: "الأسعار", icon: "₿" },
  { href: "/admin/logs", label: "سجل النشاطات", icon: "📋" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  // التحقق من صلاحيات الأدمن
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        const currentUser: User = data.user;

        // منع الكاشير أو الزبون من دخول لوحة الأدمن
        if (currentUser.role !== "ADMIN") {
          if (currentUser.role === "CASHIER") {
            router.push("/cashier");
          } else {
            router.push("/");
          }
          return;
        }

        setUser(currentUser);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#08090d",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  return (
    <div className="adminApp" dir="rtl">
      <aside className={`adminSidebar ${mobileOpen ? "open" : ""}`}>
        <Link href="/admin" className="adminBrand">
          <span className="adminBrandMark">NZ</span>
          <div>
            <strong>Ninja Zone</strong>
            <small>Admin Panel</small>
          </div>
        </Link>

        <nav className="adminNav" aria-label="قائمة الإدارة">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href, item.exact) ? "active" : ""}
              onClick={() => setMobileOpen(false)}
            >
              <span className="adminNavIcon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="adminSidebarFooter">
          <Link href="/" className="adminHomeLink">
            ← الواجهة الرئيسية
          </Link>
          <button onClick={handleLogout} className="adminLogoutBtn">
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="adminBackdrop" onClick={() => setMobileOpen(false)} />
      )}

      <div className="adminMain">
        <header className="adminTopbar">
          <button
            type="button"
            className="adminMobileToggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="فتح القائمة"
          >
            ☰
          </button>

          <div className="adminTopBarInfo">
            <span>مرحباً، <strong>{user?.name || "الأدمن"}</strong></span>
          </div>

          <div className="adminTopBarActions">
            <Link href="/" className="btnSecondary">
              الواجهة الرئيسية
            </Link>
            <Link href="/cashier" className="btnSecondary">
              لوحة الكاشير
            </Link>
          </div>
        </header>

        <div className="adminContent">{children}</div>
      </div>

      <style jsx global>{`
        .adminApp {
          min-height: 100vh;
          display: flex;
          background: #08090d;
          color: #f5f7fb;
          font-family: inherit;
        }

        .adminSidebar {
          width: 260px;
          min-height: 100vh;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: #0d0f13;
          border-left: 1px solid #1e232b;
          z-index: 60;
          transition: transform 0.25s ease;
        }

        .adminBrand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #fff;
          padding: 8px;
        }

        .adminBrandMark {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #8d69f2, #5b3dc4);
          color: #fff;
          font-weight: 900;
          font-size: 14px;
        }

        .adminBrand strong {
          display: block;
          font-size: 14px;
        }

        .adminBrand small {
          color: #636d7d;
          font-size: 10px;
          letter-spacing: 0.05em;
        }

        .adminNav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .adminNav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 12px;
          color: #8f98a6;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .adminNav a:hover {
          color: #fff;
          background: #14171f;
        }

        .adminNav a.active {
          color: #fff;
          background: rgba(141, 105, 242, 0.15);
          border: 1px solid rgba(141, 105, 242, 0.3);
        }

        .adminNavIcon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #161922;
          font-size: 12px;
        }

        .adminNav a.active .adminNavIcon {
          background: #8d69f2;
          color: #fff;
        }

        .adminSidebarFooter {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #1a1f26;
        }

        .adminHomeLink {
          padding: 10px 12px;
          border-radius: 10px;
          color: #8f98a6;
          text-decoration: none;
          font-size: 12px;
          transition: 0.2s ease;
        }

        .adminHomeLink:hover {
          color: #fff;
          background: #14171f;
        }

        .adminLogoutBtn {
          padding: 10px 12px;
          border-radius: 10px;
          color: #ff5c5c;
          background: transparent;
          border: 1px solid rgba(255, 92, 92, 0.2);
          font-size: 12px;
          cursor: pointer;
          text-align: right;
          transition: 0.2s ease;
        }

        .adminLogoutBtn:hover {
          background: rgba(255, 92, 92, 0.1);
        }

        .adminMain {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .adminTopbar {
          height: 64px;
          padding: 0 32px;
          border-bottom: 1px solid #1e232b;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0d0f13;
        }

        .adminTopBarInfo {
          font-size: 14px;
          color: #a0a7b5;
        }

        .adminTopBarInfo strong {
          color: #fff;
        }

        .adminTopBarActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btnSecondary {
          padding: 8px 14px;
          border-radius: 10px;
          background: #161922;
          border: 1px solid #282e3a;
          color: #d1d5db;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
          transition: 0.2s ease;
        }

        .btnSecondary:hover {
          color: #fff;
          border-color: #8d69f2;
        }

        .adminContent {
          padding: 32px;
          flex: 1;
        }

        .adminMobileToggle {
          display: none;
        }

        @media (max-width: 900px) {
          .adminSidebar {
            position: fixed;
            inset-block-start: 0;
            inset-inline-start: 0;
            transform: translateX(-100%);
          }

          .adminSidebar.open {
            transform: translateX(0);
          }

          .adminTopbar {
            padding: 0 16px;
          }

          .adminMobileToggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #161922;
            border: 1px solid #282e3a;
            color: #fff;
          }
        }
      `}</style>
    </div>
  );
}