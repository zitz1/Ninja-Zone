"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { AdminShell } from "@/components/admin-shell";

type Dashboard = {
  date: string;

  revenue: {
    paid: number;
    bookings: number;
    menu: number;
    total: number;
  };

  customers: {
    total: number;
  };

  resources: {
    total: number;
    available: number;
    reserved: number;
    playing: number;
    maintenance: number;
  };

  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    active: number;
    completed: number;
  };

  orders: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    completed: number;
  };

  latestBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    totalAmount: number;
    startAt: string;
    endAt: string;
    user: {
      name: string;
      phone: string;
    };
    items: Array<{
      resource: {
        code: string;
        name: string;
      } | null;
    }>;
  }>;

  latestOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    locationType: string | null;
    locationLabel: string | null;
  }>;
};

const money = (value: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

const bookingStatus: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  PENDING: { label: "بانتظار التأكيد", className: "pending" },
  CONFIRMED: { label: "مؤكد", className: "confirmed" },
  ACTIVE: { label: "جاري", className: "active" },
  COMPLETED: { label: "مكتمل", className: "completed" },
  CANCELLED: { label: "ملغي", className: "cancelled" },
  EXPIRED: { label: "منتهي", className: "expired" },
};

const orderStatus: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  PENDING: { label: "جديد", className: "pending" },
  PREPARING: { label: "قيد التحضير", className: "preparing" },
  READY: { label: "جاهز", className: "ready" },
  COMPLETED: { label: "تم التسليم", className: "completed" },
  CANCELLED: { label: "ملغي", className: "cancelled" },
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // إعدادات الصوت والتنبيهات (مع الحفظ بذاكرة المتصفح)
  // ==========================================
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousTotalCount = useRef<number>(0);

  // استرجاع حالة الصوت عند فتح الصفحة
  useEffect(() => {
    const savedSound = localStorage.getItem("nz_admin_sound");
    if (savedSound === "true") {
      setSoundEnabled(true);
    }
  }, []);

  const playAlert = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("المتصفح منع الصوت، تحتاج ضغطة بالصفحة:", err);
      });
    }
  };

  // تشغيل / إيقاف الصوت مع حفظ الإعداد
  const toggleSound = () => {
    if (soundEnabled) {
      setSoundEnabled(false);
      localStorage.setItem("nz_admin_sound", "false");
    } else {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          setSoundEnabled(true);
          localStorage.setItem("nz_admin_sound", "true");
        }).catch(() => {
          setSoundEnabled(true);
          localStorage.setItem("nz_admin_sound", "true");
        });
      }
    }
  };
  // ==========================================

  async function loadDashboard(manual = false) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل لوحة الإدارة.");
      }

      // التحقق من الطلبات والحجوزات لإطلاق الصوت
      const currentTotal = (result.orders?.total || 0) + (result.bookings?.total || 0);
      if (previousTotalCount.current !== 0 && currentTotal > previousTotalCount.current) {
        playAlert();
      }
      previousTotalCount.current = currentTotal;

      setData(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر تحميل لوحة الإدارة."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(() => {
      loadDashboard();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <AdminShell>
        <main className="adminPage" dir="rtl">
          <div className="loading">
            <div className="loader" />
            <strong>جاري تحميل لوحة الإدارة</strong>
            <span>يتم جلب بيانات Ninja Zone...</span>
          </div>
          <style jsx>{styles}</style>
        </main>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell>
        <main className="adminPage" dir="rtl">
          <div className="errorState">
            <div className="errorIcon">!</div>
            <strong>تعذر تحميل لوحة الإدارة</strong>
            <p>{error || "حدث خطأ غير متوقع."}</p>
            <button type="button" onClick={() => loadDashboard(true)}>
              إعادة المحاولة
            </button>
          </div>
          <style jsx>{styles}</style>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="adminPage" dir="rtl">
        <div className="container">
          {/* HEADER */}
          <header className="header">
            <div>
              <div className="kicker">NINJA ZONE / ADMIN</div>
              <h1>لوحة الإدارة</h1>
              <p>نظرة شاملة على تشغيل المركز والحجوزات والطلبات والإيرادات.</p>
            </div>

            <div className="headerActions">
              {/* عنصر الصوت مخفي */}
              <audio
                ref={audioRef}
                src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
                preload="auto"
              />
              
              {/* زر تفعيل وإيقاف الصوت */}
              <button
                type="button"
                onClick={toggleSound}
                className={`soundToggle ${soundEnabled ? 'enabled' : 'disabled'}`}
              >
                {soundEnabled ? "🔔 الصوت مفعل" : "🔕 تفعيل الإشعارات"}
              </button>

              <button
                type="button"
                className="refresh"
                disabled={refreshing}
                onClick={() => loadDashboard(true)}
              >
                <span className={refreshing ? "spin" : ""}>↻</span>
                تحديث
              </button>

              <Link href="/cashier" className="cashierLink">
                لوحة الكاشير
              </Link>
            </div>
          </header>

          {/* ERROR */}
          {error && (
            <div className="errorBanner">
              <strong>تنبيه</strong>
              <span>{error}</span>
            </div>
          )}

          {/* TOP STATS */}
          <section className="statsGrid">
            <article className="statCard purple">
              <div className="statTop">
                <span>الإيرادات المدفوعة</span>
                <div className="statIcon">د.ع</div>
              </div>
              <strong>{money(data.revenue.paid)}</strong>
              <small>المدفوعات المسجلة اليوم</small>
            </article>

            <article className="statCard green">
              <div className="statTop">
                <span>الجلسات الجارية</span>
                <div className="statIcon">●</div>
              </div>
              <strong>{data.resources.playing}</strong>
              <small>جهاز قيد الاستخدام الآن</small>
            </article>

            <article className="statCard blue">
              <div className="statTop">
                <span>حجوزات اليوم</span>
                <div className="statIcon">◷</div>
              </div>
              <strong>{data.bookings.total}</strong>
              <small>جميع حالات الحجوزات</small>
            </article>

            <article className="statCard orange">
              <div className="statTop">
                <span>طلبات اليوم</span>
                <div className="statIcon">🛒</div>
              </div>
              <strong>{data.orders.total}</strong>
              <small>طلبات المنيو</small>
            </article>
          </section>

          {/* REVENUE + RESOURCES */}
          <section className="twoColumns">
            <article className="panel">
              <div className="panelHeader">
                <div>
                  <h2>الإيرادات</h2>
                  <span>{formatDate(`${data.date}T12:00:00+03:00`)}</span>
                </div>
                <div className="live">
                  <i />
                  مباشر
                </div>
              </div>

              <div className="revenueMain">
                <strong>{money(data.revenue.total)}</strong>
                <span>إجمالي الإيرادات</span>
              </div>

              <div className="revenueRows">
                <div>
                  <span>المدفوعات</span>
                  <strong>{money(data.revenue.paid)}</strong>
                </div>
                <div>
                  <span>طلبات المنيو</span>
                  <strong>{money(data.revenue.menu)}</strong>
                </div>
                <div>
                  <span>قيمة الحجوزات</span>
                  <strong>{money(data.revenue.bookings)}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="panelHeader">
                <div>
                  <h2>حالة الأجهزة</h2>
                  <span>الأجهزة الفعالة</span>
                </div>
                <div className="resourceTotal">{data.resources.total}</div>
              </div>

              <div className="resourceGrid">
                <ResourceBox
                  label="متاح"
                  value={data.resources.available}
                  className="available"
                />
                <ResourceBox
                  label="محجوز"
                  value={data.resources.reserved}
                  className="reserved"
                />
                <ResourceBox
                  label="جاري اللعب"
                  value={data.resources.playing}
                  className="playing"
                />
                <ResourceBox
                  label="صيانة"
                  value={data.resources.maintenance}
                  className="maintenance"
                />
              </div>
            </article>
          </section>

          {/* WORKFLOW */}
          <section className="workflowGrid">
            <WorkflowPanel
              title="الحجوزات"
              total={data.bookings.total}
              items={[
                ["بانتظار التأكيد", data.bookings.pending, "pending"],
                ["مؤكد", data.bookings.confirmed, "confirmed"],
                ["جاري", data.bookings.active, "active"],
                ["مكتمل", data.bookings.completed, "completed"],
              ]}
            />

            <WorkflowPanel
              title="الطلبات"
              total={data.orders.total}
              items={[
                ["جديد", data.orders.pending, "pending"],
                ["قيد التحضير", data.orders.preparing, "preparing"],
                ["جاهز", data.orders.ready, "ready"],
                ["تم التسليم", data.orders.completed, "completed"],
              ]}
            />

            <article className="panel miniPanel">
              <div className="panelHeader">
                <div>
                  <h2>العملاء</h2>
                  <span>حسابات العملاء</span>
                </div>
                <div className="customerIcon">👤</div>
              </div>

              <div className="customerNumber">{data.customers.total}</div>

              <Link href="/admin/customers" className="panelLink">
                إدارة العملاء
                <span>←</span>
              </Link>
            </article>
          </section>

          {/* LATEST */}
          <section className="latestGrid">
            <article className="panel">
              <div className="panelHeader">
                <div>
                  <h2>آخر الحجوزات</h2>
                  <span>أحدث الحجوزات اليوم</span>
                </div>
                <Link href="/cashier/bookings" className="viewAll">
                  عرض الكل
                </Link>
              </div>

              {data.latestBookings.length === 0 ? (
                <div className="empty">لا توجد حجوزات اليوم.</div>
              ) : (
                <div className="list">
                  {data.latestBookings.map((booking) => {
                    const status =
                      bookingStatus[booking.status] ?? bookingStatus.PENDING;

                    return (
                      <div key={booking.id} className="listRow">
                        <div className="listMain">
                          <strong>{booking.bookingNumber}</strong>
                          <span>{booking.user?.name || "بدون اسم"}</span>
                          <small>
                            {booking.items
                              .map((item) => item.resource?.code)
                              .filter(Boolean)
                              .join(" • ")}
                          </small>
                        </div>

                        <div className="listMiddle">
                          <strong>{formatTime(booking.startAt)}</strong>
                          <span>{formatTime(booking.endAt)}</span>
                        </div>

                        <div className="listEnd">
                          <span className={`status ${status.className}`}>
                            {status.label}
                          </span>
                          <strong>{money(booking.totalAmount)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panelHeader">
                <div>
                  <h2>آخر الطلبات</h2>
                  <span>أحدث طلبات المنيو</span>
                </div>
                <Link href="/cashier/orders" className="viewAll">
                  عرض الكل
                </Link>
              </div>

              {data.latestOrders.length === 0 ? (
                <div className="empty">لا توجد طلبات اليوم.</div>
              ) : (
                <div className="list">
                  {data.latestOrders.map((order) => {
                    const status =
                      orderStatus[order.status] ?? orderStatus.PENDING;

                    return (
                      <div key={order.id} className="listRow">
                        <div className="listMain">
                          <strong>{order.orderNumber}</strong>
                          <span>{order.customerName}</span>
                          <small>
                            {[order.locationType, order.locationLabel]
                              .filter(Boolean)
                              .join(" — ") || "الموقع غير محدد"}
                          </small>
                        </div>

                        <div className="listMiddle">
                          <strong>{formatTime(order.createdAt)}</strong>
                        </div>

                        <div className="listEnd">
                          <span className={`status ${status.className}`}>
                            {status.label}
                          </span>
                          <strong>{money(order.totalAmount)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>

          {/* QUICK ACTIONS */}
          <section className="panel quickPanel">
            <div className="panelHeader">
              <div>
                <h2>الإدارة السريعة</h2>
                <span>الوصول إلى أدوات النظام</span>
              </div>
            </div>

            <div className="quickGrid">
              <QuickLink
                href="/cashier/bookings"
                icon="◷"
                title="الحجوزات"
                description="متابعة الحجوزات والجلسات"
              />
              <QuickLink
                href="/cashier/orders"
                icon="🛒"
                title="الطلبات"
                description="إدارة طلبات المنيو"
              />
              <QuickLink
                href="/cashier/payments"
                icon="د.ع"
                title="المدفوعات"
                description="متابعة الدفعات والفواتير"
              />
              <QuickLink
                href="/admin/resources"
                icon="◉"
                title="الأجهزة"
                description="إدارة الأجهزة وحالاتها"
              />
              <QuickLink
                href="/admin/pricing"
                icon="₿"
                title="الأسعار"
                description="إدارة أسعار الخدمات"
              />
              <QuickLink
                href="/menu"
                icon="☷"
                title="المنيو"
                description="عرض وإدارة أصناف المنيو"
              />
            </div>
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    </AdminShell>
  );
}

function ResourceBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`resourceBox ${className}`}>
      <div className="resourceDot" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkflowPanel({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: Array<[string, number, string]>;
}) {
  return (
    <article className="panel miniPanel">
      <div className="panelHeader">
        <div>
          <h2>{title}</h2>
          <span>إجمالي اليوم</span>
        </div>
        <div className="workflowTotal">{total}</div>
      </div>

      <div className="workflowList">
        {items.map(([label, value, type]) => (
          <div key={label} className="workflowRow">
            <div>
              <i className={`dot ${type}`} />
              <span>{label}</span>
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="quickLink">
      <div className="quickIcon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <b>←</b>
    </Link>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .adminPage {
    min-height: 100vh;
    padding: 30px 18px 60px;
    background:
      radial-gradient(
        circle at 90% 0%,
        rgba(139, 92, 246, .10),
        transparent 25%
      ),
      #08090d;
    color: #f5f7fb;
    font-family:
      Tahoma,
      Arial,
      "Segoe UI",
      sans-serif;
  }

  .container {
    width: min(1250px, 100%);
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 25px;
    margin-bottom: 24px;
  }

  .kicker {
    color: #9b7bff;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .16em;
    margin-bottom: 9px;
  }

  h1 {
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 950;
    letter-spacing: -.04em;
  }

  .header p {
    margin: 9px 0 0;
    color: #727a88;
    font-size: 12px;
  }

  .headerActions {
    display: flex;
    gap: 9px;
  }

  .soundToggle {
    height: 45px;
    padding: 0 15px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .soundToggle.enabled {
    background: rgba(49, 212, 139, 0.15);
    color: #31d48b;
    border: 1px solid rgba(49, 212, 139, 0.4);
  }

  .soundToggle.disabled {
    background: rgba(255, 77, 103, 0.15);
    color: #ff4d67;
    border: 1px solid rgba(255, 77, 103, 0.4);
  }

  .refresh,
  .cashierLink {
    height: 45px;
    padding: 0 15px;
    border-radius: 12px;
    border: 1px solid #282d38;
    background: #12141a;
    color: #e0e4eb;
    font-size: 10px;
    font-weight: 900;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
  }

  .refresh:hover,
  .cashierLink:hover {
    background: #181b22;
  }

  .refresh:disabled {
    opacity: .5;
    cursor: wait;
  }

  .spin {
    display: inline-block;
    animation: spin .8s linear infinite;
  }

  .errorBanner {
    margin-bottom: 15px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 77, 103, .2);
    background: rgba(255, 77, 103, .06);
    color: #f6bdc6;
    display: flex;
    gap: 8px;
    font-size: 10px;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 13px;
  }

  .statCard,
  .panel {
    border: 1px solid #212630;
    border-radius: 17px;
    background: #101218;
  }

  .statCard {
    min-height: 150px;
    padding: 17px;
    position: relative;
    overflow: hidden;
  }

  .statCard::after {
    content: "";
    position: absolute;
    right: 0;
    left: 0;
    bottom: 0;
    height: 3px;
    background: var(--accent);
  }

  .purple { --accent: #9b7bff; }
  .green { --accent: #31d48b; }
  .blue { --accent: #65a3ff; }
  .orange { --accent: #f5c451; }

  .statTop {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #7d8593;
    font-size: 10px;
    font-weight: 800;
  }

  .statIcon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(255,255,255,.045);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 950;
    font-size: 10px;
  }

  .statCard > strong {
    display: block;
    margin-top: 20px;
    font-size: 28px;
    font-weight: 950;
  }

  .statCard small {
    display: block;
    margin-top: 6px;
    color: #555d6b;
    font-size: 9px;
  }

  .twoColumns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
    margin-bottom: 13px;
  }

  .panel {
    padding: 17px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .panelHeader h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 950;
  }

  .panelHeader span {
    display: block;
    margin-top: 4px;
    color: #5d6572;
    font-size: 9px;
  }

  .live {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #69727e;
    font-size: 9px;
  }

  .live i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #31d48b;
    box-shadow: 0 0 0 4px rgba(49,212,139,.08);
  }

  .revenueMain {
    margin-top: 23px;
  }

  .revenueMain strong {
    display: block;
    font-size: 31px;
    font-weight: 950;
  }

  .revenueMain span {
    display: block;
    margin-top: 5px;
    color: #606977;
    font-size: 9px;
  }

  .revenueRows {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 22px;
  }

  .revenueRows > div {
    padding: 11px;
    border: 1px solid #1f242d;
    border-radius: 11px;
    background: #0d0f13;
  }

  .revenueRows span {
    display: block;
    color: #626a77;
    font-size: 8px;
  }

  .revenueRows strong {
    display: block;
    margin-top: 5px;
    color: #f4f5f8;
    font-size: 11px;
  }

  .resourceTotal,
  .workflowTotal,
  .customerNumber {
    font-size: 25px;
    font-weight: 950;
    color: #fff;
  }

  .resourceGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
    margin-top: 19px;
  }

  .resourceBox {
    min-height: 77px;
    padding: 11px;
    border-radius: 11px;
    border: 1px solid #1f242c;
    background: #0d0f13;
  }

  .resourceDot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-bottom: 8px;
    background: #8d95a4;
  }

  .resourceBox span {
    display: block;
    color: #727b87;
    font-size: 8px;
  }

  .resourceBox strong {
    display: block;
    margin-top: 3px;
    font-size: 19px;
  }

  .resourceBox.available .resourceDot {
    background: #31d48b;
  }

  .resourceBox.reserved .resourceDot {
    background: #9b7bff;
  }

  .resourceBox.playing .resourceDot {
    background: #ff4d67;
  }

  .resourceBox.maintenance .resourceDot {
    background: #f5c451;
  }

  .workflowGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 13px;
    margin-bottom: 13px;
  }

  .workflowList {
    margin-top: 16px;
    display: grid;
    gap: 6px;
  }

  .workflowRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
    padding: 0 8px;
    border-radius: 9px;
    background: #0d0f13;
  }

  .workflowRow > div {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #888f9b;
    font-size: 9px;
  }

  .workflowRow > strong {
    font-size: 11px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #777;
  }

  .dot.pending { background: #ff4d67; }
  .dot.confirmed { background: #9b7bff; }
  .dot.active { background: #31d48b; }
  .dot.preparing { background: #f5c451; }
  .dot.ready { background: #31d48b; }
  .dot.completed { background: #65a3ff; }

  .customerIcon {
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(155,123,255,.08);
  }

  .customerNumber {
    margin-top: 23px;
    font-size: 33px;
  }

  .panelLink,
  .viewAll {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 17px;
    color: #9d89e9;
    text-decoration: none;
    font-size: 9px;
    font-weight: 900;
  }

  .latestGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
    margin-bottom: 13px;
  }

  .viewAll {
    margin-top: 0;
  }

  .list {
    margin-top: 16px;
    display: grid;
    gap: 7px;
  }

  .listRow {
    display: grid;
    grid-template-columns: 1.6fr .7fr 1fr;
    gap: 10px;
    align-items: center;
    min-height: 64px;
    padding: 9px 10px;
    border: 1px solid #1e232b;
    border-radius: 11px;
    background: #0d0f13;
  }

  .listMain strong,
  .listMain span,
  .listMain small {
    display: block;
  }

  .listMain strong {
    color: #fff;
    font-size: 10px;
  }

  .listMain span {
    margin-top: 4px;
    color: #afb5bf;
    font-size: 9px;
  }

  .listMain small {
    margin-top: 3px;
    color: #555e6c;
    font-size: 8px;
  }

  .listMiddle {
    text-align: center;
  }

  .listMiddle strong {
    display: block;
    color: #fff;
    font-size: 9px;
  }

  .listMiddle span {
    display: block;
    margin-top: 3px;
    color: #5a6370;
    font-size: 8px;
  }

  .listEnd {
    text-align: left;
  }

  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 23px;
    padding: 0 7px;
    border-radius: 999px;
    font-size: 7px;
    font-weight: 900;
  }

  .status.pending {
    color: #ff8e9d;
    background: rgba(255,77,103,.09);
  }

  .status.confirmed {
    color: #c0b1ff;
    background: rgba(155,123,255,.09);
  }

  .status.active,
  .status.ready,
  .status.completed {
    color: #6fe5ad;
    background: rgba(49,212,139,.09);
  }

  .status.preparing {
    color: #f4d678;
    background: rgba(245,196,81,.09);
  }

  .status.cancelled,
  .status.expired {
    color: #8b94a2;
    background: rgba(141,149,165,.08);
  }

  .listEnd strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 9px;
  }

  .empty {
    min-height: 170px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #596270;
    font-size: 10px;
  }

  .quickPanel {
    margin-bottom: 0;
  }

  .quickGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
    margin-top: 15px;
  }

  .quickLink {
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px;
    border: 1px solid #20252d;
    border-radius: 12px;
    background: #0d0f13;
    color: inherit;
    text-decoration: none;
    transition: .18s ease;
  }

  .quickLink:hover {
    transform: translateY(-1px);
    background: #12151b;
    border-color: #343b47;
  }

  .quickIcon {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border-radius: 10px;
    background: rgba(155,123,255,.09);
    color: #b5a5ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 950;
  }

  .quickLink strong,
  .quickLink span {
    display: block;
  }

  .quickLink strong {
    font-size: 10px;
  }

  .quickLink span {
    margin-top: 4px;
    color: #5e6674;
    font-size: 8px;
  }

  .quickLink b {
    margin-inline-start: auto;
    color: #5f6875;
    font-size: 15px;
  }

  .loading,
  .errorState {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .loader {
    width: 38px;
    height: 38px;
    border: 3px solid #292e37;
    border-top-color: #9b7bff;
    border-radius: 50%;
    animation: spin .8s linear infinite;
    margin-bottom: 14px;
  }

  .loading strong,
  .errorState strong {
    font-size: 14px;
  }

  .loading span,
  .errorState p {
    margin-top: 6px;
    color: #68707d;
    font-size: 10px;
  }

  .errorIcon {
    width: 55px;
    height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    background: rgba(255,77,103,.09);
    color: #ff8f9d;
    font-size: 22px;
    font-weight: 950;
    margin-bottom: 14px;
  }

  .errorState button {
    margin-top: 15px;
    height: 42px;
    padding: 0 17px;
    border: 0;
    border-radius: 10px;
    background: #8b67f4;
    color: #fff;
    cursor: pointer;
    font-size: 10px;
    font-weight: 900;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 950px) {
    .statsGrid {
      grid-template-columns: repeat(2, 1fr);
    }

    .workflowGrid {
      grid-template-columns: 1fr;
    }

    .quickGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 700px) {
    .adminPage {
      padding: 17px 10px 35px;
    }

    .header {
      align-items: stretch;
      flex-direction: column;
    }

    .headerActions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .refresh,
    .cashierLink,
    .soundToggle {
      width: 100%;
    }

    .twoColumns,
    .latestGrid {
      grid-template-columns: 1fr;
    }

    .revenueRows {
      grid-template-columns: 1fr;
    }

    .quickGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .statsGrid {
      grid-template-columns: 1fr;
    }

    .listRow {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .listMiddle {
      text-align: right;
    }

    .listEnd {
      text-align: right;
    }
  }
`;