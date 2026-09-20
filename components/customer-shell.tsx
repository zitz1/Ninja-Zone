"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// دالة إصدار رنين قوي للكاشير (جرس ثنائي ناعم وواضح)
function triggerBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(659.25, now, 0.2); // E5
    playTone(880, now + 0.15, 0.35); // A5
  } catch {
    // تجاهل القيود
  }
}

export function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // حالة مراقبة الطلبات الجديدة والتنبيه الصوتي
  const [pendingCount, setPendingCount] = useState(0);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const prevCountRef = useRef<number | null>(null);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // تحميل بيانات المستخدم الحالية
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

  // فحص الطلبات الجديدة كل 4 ثوانٍ (إذا كان المستخدم كاشير أو أدمن)
  useEffect(() => {
    let mounted = true;

    async function checkPendingOrders() {
      if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
        return;
      }

      try {
        const res = await fetch(`/api/menu/orders?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data.orders)) {
          const count = data.orders.filter(
            (o: { status: string }) => o.status === "PENDING"
          ).length;

          // إذا زاد عدد الطلبات الجديدة، نطلق الصوت
          if (prevCountRef.current !== null && count > prevCountRef.current) {
            triggerBeep();
          }
          prevCountRef.current = count;
          setPendingCount(count);
        }
      } catch {
        //
      }
    }

    if (user && (user.role === "CASHIER" || user.role === "ADMIN")) {
      checkPendingOrders();
      const interval = setInterval(checkPendingOrders, 4000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  // تفعيل إذن الصوت بنقرة واحدة
  function enableSound() {
    setSoundUnlocked(true);
    triggerBeep(); // تجربة الصوت فوراً للتأكيد
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }

  const isStaff = user?.role === "CASHIER" || user?.role === "ADMIN";

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
        {/* شريط الإشعار البارز في الواجهة الرئيسية للكاشير والإدارة */}
        {isStaff && pendingCount > 0 && (
          <div className="nz-staff-alert-banner">
            <div className="nz-alert-content">
              <span className="nz-alert-bell">🔔</span>
              <div>
                <strong>
                  تنبيه الكاشير: يوجد {pendingCount} طلبات جديدة بانتظار التحضير!
                </strong>
                <p>اضغط للذهاب لصفحة الطلبات وبدء العمل عليها فوراً.</p>
              </div>
            </div>

            <div className="nz-alert-actions">
              {!soundUnlocked && (
                <button
                  type="button"
                  onClick={enableSound}
                  className="nz-sound-btn"
                  title="اضغط هنا لتفعيل رنين التنبيه التلقائي"
                >
                  🔊 تفعيل الرنين
                </button>
              )}

              <Link href="/cashier/orders" className="nz-goto-orders-btn">
                معاينة الطلبات ←
              </Link>
            </div>
          </div>
        )}

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

                {user.role === "CASHIER" && (
                  <Link
                    href="/cashier"
                    className="nz-account-top"
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      fontWeight: 800,
                    }}
                  >
                    لوحة الكاشير
                  </Link>
                )}

                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="nz-account-top"
                    style={{
                      background: "#8d69f2",
                      color: "#fff",
                      border: "none",
                      fontWeight: 800,
                    }}
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

      <style jsx>{`
        .nz-staff-alert-banner {
          margin: 14px 20px 0;
          padding: 12px 18px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.45);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.18);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          z-index: 100;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .nz-alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nz-alert-bell {
          font-size: 22px;
          animation: swing 1s infinite alternate ease-in-out;
        }

        @keyframes swing {
          from { transform: rotate(-15deg); }
          to { transform: rotate(15deg); }
        }

        .nz-alert-content strong {
          color: #fca5a5;
          font-size: 13px;
          display: block;
        }

        .nz-alert-content p {
          margin: 2px 0 0;
          color: #e2e8f0;
          font-size: 11px;
        }

        .nz-alert-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .nz-sound-btn {
          appearance: none;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .nz-sound-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .nz-goto-orders-btn {
          padding: 7px 16px;
          border-radius: 8px;
          background: #ef4444;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nz-goto-orders-btn:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        @media (max-width: 650px) {
          .nz-staff-alert-banner {
            flex-direction: column;
            align-items: flex-start;
            margin: 10px 12px 0;
            padding: 12px;
            gap: 10px;
          }

          .nz-alert-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .nz-goto-orders-btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}