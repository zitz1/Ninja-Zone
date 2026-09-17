"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";

type BookingItem = {
  id: string;
  resourceType: string;
  resourceId: string | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  unitPrice: number;
  totalPrice: number;
  resource: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
};

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  customerNote: string | null;
  createdAt: string;
  items: BookingItem[];
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "بانتظار التأكيد", color: "#ff4d67", bg: "rgba(255,77,103,.1)" },
  CONFIRMED: { label: "مؤكد", color: "#9b7bff", bg: "rgba(155,123,255,.1)" },
  ACTIVE: { label: "الجلسة جارية", color: "#31d48b", bg: "rgba(49,212,139,.1)" },
  COMPLETED: { label: "مكتمل", color: "#65a3ff", bg: "rgba(101,163,255,.1)" },
  CANCELLED: { label: "ملغي", color: "#8c95a4", bg: "rgba(140,149,164,.08)" },
  EXPIRED: { label: "منتهي", color: "#7c8492", bg: "rgba(124,132,146,.08)" },
  NO_SHOW: { label: "لم يحضر", color: "#f5c451", bg: "rgba(245,196,81,.1)" },
  REJECTED: { label: "مرفوض", color: "#ff4d67", bg: "rgba(255,77,103,.1)" },
};

const RESOURCE_LABELS: Record<string, string> = {
  PC_NORMAL: "PC عادي",
  PC_MASTER: "PC VIP",
  PS5: "PlayStation 5",
  CINEMA: "سينما",
  BILLIARD: "بليارد",
  TABLE: "طاولة",
};

const money = (value: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Baghdad",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Baghdad",
  }).format(new Date(value));
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    async function loadBookings() {
      try {
        const response = await fetch("/api/my-bookings", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 401) {
            if (mounted) {
              setError("يجب تسجيل الدخول لعرض حجوزاتك.");
            }
            return;
          }
          throw new Error(data.error || "تعذر تحميل الحجوزات.");
        }

        if (mounted) {
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "تعذر تحميل الحجوزات.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = bookings.filter((b) => {
    if (filter === "ALL") return true;
    if (filter === "UPCOMING") return b.status === "PENDING" || b.status === "CONFIRMED";
    if (filter === "ACTIVE") return b.status === "ACTIVE";
    if (filter === "PAST") return b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "EXPIRED" || b.status === "NO_SHOW" || b.status === "REJECTED";
    return true;
  });

  return (
    <CustomerShell>
      <main className="nz-container nz-page-shell">
        <header className="nz-page-titlebar">
          <div>
            <span className="nz-label">MY BOOKINGS</span>
            <h1>حجوزاتي</h1>
            <p>تابع جميع حجوزاتك الحالية والسابقة مع حالتها وتفاصيلها.</p>
          </div>
        </header>

        {error && (
          <div className="nz-bookings-error">
            <strong>تنبيه</strong>
            <span>{error}</span>
            {error.includes("تسجيل الدخول") && (
              <Link href="/login" className="nz-btn nz-btn-primary">
                تسجيل الدخول
              </Link>
            )}
          </div>
        )}

        {!error && (
          <>
            <div className="nz-bookings-tabs">
              <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>
                الكل ({bookings.length})
              </button>
              <button className={filter === "UPCOMING" ? "active" : ""} onClick={() => setFilter("UPCOMING")}>
                القادمة
              </button>
              <button className={filter === "ACTIVE" ? "active" : ""} onClick={() => setFilter("ACTIVE")}>
                الجارية
              </button>
              <button className={filter === "PAST" ? "active" : ""} onClick={() => setFilter("PAST")}>
                السابقة
              </button>
            </div>

            {loading ? (
              <div className="nz-bookings-loading">
                <div className="nz-loader" />
                <span>جاري تحميل حجوزاتك...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="nz-empty-page">
                <div className="nz-empty-mark">◷</div>
                <h2>لا توجد حجوزات</h2>
                <p>ابدأ أول حجز لك الآن واستمتع بتجربة Ninja Zone.</p>
                <Link className="nz-btn nz-btn-primary" href="/sections">
                  ابدأ أول حجز ↗
                </Link>
              </div>
            ) : (
              <div className="nz-bookings-list">
                {filtered.map((booking) => {
                  const status = STATUS_LABELS[booking.status] || STATUS_LABELS.PENDING;
                  return (
                    <article className="nz-booking-card" key={booking.id}>
                      <div className="nz-booking-top">
                        <div className="nz-booking-number">
                          <span>رقم الحجز</span>
                          <strong>{booking.bookingNumber}</strong>
                        </div>
                        <span className="nz-booking-status" style={{ color: status.color, background: status.bg }}>
                          <i style={{ background: status.color }} />
                          {status.label}
                        </span>
                      </div>

                      <div className="nz-booking-dates">
                        <div>
                          <span>التاريخ</span>
                          <strong>{formatDate(booking.startAt)}</strong>
                        </div>
                        <div>
                          <span>البداية</span>
                          <strong>{formatTime(booking.startAt)}</strong>
                        </div>
                        <div>
                          <span>النهاية</span>
                          <strong>{formatTime(booking.endAt)}</strong>
                        </div>
                      </div>

                      <div className="nz-booking-items">
                        {booking.items.map((item) => (
                          <div className="nz-booking-item" key={item.id}>
                            <span className="nz-booking-item-icon">
                              {item.resourceType === "PS5" ? "PS" : item.resourceType === "CINEMA" ? "C" : item.resourceType === "BILLIARD" ? "B" : item.resourceType === "TABLE" ? "T" : "PC"}
                            </span>
                            <div>
                              <strong>{RESOURCE_LABELS[item.resourceType] || item.resourceType}</strong>
                              <small>{item.resource?.name || item.resource?.code || "جهاز غير محدد"}</small>
                            </div>
                            <div className="nz-booking-item-time">
                              <span>{formatTime(item.startAt)} — {formatTime(item.endAt)}</span>
                              <small>{item.durationMinutes} دقيقة</small>
                            </div>
                            <strong className="nz-booking-item-price">{money(item.totalPrice)}</strong>
                          </div>
                        ))}
                      </div>

                      {booking.customerNote && (
                        <div className="nz-booking-note">
                          <span>ملاحظتك</span>
                          <p>{booking.customerNote}</p>
                        </div>
                      )}

                      <div className="nz-booking-total">
                        <span>إجمالي الحجز</span>
                        <strong>{money(booking.totalAmount)}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .nz-page-titlebar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 24px;
        }

        .nz-page-titlebar h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .nz-page-titlebar p {
          margin: 8px 0 0;
          color: #7c8492;
          font-size: 13px;
          line-height: 1.8;
        }

        .nz-bookings-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 77, 103, 0.2);
          border-radius: 14px;
          background: rgba(255, 77, 103, 0.06);
          color: #efb7c1;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .nz-bookings-error strong {
          color: #ff8e9f;
        }

        .nz-bookings-error .nz-btn {
          margin-inline-start: auto;
          min-height: 36px;
          padding: 0 14px;
          font-size: 10px;
        }

        .nz-bookings-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .nz-bookings-tabs button {
          padding: 9px 16px;
          border: 1px solid #242934;
          border-radius: 10px;
          background: #0d0f13;
          color: #8f98a6;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .nz-bookings-tabs button:hover {
          color: #d5dae3;
          border-color: #3a3e49;
        }

        .nz-bookings-tabs button.active {
          color: #fff;
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .nz-bookings-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 300px;
          color: #68717e;
          font-size: 12px;
        }

        .nz-loader {
          width: 36px;
          height: 36px;
          border: 3px solid #2b3039;
          border-top-color: #9574f4;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .nz-empty-page {
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          border: 1px solid #212630;
          border-radius: 18px;
          background: #101218;
          padding: 30px;
        }

        .nz-empty-mark {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: rgba(155, 123, 255, 0.1);
          color: #b8aaff;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .nz-empty-page h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }

        .nz-empty-page p {
          margin: 0;
          color: #68717e;
          font-size: 12px;
        }

        .nz-empty-page .nz-btn {
          margin-top: 14px;
        }

        .nz-bookings-list {
          display: grid;
          gap: 14px;
        }

        .nz-booking-card {
          border: 1px solid #212630;
          border-radius: 16px;
          background: #101218;
          padding: 18px;
        }

        .nz-booking-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .nz-booking-number span,
        .nz-booking-number strong {
          display: block;
        }

        .nz-booking-number span {
          color: #5d6673;
          font-size: 8px;
          font-weight: 900;
        }

        .nz-booking-number strong {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 950;
          color: #c4b5fd;
        }

        .nz-booking-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .nz-booking-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .nz-booking-dates {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .nz-booking-dates > div {
          padding: 10px;
          border: 1px solid #1d222a;
          border-radius: 10px;
          background: #0b0d11;
        }

        .nz-booking-dates span,
        .nz-booking-dates strong {
          display: block;
        }

        .nz-booking-dates span {
          color: #515a67;
          font-size: 8px;
        }

        .nz-booking-dates strong {
          margin-top: 5px;
          color: #c9ced6;
          font-size: 11px;
        }

        .nz-booking-items {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
        }

        .nz-booking-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid #1d222a;
          border-radius: 10px;
          background: #0b0d11;
        }

        .nz-booking-item-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(155, 123, 255, 0.1);
          color: #b8aaff;
          font-size: 9px;
          font-weight: 950;
          flex-shrink: 0;
        }

        .nz-booking-item > div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .nz-booking-item > div:nth-child(2) strong,
        .nz-booking-item > div:nth-child(2) small {
          display: block;
        }

        .nz-booking-item > div:nth-child(2) strong {
          font-size: 10px;
        }

        .nz-booking-item > div:nth-child(2) small {
          margin-top: 3px;
          color: #596270;
          font-size: 8px;
        }

        .nz-booking-item-time {
          text-align: center;
        }

        .nz-booking-item-time span,
        .nz-booking-item-time small {
          display: block;
        }

        .nz-booking-item-time span {
          color: #aab2bf;
          font-size: 9px;
        }

        .nz-booking-item-time small {
          margin-top: 3px;
          color: #596270;
          font-size: 8px;
        }

        .nz-booking-item-price {
          font-size: 11px;
          font-weight: 950;
          color: #c4b5fd;
          white-space: nowrap;
        }

        .nz-booking-note {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(155, 123, 255, 0.05);
          border: 1px solid rgba(155, 123, 255, 0.12);
          margin-bottom: 14px;
        }

        .nz-booking-note span {
          color: #c1b4ff;
          font-size: 8px;
          font-weight: 900;
        }

        .nz-booking-note p {
          margin: 6px 0 0;
          color: #7d8692;
          font-size: 10px;
          line-height: 1.7;
        }

        .nz-booking-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid #1d222a;
        }

        .nz-booking-total span {
          color: #68717e;
          font-size: 10px;
          font-weight: 900;
        }

        .nz-booking-total strong {
          font-size: 16px;
          font-weight: 950;
          color: #fff;
        }

        @media (max-width: 650px) {
          .nz-booking-dates {
            grid-template-columns: 1fr;
          }

          .nz-booking-item {
            flex-wrap: wrap;
          }

          .nz-booking-item-time {
            text-align: right;
            flex: 1;
          }

          .nz-booking-item-price {
            width: 100%;
            text-align: left;
          }
        }
      `}</style>
    </CustomerShell>
  );
}