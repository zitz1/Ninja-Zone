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

type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const nav = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/sections", label: "الأقسام", icon: "▦" },
  { href: "/bookings", label: "حجوزاتي", icon: "□" },
  { href: "/menu", label: "المنيو", icon: "☷" },
  { href: "/support", label: "الدعم والمساعدة", icon: "◌" },
  { href: "/account", label: "حسابي", icon: "♙" },
];

// دالة إصدار رنة تنبيه ناعمة ومدمجة
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // نغمة D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // نغمة A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // نغمة D6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // تجاهل القيود إن وجدت
  }
}

export function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const previousUnreadCount = useRef<number | null>(null);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // تحميل بيانات المستخدم
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

  // فحص دوري للإشعارات كل 6 ثوانٍ وتشغيل الصوت
  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      if (!user) return;
      try {
        const res = await fetch(`/api/notifications?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data.notifications)) {
          const list: AppNotification[] = data.notifications;
          const unreadCount = list.filter((n) => !n.read).length;

          // تشغيل الصوت إذا ورد إشعار جديد غير مقروء
          if (previousUnreadCount.current !== null && unreadCount > previousUnreadCount.current) {
            playNotificationChime();
          }
          previousUnreadCount.current = unreadCount;
          setNotifications(list);
        }
      } catch {
        // خطأ اتصال مؤقت
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  async function handleOpenNotifications() {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);

    if (nextState && notifications.some((n) => !n.read)) {
      try {
        await fetch("/api/notifications", { method: "PATCH" });
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        previousUnreadCount.current = 0;
      } catch {
        // تجاهل
      }
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

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

            {/* الإشعارات الفعالة مع الصوت */}
            <div className="nz-notification-wrap" style={{ position: "relative" }}>
              <button
                onClick={handleOpenNotifications}
                aria-label="الإشعارات"
                aria-expanded={notificationsOpen}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: notificationsOpen ? "rgba(139, 92, 246, 0.2)" : "transparent",
                  border: "none",
                  color: "#dce0e7",
                  cursor: "pointer",
                  fontSize: "20px",
                  transition: "all 0.2s ease",
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <b
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      background: "#ff4d67",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: "900",
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border: "2px solid #090a0e",
                      animation: "pulse 1.5s infinite",
                    }}
                  >
                    {unreadCount}
                  </b>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="nz-dropdown nz-notification-dropdown"
                  style={{
                    position: "absolute",
                    top: "50px",
                    left: "0",
                    width: "310px",
                    maxHeight: "420px",
                    background: "#12151b",
                    border: "1px solid #1e232b",
                    borderRadius: "14px",
                    padding: "16px",
                    zIndex: 99999,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                    color: "#fff",
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #1e232b",
                      paddingBottom: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <strong style={{ fontSize: "14px", color: "#fff" }}>
                      الإشعارات
                    </strong>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: "11px", color: "#a78bfa" }}>
                        {unreadCount} غير مقروء
                      </span>
                    )}
                  </div>
                  
                  <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px" }}>
                    {notifications.length === 0 ? (
                      <p style={{ margin: "25px 0", color: "#8d95a5", fontSize: "13px", textAlign: "center" }}>
                        لا توجد إشعارات حالياً
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: n.read ? "rgba(255,255,255,0.03)" : "rgba(139, 92, 246, 0.12)",
                            border: n.read ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(139, 92, 246, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                          }}
                        >
                          <strong style={{ fontSize: "13px", color: n.read ? "#dce0e7" : "#c4b5fd" }}>
                            {n.title}
                          </strong>
                          <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af", lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                          <small style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
                            {new Date(n.createdAt).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                          </small>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setNotificationsOpen(false)}
                    style={{
                      width: "100%",
                      padding: "9px",
                      borderRadius: "8px",
                      background: "#1a1e26",
                      border: "1px solid #282e38",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      marginTop: "12px",
                    }}
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </div>
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