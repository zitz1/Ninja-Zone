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

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
};

type CustomerBooking = {
  id: string;
  bookingNumber?: string;
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
};

const nav = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/sections", label: "الأقسام", icon: "▦" },
  { href: "/bookings", label: "حجوزاتي", icon: "□" },
  { href: "/menu", label: "المنيو", icon: "☷" },
  { href: "/support", label: "الدعم والمساعدة", icon: "◌" },
  { href: "/account", label: "حسابي", icon: "♙" },
];

function playToneNotification(freq1 = 659.25, freq2 = 880) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    play(freq1, now, 0.2);
    play(freq2, now + 0.15, 0.35);
  } catch {
    //
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

  // إحصائيات الكاشير
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const prevCashierTotalRef = useRef<number | null>(null);

  // تتبع الزبون لطلباته وحجوزاته
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<CustomerOrder | null>(null);
  const [activeCustomerBooking, setActiveCustomerBooking] = useState<CustomerBooking | null>(null);
  const prevCustomerStatusRef = useRef<string>("");

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // 1. تحميل المستخدم
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
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

  // 2. مراقبة للكاشير (فحص الطلبات والحجوزات المعلقة معاً)
  useEffect(() => {
    let mounted = true;

    async function checkCashierPending() {
      if (!user || (user.role !== "CASHIER" && user.role !== "ADMIN")) {
        return;
      }

      try {
        const [ordersRes, bookingsRes] = await Promise.all([
          fetch(`/api/menu/orders?t=${Date.now()}`, { cache: "no-store" }).catch(() => null),
          // فحص الحجوزات مع استعلام يشمل كل الأيام المعلقة
          fetch(`/api/cashier/bookings?pendingOnly=true&t=${Date.now()}`, { cache: "no-store" })
        ]);

        let ordersCount = 0;
        let bookingsCount = 0;

        if (ordersRes && ordersRes.ok) {
          const oData = await ordersRes.json();
          if (Array.isArray(oData.orders)) {
            ordersCount = oData.orders.filter((o: { status: string }) => o.status === "PENDING").length;
          }
        }

        if (bookingsRes && bookingsRes.ok) {
          const bData = await bookingsRes.json();
          if (Array.isArray(bData.bookings)) {
            bookingsCount = bData.bookings.filter((b: { status: string }) => b.status === "PENDING").length;
          }
        }

        const totalPending = ordersCount + bookingsCount;

        if (prevCashierTotalRef.current !== null && totalPending > prevCashierTotalRef.current) {
          playToneNotification(659.25, 880);
        }
        prevCashierTotalRef.current = totalPending;

        if (mounted) {
          setPendingOrdersCount(ordersCount);
          setPendingBookingsCount(bookingsCount);
        }
      } catch {
        //
      }
    }

    if (user && (user.role === "CASHIER" || user.role === "ADMIN")) {
      checkCashierPending();
      const interval = setInterval(checkCashierPending, 4000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  // 3. مراقبة للزبون (فحص حالة طلبه وحجزه الحالي وتنبيهه فوراً عند التغيير)
  useEffect(() => {
    let mounted = true;

    async function trackCustomerOrdersAndBookings() {
      if (!user || user.role === "CASHIER" || user.role === "ADMIN") {
        return;
      }

      try {
        const bookingsRes = await fetch(`/api/my-bookings?t=${Date.now()}`, { cache: "no-store" }).catch(() => null);
        if (bookingsRes && bookingsRes.ok) {
          const bData = await bookingsRes.json();
          if (Array.isArray(bData.bookings)) {
            // جلب أحدث حجز جاري أو بانتظار التأكيد
            const currentBooking = bData.bookings.find((b: CustomerBooking) =>
              b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "ACTIVE"
            );

            if (mounted && currentBooking) {
              setActiveCustomerBooking(currentBooking);

              // إذا تغيرت الحالة (مثلاً من PENDING إلى CONFIRMED)، نطلق تنبيهاً للزبون
              const statusKey = `B-${currentBooking.id}-${currentBooking.status}`;
              if (prevCustomerStatusRef.current && prevCustomerStatusRef.current !== statusKey) {
                playToneNotification(784, 1046.5); // نغمة نجاح ناعمة G5 -> C6
              }
              prevCustomerStatusRef.current = statusKey;
            } else if (mounted) {
              setActiveCustomerBooking(null);
            }
          }
        }
      } catch {
        //
      }
    }

    if (user && user.role === "CUSTOMER") {
      trackCustomerOrdersAndBookings();
      const interval = setInterval(trackCustomerOrdersAndBookings, 5000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [user]);

  function enableSound() {
    setSoundUnlocked(true);
    playToneNotification();
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
  const totalStaffPending = pendingOrdersCount + pendingBookingsCount;

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
        {/* شريط الكاشير والإدارة (حجوزات + طلبات منيو جديدة) */}
        {isStaff && totalStaffPending > 0 && (
          <div className="nz-staff-alert-banner">
            <div className="nz-alert-content">
              <span className="nz-alert-bell">🔔</span>
              <div>
                <strong>
                  تنبيه الكاشير: يوجد {totalStaffPending} طلبات وحجوزات جديدة بانتظار التأكيد!
                </strong>
                <p>
                  {pendingBookingsCount > 0 && `(حجوزات أجهزة: ${pendingBookingsCount}) `}
                  {pendingOrdersCount > 0 && `(طلبات منيو: ${pendingOrdersCount})`}
                </p>
              </div>
            </div>

            <div className="nz-alert-actions">
              {!soundUnlocked && (
                <button
                  type="button"
                  onClick={enableSound}
                  className="nz-sound-btn"
                  title="تفعيل رنين التنبيه التلقائي"
                >
                  🔊 تفعيل الرنين
                </button>
              )}

              {pendingBookingsCount > 0 && (
                <Link href="/cashier/bookings" className="nz-goto-btn nz-goto-book">
                  الحجوزات ({pendingBookingsCount}) ←
                </Link>
              )}

              {pendingOrdersCount > 0 && (
                <Link href="/cashier/orders" className="nz-goto-btn nz-goto-orders">
                  المنيو ({pendingOrdersCount}) ←
                </Link>
              )}
            </div>
          </div>
        )}

        {/* شريط متابعة حالة الحجز والطلب المباشر للزبون */}
        {!isStaff && activeCustomerBooking && (
          <div className="nz-customer-tracker-banner">
            <div className="nz-tracker-info">
              <span className="nz-tracker-pulse" />
              <div>
                <strong>
                  متابعة الحجز {activeCustomerBooking.bookingNumber || ""}:{" "}
                  {activeCustomerBooking.status === "PENDING" && "بانتظار تأكيد الكاشير ⏳"}
                  {activeCustomerBooking.status === "CONFIRMED" && "تم تأكيد حجزك وجاري تجهيز جهازك! ✅"}
                  {activeCustomerBooking.status === "ACTIVE" && "جلستك جارية الآن.. نتمنى لك وقتاً ممتعاً! 🎮"}
                </strong>
                <small>اضغط للاطلاع على تفاصيل وقت الحجز ورقم الجهاز</small>
              </div>
            </div>
            <Link href="/bookings" className="nz-tracker-btn">
              عرض الحجز ←
            </Link>
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
        /* شريط الكاشير */
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

        /* شريط متابعة حالة حجز الزبون */
        .nz-customer-tracker-banner {
          margin: 14px 20px 0;
          padding: 12px 18px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(30, 27, 75, 0.4));
          border: 1px solid rgba(139, 92, 246, 0.35);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          z-index: 100;
          animation: slideDown 0.3s ease;
        }

        .nz-tracker-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nz-tracker-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.25);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(167, 139, 250, 0); }
          100% { box-shadow: 0 0 0 0 rgba(167, 139, 250, 0); }
        }

        .nz-tracker-info strong {
          color: #f5f3ff;
          font-size: 13px;
          display: block;
        }

        .nz-tracker-info small {
          color: #c4b5fd;
          font-size: 11px;
        }

        .nz-tracker-btn {
          padding: 7px 15px;
          border-radius: 8px;
          background: #8b5cf6;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s ease;
        }

        .nz-tracker-btn:hover {
          background: #7c3aed;
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
          flex-wrap: wrap;
        }

        .nz-sound-btn {
          appearance: none;
          padding: 7px 12px;
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

        .nz-goto-btn {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s ease;
        }

        .nz-goto-book {
          background: #8b5cf6;
          color: #fff;
        }
        .nz-goto-book:hover {
          background: #7c3aed;
        }

        .nz-goto-orders {
          background: #ef4444;
          color: #fff;
        }
        .nz-goto-orders:hover {
          background: #dc2626;
        }

        @media (max-width: 700px) {
          .nz-staff-alert-banner,
          .nz-customer-tracker-banner {
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

          .nz-goto-btn,
          .nz-tracker-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}