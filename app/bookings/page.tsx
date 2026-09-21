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
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function loadBookings() {
    try {
      const response = await fetch("/api/my-bookings", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          setError("يجب تسجيل الدخول لعرض حجوزاتك.");
          return;
        }
        throw new Error(data.error || "تعذر تحميل الحجوزات.");
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الحجوزات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking(bookingId: string) {
    if (!confirm("هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟")) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/my-bookings/${bookingId}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر إلغاء الحجز.");

      // تحديث القائمة محلياً
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ أثناء الإلغاء.");
    } finally {
      setCancellingId(null);
    }
  }

  const filtered = bookings.filter((b) => {
    if (filter === "ALL") return true;
    if (filter === "UPCOMING") return b.status === "PENDING" || b.status === "CONFIRMED";
    if (filter === "ACTIVE") return b.status === "ACTIVE";
    if (filter === "PAST")
      return (
        b.status === "COMPLETED" ||
        b.status === "CANCELLED" ||
        b.status === "EXPIRED" ||
        b.status === "NO_SHOW" ||
        b.status === "REJECTED"
      );
    return true;
  });

  return (
    <CustomerShell>
      <main className="nz-container nz-page-shell">
        <header className="nz-page-titlebar">
          <div>
            <span className="nz-label">MY BOOKINGS</span>
            <h1>حجوزاتي</h1>
            <p>اضغط على أي حجز لعرض التفاصيل أو إلغائه.</p>
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
                  const isOpen = openBookingId === booking.id;
                  const primaryItem = booking.items[0];

                  return (
                    <article className={`nz-booking-card ${isOpen ? "open" : ""}`} key={booking.id}>
                      <button
                        type="button"
                        className="nz-booking-summary-btn"
                        onClick={() => setOpenBookingId(isOpen ? null : booking.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="nz-booking-summary-right">
                          <div className="nz-booking-avatar">
                            {primaryItem?.resourceType === "PS5"
                              ? "PS"
                              : primaryItem?.resourceType === "CINEMA"
                              ? "C"
                              : primaryItem?.resourceType === "BILLIARD"
                              ? "B"
                              : "PC"}
                          </div>

                          <div>
                            <div className="nz-booking-title-row">
                              <strong>{booking.bookingNumber || `#${booking.id.slice(-6)}`}</strong>
                              <span className="nz-booking-res-name">
                                {RESOURCE_LABELS[primaryItem?.resourceType || ""] || primaryItem?.resourceType}
                              </span>
                            </div>
                            <small className="nz-booking-time-preview">
                              {formatDate(booking.startAt)} • من {formatTime(booking.startAt)} إلى {formatTime(booking.endAt)}
                            </small>
                          </div>
                        </div>

                        <div className="nz-booking-summary-left">
                          <strong className="nz-booking-price-preview">{money(booking.totalAmount)}</strong>
                          <span className="nz-booking-status" style={{ color: status.color, background: status.bg }}>
                            <i style={{ background: status.color }} />
                            {status.label}
                          </span>
                          <span className={`nz-accordion-chevron ${isOpen ? "open" : ""}`}>›</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="nz-booking-dropdown-content">
                          <div className="nz-booking-dates">
                            <div>
                              <span>تاريخ الحضور</span>
                              <strong>{formatDate(booking.startAt)}</strong>
                            </div>
                            <div>
                              <span>وقت البدء</span>
                              <strong>{formatTime(booking.startAt)}</strong>
                            </div>
                            <div>
                              <span>وقت الانتهاء</span>
                              <strong>{formatTime(booking.endAt)}</strong>
                            </div>
                          </div>

                          <div className="nz-booking-items">
                            <span className="nz-items-label">الأجهزة المحجوزة:</span>
                            {booking.items.map((item) => (
                              <div className="nz-booking-item" key={item.id}>
                                <span className="nz-booking-item-icon">
                                  {item.resourceType === "PS5" ? "PS" : item.resourceType === "CINEMA" ? "C" : "PC"}
                                </span>
                                <div>
                                  <strong>{RESOURCE_LABELS[item.resourceType] || item.resourceType}</strong>
                                  <small>{item.resource?.name || item.resource?.code || "جهاز محدد"}</small>
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
                            <span>المبلغ الإجمالي</span>
                            <strong>{money(booking.totalAmount)}</strong>
                          </div>

                          {/* زر إلغاء الحجز للعميل إذا كان الحجز بانتظار التأكيد أو مؤكداً */}
                          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                            <div style={{ marginTop: "14px", textAlign: "left" }}>
                              <button
                                type="button"
                                disabled={cancellingId === booking.id}
                                onClick={() => cancelBooking(booking.id)}
                                style={{
                                  padding: "8px 16px",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(255, 77, 103, 0.3)",
                                  background: "rgba(255, 77, 103, 0.08)",
                                  color: "#ff4d67",
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                              >
                                {cancellingId === booking.id ? "جاري الإلغاء..." : "إلغاء هذا الحجز ✕"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
        }

        .nz-page-titlebar p {
          margin: 8px 0 0;
          color: #7c8492;
          font-size: 13px;
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
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .nz-bookings-tabs button.active {
          color: #fff;
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.35);
        }

        .nz-bookings-list {
          display: grid;
          gap: 12px;
        }

        .nz-booking-card {
          border: 1px solid #212630;
          border-radius: 16px;
          background: #101218;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .nz-booking-card:hover,
        .nz-booking-card.open {
          border-color: #373e4d;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
        }

        .nz-booking-summary-btn {
          width: 100%;
          padding: 16px 20px;
          background: transparent;
          border: 0;
          color: inherit;
          font: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          text-align: right;
        }

        .nz-booking-summary-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .nz-booking-avatar {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(155, 123, 255, 0.12);
          border: 1px solid rgba(155, 123, 255, 0.25);
          color: #c4b5fd;
          font-size: 13px;
          font-weight: 950;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nz-booking-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nz-booking-title-row strong {
          color: #fff;
          font-size: 14px;
          font-weight: 950;
        }

        .nz-booking-res-name {
          color: #8e97a4;
          font-size: 11px;
        }

        .nz-booking-time-preview {
          display: block;
          margin-top: 4px;
          color: #646d7b;
          font-size: 10px;
        }

        .nz-booking-summary-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .nz-booking-price-preview {
          color: #fff;
          font-size: 13px;
          font-weight: 950;
        }

        .nz-booking-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .nz-booking-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .nz-accordion-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          font-size: 18px;
          color: #6d7685;
          transform: rotate(90deg);
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .nz-accordion-chevron.open {
          transform: rotate(-90deg);
          color: #c4b5fd;
        }

        .nz-booking-dropdown-content {
          padding: 16px 20px 20px;
          border-top: 1px solid #1c2028;
          background: #0d0f14;
        }

        .nz-booking-dates {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .nz-booking-dates > div {
          padding: 12px;
          border: 1px solid #1c212a;
          border-radius: 12px;
          background: #090a0e;
        }

        .nz-booking-dates span {
          display: block;
          color: #5d6776;
          font-size: 9px;
        }

        .nz-booking-dates strong {
          display: block;
          margin-top: 5px;
          color: #d1d6e0;
          font-size: 12px;
        }

        .nz-items-label {
          display: block;
          color: #8b95a5;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .nz-booking-items {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
        }

        .nz-booking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #1c212a;
          border-radius: 12px;
          background: #090a0e;
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
          font-size: 10px;
          font-weight: 950;
        }

        .nz-booking-item > div:nth-child(2) {
          flex: 1;
        }

        .nz-booking-item > div:nth-child(2) strong {
          display: block;
          font-size: 11px;
        }

        .nz-booking-item > div:nth-child(2) small {
          display: block;
          margin-top: 2px;
          color: #5f6877;
          font-size: 9px;
        }

        .nz-booking-item-time {
          text-align: center;
        }

        .nz-booking-item-time span {
          display: block;
          color: #9ba4b2;
          font-size: 10px;
        }

        .nz-booking-item-time small {
          display: block;
          color: #5f6877;
          font-size: 9px;
        }

        .nz-booking-item-price {
          font-size: 12px;
          color: #c4b5fd;
        }

        .nz-booking-note {
          padding: 12px;
          border-radius: 12px;
          background: rgba(155, 123, 255, 0.05);
          border: 1px solid rgba(155, 123, 255, 0.15);
          margin-bottom: 14px;
        }

        .nz-booking-note span {
          color: #c4b5fd;
          font-size: 9px;
          font-weight: 900;
        }

        .nz-booking-note p {
          margin: 4px 0 0;
          color: #909aa8;
          font-size: 11px;
        }

        .nz-booking-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid #1c212a;
        }

        .nz-booking-total span {
          color: #717b8b;
          font-size: 11px;
          font-weight: 800;
        }

        .nz-booking-total strong {
          font-size: 16px;
          font-weight: 950;
          color: #31d48b;
        }

        .nz-bookings-loading,
        .nz-empty-page {
          min-height: 350px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
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
          to { transform: rotate(360deg); }
        }

        @media (max-width: 650px) {
          .nz-booking-summary-btn {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .nz-booking-summary-left {
            width: 100%;
            justify-content: space-between;
          }

          .nz-booking-dates {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </CustomerShell>
  );
}