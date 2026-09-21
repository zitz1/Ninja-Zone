"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./cashier-bookings.module.css";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

type ResourceType =
  | "PC_NORMAL"
  | "PC_MASTER"
  | "PS5"
  | "CINEMA"
  | "BILLIARD"
  | "TABLE";

type Resource = {
  id: string;
  code: string;
  name: string;
  type: ResourceType;
  status: string;
};

type BookingUser = {
  id: string;
  name: string;
  phone: string;
};

type BookingItem = {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  unitPrice: number;
  totalPrice: number;
  resource: Resource;
};

type Booking = {
  id: string;
  bookingNumber?: string;
  userId: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  totalAmount: number;
  customerNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  invoiceNumber?: string | null;
  paymentStatus?: string | null;
  paidAmount?: number;
  user: BookingUser;
  items: BookingItem[];
};

type Filter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

const STATUS = {
  PENDING: {
    label: "جديد",
    color: "#ff4d67",
    bg: "rgba(255,77,103,.10)",
    border: "rgba(255,77,103,.26)",
    icon: "!",
  },
  CONFIRMED: {
    label: "قيد التجهيز",
    color: "#f5c451",
    bg: "rgba(245,196,81,.10)",
    border: "rgba(245,196,81,.28)",
    icon: "◐",
  },
  ACTIVE: {
    label: "جاهز / اللعب مستمر",
    color: "#31d48b",
    bg: "rgba(49,212,139,.10)",
    border: "rgba(49,212,139,.28)",
    icon: "●",
  },
  COMPLETED: {
    label: "تم التسليم والمحاسبة",
    color: "#9b7bff",
    bg: "rgba(155,123,255,.11)",
    border: "rgba(155,123,255,.28)",
    icon: "✓",
  },
  CANCELLED: {
    label: "ملغي",
    color: "#8c95a4",
    bg: "rgba(140,149,164,.08)",
    border: "rgba(140,149,164,.20)",
    icon: "×",
  },
  EXPIRED: {
    label: "منتهي",
    color: "#7c8492",
    bg: "rgba(124,132,146,.08)",
    border: "rgba(124,132,146,.18)",
    icon: "◷",
  },
} satisfies Record<
  BookingStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: string;
  }
>;

const RESOURCE_LABEL: Record<ResourceType, string> = {
  PC_NORMAL: "PC عادي",
  PC_MASTER: "PC Master VIP",
  PS5: "PlayStation 5",
  CINEMA: "سينما",
  BILLIARD: "بليارد",
  TABLE: "طاولة",
};

const RESOURCE_COLOR: Record<ResourceType, string> = {
  PC_NORMAL: "#58a6ff",
  PC_MASTER: "#9b7bff",
  PS5: "#5eead4",
  CINEMA: "#f59e0b",
  BILLIARD: "#31d48b",
  TABLE: "#fb7185",
};

const money = (value: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

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

function durationText(minutes: number) {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!remaining) return `${hours} ساعة`;
  return `${hours} ساعة و ${remaining} دقيقة`;
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getResourceCode(item: BookingItem) {
  const code = item.resource?.code?.trim();
  if (code) return code;
  const name = item.resource?.name?.trim();
  if (name) return name;
  return RESOURCE_LABEL[item.resourceType];
}

function countdownText(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "الآن";
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}س ${remainingMinutes.toString().padStart(2, "0")}د`;
  }
  return `${remainingMinutes}د`;
}

export default function CashierBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  async function loadBookings(manual = false) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(
        `/api/cashier/bookings?date=${encodeURIComponent(date)}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل الحجوزات.");
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الحجوزات.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadBookings();
    const refreshInterval = window.setInterval(() => {
      loadBookings();
    }, 3000);

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [date]);

  // تحديث حالة الحجز مع التحديث المحلي الفوري (Instant State Update)
  async function updateBooking(bookingId: string, status: BookingStatus) {
    if (updating) return;

    setUpdating(bookingId);
    setError("");

    try {
      const bodyPayload =
        status === "COMPLETED"
          ? { bookingId, status, action: "PAY_CASH" }
          : { bookingId, status };

      const response = await fetch("/api/cashier/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "تعذر تحديث الحجز.");
      }

      // تحديث محلي فوري للحالة حتى تنتقل للون الأصفر (CONFIRMED) أو الأخضر فوراً دون انتظار
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );

      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث الحجز.");
    } finally {
      setUpdating(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: bookings.length,
      pending: bookings.filter((item) => item.status === "PENDING").length,
      confirmed: bookings.filter((item) => item.status === "CONFIRMED").length,
      active: bookings.filter((item) => item.status === "ACTIVE").length,
      completed: bookings.filter((item) => item.status === "COMPLETED").length,
      cancelled: bookings.filter(
        (item) => item.status === "CANCELLED" || item.status === "EXPIRED"
      ).length,
    }),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const statusMatch =
        filter === "ALL" ||
        (filter === "PENDING" && booking.status === "PENDING") ||
        (filter === "CONFIRMED" && booking.status === "CONFIRMED") ||
        (filter === "ACTIVE" && booking.status === "ACTIVE") ||
        (filter === "COMPLETED" && booking.status === "COMPLETED") ||
        (filter === "CANCELLED" &&
          (booking.status === "CANCELLED" || booking.status === "EXPIRED"));

      if (!statusMatch) return false;
      if (!query) return true;

      const searchable = [
        booking.bookingNumber || "",
        booking.id,
        booking.user?.name || "",
        booking.user?.phone || "",
        booking.customerNote || "",
        ...booking.items.map(
          (item) =>
            `${item.resource?.code || ""} ${item.resource?.name || ""} ${
              RESOURCE_LABEL[item.resourceType]
            }`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [bookings, filter, search]);

  const filterTitle = {
    ALL: "كل حجوزات اليوم",
    PENDING: "الحجوزات الجديدة",
    CONFIRMED: "الحجوزات قيد التجهيز",
    ACTIVE: "الجلسات الجارية",
    COMPLETED: "الحجوزات المكتملة والمسددة",
    CANCELLED: "الملغاة والمنتهية",
  }[filter];

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.kicker}>NINJA ZONE / BOOKING CONTROL</div>
            <h1>إدارة الحجوزات</h1>
            <p>متابعة حركة الجلسات، تأكيد الحجوزات، وإنهاء الحسابات بنقرة واحدة.</p>
          </div>

          <Link href="/cashier" className={styles.backButton}>
            <span>←</span>
            لوحة الكاشير
          </Link>
        </header>

        <section className={styles.toolbar}>
          <label className={styles.dateBox}>
            <span>التاريخ</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setFilter("ALL");
              }}
            />
          </label>

          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم العميل أو الهاتف أو رقم الجهاز..."
            />
            {search && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setSearch("")}
                aria-label="مسح البحث"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => loadBookings(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? styles.spin : ""}>↻</span>
            تحديث
          </button>
        </section>

        <section className={styles.filters}>
          <FilterCard
            active={filter === "ALL"}
            title="الكل"
            count={counts.all}
            icon="◎"
            color="#9b7bff"
            onClick={() => setFilter("ALL")}
          />
          <FilterCard
            active={filter === "PENDING"}
            title="جديد"
            count={counts.pending}
            icon="!"
            color="#ff4d67"
            onClick={() => setFilter("PENDING")}
          />
          <FilterCard
            active={filter === "CONFIRMED"}
            title="قيد التجهيز"
            count={counts.confirmed}
            icon="◐"
            color="#f5c451"
            onClick={() => setFilter("CONFIRMED")}
          />
          <FilterCard
            active={filter === "ACTIVE"}
            title="جارية"
            count={counts.active}
            icon="●"
            color="#31d48b"
            onClick={() => setFilter("ACTIVE")}
          />
        </section>

        <section className={styles.sectionBar}>
          <div>
            <h2>{filterTitle}</h2>
            <span>{filteredBookings.length} حجز ظاهر</span>
          </div>

          <div className={styles.live}>
            <i />
            تحديث تلقائي مستمر
          </div>
        </section>

        {error && (
          <div className={styles.errorBox}>
            <div className={styles.errorIcon}>!</div>
            <div>
              <strong>تعذر تنفيذ العملية</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <Loading />
        ) : filteredBookings.length === 0 ? (
          <Empty filter={filter} hasSearch={Boolean(search)} />
        ) : (
          <section className={styles.bookingList}>
            {filteredBookings.map((booking) => (
              <CompactBookingRow
                key={booking.id}
                booking={booking}
                now={now}
                updating={updating === booking.id}
                onUpdate={updateBooking}
              />
            ))}
          </section>
        )}

        <Link href="/cashier" className={styles.bottomBack}>
          ← العودة إلى لوحة الكاشير
        </Link>
      </div>
    </main>
  );
}

function FilterCard({
  active,
  title,
  count,
  icon,
  color,
  onClick,
}: {
  active: boolean;
  title: string;
  count: number;
  icon: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filter} ${active ? styles.filterActive : ""}`}
      style={
        {
          "--filter-color": color,
          "--filter-soft": `${color}18`,
        } as React.CSSProperties
      }
      onClick={onClick}
    >
      <div className={styles.filterTop}>
        <span className={styles.filterIcon}>{icon}</span>
        {active && <span className={styles.filterSelected}>محدد</span>}
      </div>
      <div className={styles.filterTitle}>{title}</div>
      <strong>{count}</strong>
    </button>
  );
}

function CompactBookingRow({
  booking,
  now,
  updating,
  onUpdate,
}: {
  booking: Booking;
  now: number;
  updating: boolean;
  onUpdate: (bookingId: string, status: BookingStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = STATUS[booking.status];
  const primaryItem = booking.items[0];
  const primaryCode = primaryItem ? getResourceCode(primaryItem) : "—";
  const totalDuration = booking.items.reduce(
    (max, item) => Math.max(max, item.durationMinutes),
    0
  );
  const start = booking.items[0]?.startAt || booking.startAt;
  const end = booking.items[0]?.endAt || booking.endAt;

  const countdown =
    booking.status === "ACTIVE"
      ? countdownText(end, now)
      : booking.status === "CONFIRMED"
      ? countdownText(start, now)
      : "";

  return (
    <article
      className={`${styles.compactRow} ${open ? styles.compactRowOpen : ""}`}
      style={
        {
          "--status": meta.color,
          "--status-bg": meta.bg,
          "--status-border": meta.border,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className={styles.compactMain}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={styles.compactAccent} />

        <span className={styles.compactPerson}>
          <span className={styles.personAvatar}>
            {(booking.user?.name || "؟").charAt(0)}
          </span>
          <span className={styles.personText}>
            <strong>{booking.user?.name || "بدون اسم"}</strong>
            <small>{booking.user?.phone || "لا يوجد رقم"}</small>
          </span>
        </span>

        <span className={styles.compactDevice}>
          <small>{RESOURCE_LABEL[primaryItem?.resourceType || "PC_NORMAL"]}</small>
          <strong>{primaryCode}</strong>
        </span>

        <span className={styles.compactTime}>
          <strong>{formatTime(start)}</strong>
          <span>→ {formatTime(end)}</span>
        </span>

        <span className={styles.compactStatus}>
          <span className={styles.statusPillSmall}>
            <i />
            {meta.label}
          </span>
          {countdown && (
            <small>
              {booking.status === "ACTIVE" ? "متبقي" : "يبدأ بعد"} {countdown}
            </small>
          )}
        </span>

        <span className={styles.compactAmount}>{money(booking.totalAmount)}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div className={styles.compactDetails}>
          <div className={styles.detailGrid}>
            <div className={styles.detailBox}>
              <span>العميل</span>
              <strong>{booking.user?.name || "بدون اسم"}</strong>
              <small>{booking.user?.phone || "لا يوجد رقم"}</small>
            </div>

            <div className={styles.detailBox}>
              <span>وقت الجلسة</span>
              <strong>
                {formatTime(start)} → {formatTime(end)}
              </strong>
              <small>{durationText(totalDuration)}</small>
            </div>

            <div className={styles.detailBox}>
              <span>رقم الحجز</span>
              <strong style={{ color: "#c4b5fd" }}>
                {booking.bookingNumber || `#${booking.id.slice(-6)}`}
              </strong>
              <small>تسلسل اليوم</small>
            </div>

            <div className={styles.detailBox}>
              <span>إجمالي المبلغ</span>
              <strong style={{ color: "#31d48b", fontSize: "14px" }}>
                {money(booking.totalAmount)}
              </strong>
              <small>{booking.items.length} مورد</small>
            </div>
          </div>

          <div className={styles.devicesTitle}>
            الأجهزة المحجوزة
            <span>{booking.items.length}</span>
          </div>

          <div className={styles.deviceList}>
            {booking.items.map((item) => {
              const color = RESOURCE_COLOR[item.resourceType];
              return (
                <div
                  key={item.id}
                  className={styles.deviceRow}
                  style={
                    {
                      "--device-color": color,
                      "--device-soft": `${color}18`,
                    } as React.CSSProperties
                  }
                >
                  <div className={styles.deviceIdentity}>
                    <span className={styles.deviceDot} />
                    <div>
                      <strong>{RESOURCE_LABEL[item.resourceType]}</strong>
                      <small>جهاز {getResourceCode(item)}</small>
                    </div>
                  </div>

                  <div className={styles.deviceTimes}>
                    <span>
                      <small>البداية</small>
                      <strong>{formatTime(item.startAt)}</strong>
                    </span>
                    <b>→</b>
                    <span>
                      <small>الانتهاء</small>
                      <strong>{formatTime(item.endAt)}</strong>
                    </span>
                  </div>

                  <div className={styles.devicePrice}>
                    <strong>{money(item.totalPrice)}</strong>
                    <small>{durationText(item.durationMinutes)}</small>
                  </div>
                </div>
              );
            })}
          </div>

          {booking.customerNote && (
            <div className={styles.note}>
              <div className={styles.noteTitle}>ملاحظة العميل</div>
              <div className={styles.noteText}>{booking.customerNote}</div>
            </div>
          )}

          {/* أزرار الإجراءات المتناسقة 100% مع المنيو */}
          <div className={styles.actions} style={{ marginTop: "14px" }}>
            {booking.status === "PENDING" && (
              <>
                <button
                  type="button"
                  className={`${styles.action} ${styles.confirm}`}
                  disabled={updating}
                  onClick={() => onUpdate(booking.id, "CONFIRMED")}
                  style={{
                    background: "linear-gradient(135deg, #8f64ff, #6f43ea)",
                    color: "#fff",
                    minHeight: "44px",
                    borderRadius: "11px",
                  }}
                >
                  {updating ? "جاري التحديث..." : "بدء التحضير والتأكيد"}
                </button>

                <button
                  type="button"
                  className={`${styles.action} ${styles.danger}`}
                  disabled={updating}
                  onClick={() => onUpdate(booking.id, "CANCELLED")}
                  style={{ minHeight: "44px", borderRadius: "11px" }}
                >
                  إلغاء
                </button>
              </>
            )}

            {booking.status === "CONFIRMED" && (
              <>
                <button
                  type="button"
                  className={`${styles.action} ${styles.start}`}
                  disabled={updating}
                  onClick={() => onUpdate(booking.id, "ACTIVE")}
                  style={{
                    background: "#f5c451",
                    color: "#1c1917",
                    fontWeight: 950,
                    minHeight: "44px",
                    borderRadius: "11px",
                  }}
                >
                  {updating ? "جاري التحديث..." : "تحديد كجاهز (بدء اللعب)"}
                </button>

                <button
                  type="button"
                  className={`${styles.action} ${styles.danger}`}
                  disabled={updating}
                  onClick={() => onUpdate(booking.id, "CANCELLED")}
                  style={{ minHeight: "44px", borderRadius: "11px" }}
                >
                  إلغاء
                </button>
              </>
            )}

            {booking.status === "ACTIVE" && (
              <button
                type="button"
                className={`${styles.action} ${styles.finish}`}
                disabled={updating}
                onClick={() => onUpdate(booking.id, "COMPLETED")}
                style={{
                  width: "100%",
                  background: "#31d48b",
                  color: "#04130c",
                  fontWeight: 950,
                  minHeight: "44px",
                  borderRadius: "11px",
                  boxShadow: "0 10px 24px rgba(49, 212, 139, 0.15)",
                }}
              >
                {updating ? "جاري الإنهاء واستلام المبلغ..." : "تم التسليم واستلام المبلغ"}
              </button>
            )}

            {booking.status === "COMPLETED" && (
              <div
                className={`${styles.completed} ${styles.fullAction}`}
                style={{
                  minHeight: "44px",
                  borderRadius: "11px",
                  background: "rgba(49, 212, 139, 0.1)",
                  border: "1px solid rgba(49, 212, 139, 0.25)",
                  color: "#31d48b",
                }}
              >
                ✓ تم إنهاء الجلسة واستلام المبلغ
              </div>
            )}

            {(booking.status === "CANCELLED" || booking.status === "EXPIRED") && (
              <div className={`${styles.inactive} ${styles.fullAction}`}>
                {booking.status === "CANCELLED" ? "× تم إلغاء الحجز" : "◷ انتهت مدة الانتظار"}
              </div>
            )}
          </div>

          {updating && (
            <div className={styles.updating}>يتم حفظ التغييرات وتحديث الصندوق...</div>
          )}
        </div>
      )}
    </article>
  );
}

function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loader} />
      <strong>جاري تحميل الحجوزات</strong>
      <span>يتم تحديث البيانات تلقائيًا مع التنبيه الصوتي.</span>
    </div>
  );
}

function Empty({ filter, hasSearch }: { filter: Filter; hasSearch: boolean }) {
  let title = "لا توجد حجوزات حاليًا";
  if (filter === "PENDING") title = "لا توجد حجوزات جديدة";
  if (filter === "CONFIRMED") title = "لا توجد حجوزات قيد التجهيز";
  if (filter === "ACTIVE") title = "لا توجد جلسات جارية";
  if (filter === "COMPLETED") title = "لا توجد حجوزات مكتملة ومسددة";
  if (filter === "CANCELLED") title = "لا توجد حجوزات ملغاة";

  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>◷</div>
      <strong>{title}</strong>
      <p>{hasSearch ? "جرّب تغيير البحث أو الفلتر." : "أي حجز جديد راح يظهر هنا تلقائيًا."}</p>
    </div>
  );
}