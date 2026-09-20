"use client";

import { useEffect, useMemo, useState } from "react";
import type { Service } from "@/lib/services";
import { formatDuration, formatIQD } from "@/lib/services";

type AvailableResource = {
  id: string;
  code: string;
  name: string;
  available: boolean;
  status: string;
  booked?: boolean;
};

const BAGHDAD_TIME_ZONE = "Asia/Baghdad";
const BAGHDAD_OFFSET = "+03:00";
const BUSINESS_OPEN_MINUTES = 10 * 60; // 10:00 صباحاً
const MIN_DURATION = 30;
const SLOT_MINUTES = 30;

function timeMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function displayTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour < 12 ? "صباحًا" : "مساءً";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getBaghdadParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BAGHDAD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return {
    year,
    month,
    day,
    hour,
    minute,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
  };
}

function addDaysToDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
}

// دالة حساب التاريخ الفعلي: أوقات الفجر (من 00:00 إلى 03:00) تتبع اليوم التالي بعد منتصف الليل
function getActualDateForSlot(businessDate: string, slot: string) {
  const minutes = timeMinutes(slot);
  return minutes < BUSINESS_OPEN_MINUTES ? addDaysToDateKey(businessDate, 1) : businessDate;
}

function bookingSlotIso(businessDate: string, slot: string) {
  const actualDate = getActualDateForSlot(businessDate, slot);
  return `${actualDate}T${slot}:00${BAGHDAD_OFFSET}`;
}

function bookingSlotDate(businessDate: string, slot: string) {
  return new Date(bookingSlotIso(businessDate, slot));
}

function bookingClosingDate(businessDate: string, slot: string) {
  const slotMinutes = timeMinutes(slot);
  const actualDate = slotMinutes < BUSINESS_OPEN_MINUTES ? addDaysToDateKey(businessDate, 1) : businessDate;
  const closingDate = slotMinutes < BUSINESS_OPEN_MINUTES ? actualDate : addDaysToDateKey(actualDate, 1);
  return new Date(`${closingDate}T03:00:00${BAGHDAD_OFFSET}`);
}

// توليد فترات اليوم كاملة (من 10:00 صباحاً حتى 02:30 فجراً)
const slots = Array.from({ length: 34 }, (_, index) => {
  const totalMinutes = BUSINESS_OPEN_MINUTES + index * SLOT_MINUTES;
  const normalized = totalMinutes % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export function BookingFlow({ service }: { service: Service }) {
  const [date, setDate] = useState(() => getBaghdadParts().date);
  const [time, setTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const [duration, setDuration] = useState(MIN_DURATION);
  const [resources, setResources] = useState<AvailableResource[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);

  const dates = useMemo(() => {
    const current = getBaghdadParts();
    return Array.from({ length: 7 }, (_, index) => {
      const key = addDaysToDateKey(current.date, index);
      const [year, month, day] = key.split("-").map(Number);
      const displayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      return {
        key,
        day: new Intl.DateTimeFormat("ar-IQ", { weekday: "short", timeZone: "UTC" }).format(displayDate),
        number: day,
        month: new Intl.DateTimeFormat("ar-IQ", { month: "short", timeZone: "UTC" }).format(displayDate),
      };
    });
  }, []);

  // جلب الأجهزة المتوفرة مع حساب التاريخ الفعلي الصحيح لساعات الفجر
  useEffect(() => {
    if (!time) {
      setResources([]);
      setSelected([]);
      return;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      setLoading(true);
      setNotice("");

      try {
        // نرسل التاريخ الفعلي المحسوب حتى لا يعتبره السيرفر بالماضي لساعات الفجر
        const actualDate = getActualDateForSlot(date, time);

        const params = new URLSearchParams({
          type: service.type,
          date: actualDate,
          time,
          duration: String(duration),
        });

        let response = await fetch(`/api/availability?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        let data = await response.json();

        if (!response.ok) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          response = await fetch(`/api/availability?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          });
          data = await response.json();
        }

        if (!response.ok) {
          throw new Error(data?.error ?? "تعذر تحديث توفر الأجهزة");
        }

        const raw = Array.isArray(data.resources) ? data.resources : [];
        const unique: AvailableResource[] = Array.from(
          new Map<string, AvailableResource>(
            raw.map((r: AvailableResource) => [r.code.trim().toUpperCase(), r])
          ).values()
        );

        setResources(unique);
        setSelected((current) =>
          current.filter((id) => unique.some((r) => r.id === id && r.available))
        );
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setNotice(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAvailability();
    return () => controller.abort();
  }, [service.type, date, time, duration]);

  function toggleResource(id: string) {
    const resource = resources.find((item) => item.id === id);
    if (!resource || !resource.available) return;
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function submit() {
    if (!time || selected.length === 0) {
      setNotice("اختار وقت الحضور وجهازًا واحدًا على الأقل.");
      return;
    }

    const startAt = bookingSlotIso(date, time);
    const startDate = new Date(startAt);

    if (Number.isNaN(startDate.getTime()) || startDate.getTime() <= Date.now() - 10 * 60_000) {
      setNotice("وقت الحجز المحدد أصبح من الماضي. حدّث الوقت.");
      return;
    }

    // طلب إذن الإشعارات من جهاز الزبون ليصله تنبيه فوري حتى لو غادر الموقع
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch {
        //
      }
    }

    setSubmitting(true);
    setNotice("");

    try {
      const demo = await fetch("/api/dev/demo-user", { method: "POST" });
      const user = await demo.json();
      if (!demo.ok) throw new Error(user?.error ?? "تعذر تجهيز الحساب التجريبي");

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user-id": user.id },
        body: JSON.stringify({
          items: [
            {
              resourceType: service.type,
              startAt,
              durationMinutes: duration,
              quantity: selected.length,
              resourceIds: selected,
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "تعذر إرسال الطلب");

      setSent(true);
      setNotice(`تم الحجز بنجاح #${String(data.booking.bookingNumber ?? data.booking.id)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="nz-container nz-page-shell">
        <div className="nz-success-card">
          <div className="nz-success-mark">✓</div>
          <h1>تم إرسال طلبك</h1>
          <p>{notice}</p>
          <div className="nz-inline-actions">
            <a className="nz-btn nz-btn-primary" href="/bookings">
              مشاهدة الحجوزات
            </a>
            <a className="nz-btn nz-btn-ghost" href="/sections">
              رجوع للأقسام
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <main className="nz-container nz-booking-page" style={{ paddingBottom: "120px" }}>
      <div className="nz-booking-head">
        <a href="/sections" className="nz-back-link">
          ← الأقسام
        </a>
        <div>
          <span className={`nz-kicker tone-${service.tone}`}>{service.title}</span>
          <h1>
            احجز <span>{service.arTitle}</span>
          </h1>
        </div>
      </div>

      <section className="nz-booking-card">
        <div className="nz-booking-grid">
          <div className="nz-book-main">
            {/* 01 - التواريخ */}
            <section className="nz-book-section">
              <div className="nz-book-section-title">
                <b>01</b>
                <div>
                  <strong>تاريخ الحضور</strong>
                </div>
              </div>
              <div
                className="nz-date-row"
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  gap: "12px",
                  paddingBottom: "15px",
                  scrollbarWidth: "none",
                }}
              >
                {dates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={date === item.key ? "active" : ""}
                    style={{ flexShrink: 0, minWidth: "70px" }}
                    onClick={() => {
                      setDate(item.key);
                      setTime("");
                      setTimeOpen(false);
                      setSelected([]);
                    }}
                  >
                    <small>{item.day}</small>
                    <strong>{item.number}</strong>
                    <em>{item.month}</em>
                  </button>
                ))}
              </div>
            </section>

            {/* 02 - الوقت */}
            <section className="nz-book-section">
              <div className="nz-book-section-title">
                <b>02</b>
                <div>
                  <strong>وقت الحضور</strong>
                </div>
              </div>
              <div style={{ position: "relative", zIndex: 9999 }}>
                <button
                  type="button"
                  className={`nz-time-trigger ${time ? "chosen" : ""}`}
                  onClick={() => setTimeOpen(!timeOpen)}
                >
                  <span>◷</span>
                  <div>
                    <small>وقت الحضور</small>
                    <strong>{time ? displayTime(time) : "اختار الوقت"}</strong>
                  </div>
                  <b>{timeOpen ? "⌃" : "⌄"}</b>
                </button>

                {timeOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      width: "100%",
                      background: "#11131a",
                      border: "1px solid #1f242c",
                      borderRadius: "12px",
                      maxHeight: "250px",
                      overflowY: "auto",
                      WebkitOverflowScrolling: "touch",
                      zIndex: 99999,
                      marginTop: "5px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
                    }}
                  >
                    {slots.map((slot) => {
                      const slotDate = bookingSlotDate(date, slot);
                      const isPast = slotDate.getTime() <= Date.now() - 10 * 60_000;
                      const exceedsClose =
                        new Date(slotDate.getTime() + duration * 60000).getTime() >
                        bookingClosingDate(date, slot).getTime();
                      const disabled = isPast || exceedsClose;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          style={{
                            width: "100%",
                            padding: "15px",
                            background: "transparent",
                            borderBottom: "1px solid #1a1e26",
                            color: disabled ? "#555" : "#fff",
                            textAlign: "right",
                            display: "flex",
                            justifyContent: "space-between",
                            pointerEvents: "auto",
                          }}
                          onClick={() => {
                            setTime(slot);
                            setSelected([]);
                            setTimeOpen(false);
                          }}
                        >
                          <span>{displayTime(slot)}</span>
                          <span style={{ fontSize: "12px" }}>
                            {disabled ? "غير متاح" : "متاح"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 03 - الأجهزة */}
            <section className="nz-book-section">
              <div className="nz-book-section-title">
                <b>03</b>
                <div>
                  <strong>اختار الجهاز</strong>
                </div>
                <em>{selected.length} مختار</em>
              </div>
              {!time ? (
                <div className="nz-empty-book">اختار وقت الحضور أولاً</div>
              ) : loading ? (
                <div className="nz-empty-book">جاري فحص الأجهزة المتوفرة...</div>
              ) : resources.length === 0 ? (
                <div className="nz-empty-book">لا توجد أجهزة متوفرة في هذا التوقيت</div>
              ) : (
                <div className="nz-resource-grid">
                  {resources.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!r.available}
                      onClick={() => toggleResource(r.id)}
                      className={`nz-resource-card ${r.available ? "available" : "busy"} ${
                        selected.includes(r.id) ? "selected" : ""
                      }`}
                    >
                      <span className="nz-resource-code">{r.code}</span>
                      <strong>{r.name || service.arTitle}</strong>
                      <small>{r.available ? "متاح" : "محجوز"}</small>
                      {selected.includes(r.id) && <b className="nz-resource-check">✓</b>}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 04 - المدة */}
            <section className="nz-book-section nz-duration-section">
              <div className="nz-book-section-title">
                <b>04</b>
                <div>
                  <strong>المدة</strong>
                </div>
              </div>
              <div className="nz-duration-control">
                <button
                  type="button"
                  onClick={() => setDuration((v) => Math.max(MIN_DURATION, v - SLOT_MINUTES))}
                >
                  −
                </button>
                <div>
                  <strong>{formatDuration(duration)}</strong>
                  <small>{formatIQD(service.price * (duration / 60))} / للجهاز</small>
                </div>
                <button
                  type="button"
                  onClick={() => setDuration((v) => v + SLOT_MINUTES)}
                >
                  +
                </button>
              </div>
            </section>
          </div>
        </div>

        {notice && <div className="nz-inline-notice">{notice}</div>}

        <div className="nz-book-actions" style={{ position: "relative", zIndex: 10 }}>
          <button
            type="button"
            className="nz-btn nz-btn-primary"
            disabled={!time || selected.length === 0 || loading || submitting}
            onClick={submit}
            style={{ width: "100%" }}
          >
            {submitting ? "جاري الإرسال..." : "إرسال طلب الحجز ↗"}
          </button>
        </div>
      </section>
    </main>
  );
}