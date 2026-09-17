"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PaymentMethod = "CASH" | "POS" | "TRANSFER";

type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "VOIDED"
  | "REFUNDED";

type PaymentResource = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
};

type PaymentBookingItem = {
  id: string;
  resourceType: string;
  resourceId: string | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  unitPrice: number;
  totalPrice: number;
  resource: PaymentResource | null;
};

type PaymentCustomer = {
  id: string;
  name: string | null;
  phone: string;
};

type PaymentInvoice = {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
};

type PaymentSession = {
  id: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  finalAmount: number | null;
};

type PaymentUser = {
  id: string;
  name: string | null;
  phone: string;
  role: string;
};

type PaymentBooking = {
  id: string;
  bookingNumber: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  customer: PaymentCustomer | null;
  items: PaymentBookingItem[];
};

type Payment = {
  id: string;
  paymentNumber: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  bookingId: string;
  bookingNumber: string | null;
  invoice: PaymentInvoice | null;
  receivedBy: PaymentUser | null;
  session: PaymentSession | null;
  booking: PaymentBooking | null;
};

type PaymentStats = {
  totalAmount: number;
  cashAmount: number;
  paidCount: number;
  count: number;
};

type PaymentsResponse = {
  payments: Payment[];
  count: number;
  stats: PaymentStats;
};

type Filter =
  | "ALL"
  | "PAID"
  | "PENDING"
  | "VOIDED"
  | "REFUNDED";

const FILTERS: {
  key: Filter;
  title: string;
  icon: string;
}[] = [
  {
    key: "ALL",
    title: "الكل",
    icon: "•",
  },
  {
    key: "PAID",
    title: "مدفوع",
    icon: "✓",
  },
  {
    key: "PENDING",
    title: "معلق",
    icon: "◷",
  },
  {
    key: "VOIDED",
    title: "ملغي",
    icon: "×",
  },
  {
    key: "REFUNDED",
    title: "مسترجع",
    icon: "↶",
  },
];

const STATUS_LABEL: Record<
  PaymentStatus,
  string
> = {
  PENDING: "معلق",
  PAID: "مدفوع",
  VOIDED: "ملغي",
  REFUNDED: "مسترجع",
};

const METHOD_LABEL: Record<
  PaymentMethod,
  string
> = {
  CASH: "نقدي",
  POS: "شبكة",
  TRANSFER: "تحويل",
};

function todayKey() {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  )
    .formatToParts(new Date())
    .reduce<Record<string, string>>(
      (acc, part) => {
        if (part.type !== "literal") {
          acc[part.type] = part.value;
        }

        return acc;
      },
      {},
    );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function money(value: number | null | undefined) {
  const safeValue =
    typeof value === "number" &&
    Number.isFinite(value)
      ? value
      : 0;

  return `${new Intl.NumberFormat(
    "ar-IQ",
  ).format(safeValue)} د.ع`;
}

function numberValue(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ar-IQ",
    {
      timeZone: "Asia/Baghdad",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  ).format(date);
}

function formatDateOnly(
  value: string,
) {
  const date = new Date(
    `${value}T12:00:00`,
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ar-IQ",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function methodClass(
  method: PaymentMethod,
) {
  if (method === "CASH") {
    return {
      color: "#31d48b",
      background:
        "rgba(49,212,139,.10)",
      border:
        "rgba(49,212,139,.24)",
    };
  }

  if (method === "POS") {
    return {
      color: "#67a6ff",
      background:
        "rgba(103,166,255,.10)",
      border:
        "rgba(103,166,255,.24)",
    };
  }

  return {
    color: "#c08cff",
    background:
      "rgba(192,140,255,.10)",
    border:
      "rgba(192,140,255,.24)",
  };
}

function statusClass(
  status: PaymentStatus,
) {
  if (status === "PAID") {
    return {
      color: "#31d48b",
      background:
        "rgba(49,212,139,.10)",
      border:
        "rgba(49,212,139,.24)",
    };
  }

  if (status === "PENDING") {
    return {
      color: "#ffb454",
      background:
        "rgba(255,180,84,.10)",
      border:
        "rgba(255,180,84,.24)",
    };
  }

  if (status === "REFUNDED") {
    return {
      color: "#67a6ff",
      background:
        "rgba(103,166,255,.10)",
      border:
        "rgba(103,166,255,.24)",
    };
  }

  return {
    color: "#ff4d67",
    background:
      "rgba(255,77,103,.10)",
    border:
      "rgba(255,77,103,.24)",
  };
}

export default function CashierPaymentsPage() {
  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [stats, setStats] =
    useState<PaymentStats>({
      totalAmount: 0,
      cashAmount: 0,
      paidCount: 0,
      count: 0,
    });

  const [filter, setFilter] =
    useState<Filter>("ALL");

  const [search, setSearch] =
    useState("");

  const [date, setDate] =
    useState(todayKey());

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  async function loadPayments(
    manual = false,
  ) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const params =
        new URLSearchParams();

      params.set("date", date);

      if (
        filter !== "ALL"
      ) {
        params.set(
          "status",
          filter,
        );
      }

      if (search.trim()) {
        params.set(
          "search",
          search.trim(),
        );
      }

      const response =
        await fetch(
          `/api/cashier/payments?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const data =
        (await response
          .json()
          .catch(() => ({}))) as
          | Partial<PaymentsResponse>
          | {
              error?: string;
            };

      if (!response.ok) {
        throw new Error(
          "error" in data &&
          typeof data.error ===
            "string"
            ? data.error
            : "تعذر تحميل المدفوعات.",
        );
      }

      const nextPayments =
        Array.isArray(
          (data as PaymentsResponse)
            .payments,
        )
          ? (
              data as PaymentsResponse
            ).payments
          : [];

      const nextStats =
        (data as PaymentsResponse)
          .stats;

      setPayments(
        nextPayments,
      );

      setStats({
        totalAmount:
          numberValue(
            nextStats?.totalAmount,
          ),

        cashAmount:
          numberValue(
            nextStats?.cashAmount,
          ),

        paidCount:
          numberValue(
            nextStats?.paidCount,
          ),

        count:
          numberValue(
            nextStats?.count,
          ),
      });

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل المدفوعات.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPayments();

    const interval =
      window.setInterval(
        () => {
          loadPayments();
        },
        5000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [date, filter, search]);

  const filteredPayments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return payments.filter(
        (payment) => {
          if (
            filter !== "ALL" &&
            payment.status !==
              filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable = [
            payment.id,
            payment.paymentNumber,
            payment.bookingId,
            payment.bookingNumber ||
              "",
            payment.invoice
              ?.invoiceNumber ||
              "",
            payment.receivedBy
              ?.name || "",
            payment.receivedBy
              ?.phone || "",
            payment.booking
              ?.customer?.name ||
              "",
            payment.booking
              ?.customer?.phone ||
              "",
            ...(
              payment.booking
                ?.items || []
            ).map(
              (item) =>
                `${item.resource?.code || ""} ${
                  item.resource?.name || ""
                }`,
            ),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      payments,
      filter,
      search,
    ]);

  const displayedTotal =
    numberValue(
      stats.totalAmount,
    );

  const displayedCash =
    numberValue(
      stats.cashAmount,
    );

  const displayedPaidCount =
    numberValue(
      stats.paidCount,
    );

  const displayedCount =
    numberValue(
      stats.count,
    );

  const averagePayment =
    displayedPaidCount > 0
      ? displayedTotal /
        displayedPaidCount
      : 0;

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "#090a0f",
        color: "#f5f7fb",
        padding:
          "28px 24px 60px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            "1180px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: "20px",
            marginBottom:
              "28px",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#8189a2",
                fontSize:
                  "11px",
                letterSpacing:
                  "2px",
                marginBottom:
                  "8px",
              }}
            >
              NINJA ZONE /
              PAYMENT CONTROL
            </div>

            <h1
              style={{
                margin: 0,
                fontSize:
                  "46px",
                fontWeight:
                  900,
                lineHeight:
                  1.05,
              }}
            >
              المدفوعات
            </h1>

            <p
              style={{
                margin:
                  "12px 0 0",
                color:
                  "#7d849a",
                fontSize:
                  "15px",
              }}
            >
              متابعة عمليات
              الدفع والفواتير
              من مكان واحد.
            </p>
          </div>

          <Link
            href="/cashier"
            style={{
              display: "inline-flex",
              alignItems:
                "center",
              gap: "8px",
              textDecoration:
                "none",
              color:
                "#f5f7fb",
              padding:
                "13px 18px",
              border:
                "1px solid #252832",
              borderRadius:
                "14px",
              background:
                "#111219",
              fontWeight:
                800,
              fontSize:
                "14px",
            }}
          >
            ← لوحة الكاشير
          </Link>
        </header>

        {/* STATS */}
        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "12px",
            marginBottom:
              "22px",
          }}
        >
          <StatCard
            title="إجمالي المدفوع"
            value={money(
              displayedTotal,
            )}
            icon="د.ع"
            accent="#9b7bff"
          />

          <StatCard
            title="النقد المستلم"
            value={money(
              displayedCash,
            )}
            icon="▣"
            accent="#31d48b"
          />

          <StatCard
            title="عدد العمليات"
            value={String(
              displayedCount,
            )}
            icon="↯"
            accent="#67a6ff"
          />

          <StatCard
            title="متوسط العملية"
            value={money(
              Math.round(
                averagePayment,
              ),
            )}
            icon="◷"
            accent="#ffb454"
          />
        </section>

        {/* TOOLBAR */}
        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "190px 1fr 110px",
            gap: "10px",
            marginBottom:
              "12px",
          }}
        >
          <label
            style={{
              display:
                "flex",
              flexDirection:
                "column",
              gap: "6px",
            }}
          >
            <span
              style={{
                color:
                  "#7e8598",
                fontSize:
                  "11px",
              }}
            >
              التاريخ
            </span>

            <input
              type="date"
              value={date}
              onChange={(
                event,
              ) => {
                setDate(
                  event.target
                    .value,
                );
                setExpandedId(
                  null,
                );
              }}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "14px",
                borderRadius:
                  "13px",
                border:
                  "1px solid #242733",
                background:
                  "#101116",
                color:
                  "#f4f5f8",
                outline:
                  "none",
              }}
            />
          </label>

          <div
            style={{
              alignSelf:
                "end",
              position:
                "relative",
            }}
          >
            <span
              style={{
                position:
                  "absolute",
                right:
                  "15px",
                top:
                  "50%",
                transform:
                  "translateY(-50%)",
                color:
                  "#6e758a",
              }}
            >
              ⌕
            </span>

            <input
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="ابحث باسم العميل أو الهاتف أو رقم الحجز أو رقم الفاتورة..."
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "14px 42px 14px 44px",
                borderRadius:
                  "13px",
                border:
                  "1px solid #242733",
                background:
                  "#101116",
                color:
                  "#f4f5f8",
                outline:
                  "none",
                direction:
                  "rtl",
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                style={{
                  position:
                    "absolute",
                  left:
                    "12px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  border: 0,
                  background:
                    "transparent",
                  color:
                    "#7e8598",
                  fontSize:
                    "20px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              loadPayments(true)
            }
            disabled={
              refreshing
            }
            style={{
              alignSelf:
                "end",
              height:
                "48px",
              border:
                "1px solid rgba(155,123,255,.35)",
              borderRadius:
                "13px",
              background:
                "rgba(155,123,255,.07)",
              color:
                "#bdaeff",
              fontWeight:
                800,
              cursor:
                refreshing
                  ? "default"
                  : "pointer",
            }}
          >
            {refreshing
              ? "..."
              : "↻ تحديث"}
          </button>
        </section>

        {/* FILTERS */}
        <section
          style={{
            display:
              "flex",
            gap: "8px",
            flexWrap:
              "wrap",
            marginBottom:
              "18px",
          }}
        >
          {FILTERS.map(
            (item) => {
              const active =
                filter ===
                item.key;

              return (
                <button
                  key={
                    item.key
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.key,
                    )
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "12px",
                    border:
                      active
                        ? "1px solid rgba(155,123,255,.55)"
                        : "1px solid #20232d",
                    background:
                      active
                        ? "rgba(155,123,255,.10)"
                        : "#101116",
                    color:
                      active
                        ? "#c7bcff"
                        : "#8d94a8",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                  }}
                >
                  <span>
                    {
                      item.icon
                    }
                  </span>

                  <span>
                    {
                      item.title
                    }
                  </span>

                  <strong
                    style={{
                      fontSize:
                        "12px",
                    }}
                  >
                    {item.key ===
                    "ALL"
                      ? displayedCount
                      : payments.filter(
                          (
                            payment,
                          ) =>
                            payment.status ===
                            item.key,
                        ).length}
                  </strong>
                </button>
              );
            },
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom:
                "15px",
              padding:
                "14px 16px",
              borderRadius:
                "14px",
              border:
                "1px solid rgba(255,77,103,.25)",
              background:
                "rgba(255,77,103,.07)",
              color:
                "#ff9aaa",
              fontWeight:
                700,
            }}
          >
            {error}
          </div>
        )}

        {/* LIST */}
        <section>
          {loading ? (
            <div
              style={{
                padding:
                  "60px 20px",
                textAlign:
                  "center",
                color:
                  "#7b8295",
              }}
            >
              جارِ تحميل
              المدفوعات...
            </div>
          ) : filteredPayments.length ===
            0 ? (
            <div
              style={{
                padding:
                  "60px 20px",
                textAlign:
                  "center",
                border:
                  "1px solid #1c1f27",
                borderRadius:
                  "18px",
                background:
                  "#0f1015",
                color:
                  "#7b8295",
              }}
            >
              لا توجد مدفوعات
              مطابقة للبحث
              والتصفية.
            </div>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "10px",
              }}
            >
              {filteredPayments.map(
                (payment) => {
                  const expanded =
                    expandedId ===
                    payment.id;

                  const methodStyle =
                    methodClass(
                      payment.method,
                    );

                  const statusStyle =
                    statusClass(
                      payment.status,
                    );

                  return (
                    <article
                      key={
                        payment.id
                      }
                      style={{
                        border:
                          "1px solid #1d2028",
                        borderRadius:
                          "18px",
                        background:
                          "#0f1015",
                        overflow:
                          "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(
                            expanded
                              ? null
                              : payment.id,
                          )
                        }
                        style={{
                          width:
                            "100%",
                          border:
                            "0",
                          background:
                            "transparent",
                          color:
                            "#f5f7fb",
                          padding:
                            "18px",
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1fr auto auto auto",
                          alignItems:
                            "center",
                          gap: "20px",
                          textAlign:
                            "right",
                          cursor:
                            "pointer",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "9px",
                              marginBottom:
                                "7px",
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  "17px",
                              }}
                            >
                              {payment.booking
                                ?.customer
                                ?.name ||
                                payment.receivedBy
                                  ?.name ||
                                "عميل بدون اسم"}
                            </strong>

                            <span
                              style={{
                                fontSize:
                                  "10px",
                                letterSpacing:
                                  "1.5px",
                                color:
                                  "#666e84",
                              }}
                            >
                              PAYMENT
                            </span>
                          </div>

                          <div
                            style={{
                              color:
                                "#747c91",
                              fontSize:
                                "12px",
                            }}
                          >
                            {payment.booking
                              ?.customer
                              ?.phone ||
                              payment.receivedBy
                                ?.phone ||
                              "—"}
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign:
                              "center",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#666e84",
                              fontSize:
                                "10px",
                              marginBottom:
                                "4px",
                            }}
                          >
                            رقم الدفع
                          </div>

                          <strong
                            style={{
                              fontSize:
                                "12px",
                              color:
                                "#bcb3ff",
                              direction:
                                "ltr",
                            }}
                          >
                            {payment.paymentNumber}
                          </strong>
                        </div>

                        <div
                          style={{
                            textAlign:
                              "center",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#666e84",
                              fontSize:
                                "10px",
                              marginBottom:
                                "4px",
                            }}
                          >
                            المبلغ
                          </div>

                          <strong
                            style={{
                              fontSize:
                                "17px",
                              color:
                                "#f6f7fb",
                            }}
                          >
                            {money(
                              payment.amount,
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "7px",
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "7px 10px",
                              borderRadius:
                                "9px",
                              background:
                                methodStyle.background,
                              border:
                                `1px solid ${methodStyle.border}`,
                              color:
                                methodStyle.color,
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                            }}
                          >
                            {
                              METHOD_LABEL[
                                payment.method
                              ]
                            }
                          </span>

                          <span
                            style={{
                              padding:
                                "7px 10px",
                              borderRadius:
                                "9px",
                              background:
                                statusStyle.background,
                              border:
                                `1px solid ${statusStyle.border}`,
                              color:
                                statusStyle.color,
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                            }}
                          >
                            {
                              STATUS_LABEL[
                                payment.status
                              ]
                            }
                          </span>

                          <span
                            style={{
                              color:
                                "#70788d",
                              fontSize:
                                "16px",
                            }}
                          >
                            {expanded
                              ? "⌃"
                              : "⌄"}
                          </span>
                        </div>
                      </button>

                      {expanded && (
                        <div
                          style={{
                            borderTop:
                              "1px solid #1c1f27",
                            padding:
                              "18px",
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(2, minmax(0, 1fr))",
                            gap: "12px",
                          }}
                        >
                          <Info
                            title="وقت الدفع"
                            value={formatDateTime(
                              payment.paidAt,
                            )}
                          />

                          <Info
                            title="رقم الحجز"
                            value={
                              payment.bookingNumber ||
                              "—"
                            }
                          />

                          <Info
                            title="رقم الفاتورة"
                            value={
                              payment.invoice
                                ?.invoiceNumber ||
                              "—"
                            }
                          />

                          <Info
                            title="رقم العملية الداخلي"
                            value={
                              payment.id
                            }
                          />

                          <Info
                            title="طريقة الدفع"
                            value={
                              METHOD_LABEL[
                                payment.method
                              ]
                            }
                          />

                          <Info
                            title="المبلغ المدفوع"
                            value={money(
                              payment.amount,
                            )}
                          />

                          <div
                            style={{
                              gridColumn:
                                "1 / -1",
                              padding:
                                "14px",
                              borderRadius:
                                "13px",
                              background:
                                "#12141b",
                              border:
                                "1px solid #20232d",
                            }}
                          >
                            <div
                              style={{
                                color:
                                  "#697188",
                                fontSize:
                                  "11px",
                                marginBottom:
                                  "9px",
                              }}
                            >
                              الأجهزة
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap:
                                  "8px",
                              }}
                            >
                              {payment.booking
                                ?.items?.length ? (
                                payment.booking.items.map(
                                  (
                                    item,
                                  ) => (
                                    <span
                                      key={
                                        item.id
                                      }
                                      style={{
                                        padding:
                                          "8px 11px",
                                        borderRadius:
                                          "9px",
                                        background:
                                          "#181a23",
                                        border:
                                          "1px solid #292d39",
                                        color:
                                          "#dfe2ea",
                                        fontSize:
                                          "12px",
                                      }}
                                    >
                                      {item.resource
                                        ?.code ||
                                        item.resource
                                          ?.name ||
                                        item.resourceType}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span
                                  style={{
                                    color:
                                      "#737b90",
                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  لا توجد
                                  تفاصيل
                                  أجهزة.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <div
          style={{
            marginTop:
              "24px",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            color:
              "#676f83",
            fontSize:
              "12px",
          }}
        >
          <span>
            {formatDateOnly(
              date,
            )}
          </span>

          <span>
            {displayedPaidCount}{" "}
            عملية مدفوعة
          </span>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #20232d",
        borderRadius:
          "17px",
        background:
          "linear-gradient(145deg,#111219,#0d0e13)",
        padding:
          "19px",
        minHeight:
          "104px",
        display:
          "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        gap: "14px",
      }}
    >
      <div>
        <div
          style={{
            color:
              "#697188",
            fontSize:
              "11px",
            marginBottom:
              "11px",
          }}
        >
          {title}
        </div>

        <strong
          style={{
            fontSize:
              "20px",
            lineHeight:
              1.1,
          }}
        >
          {value}
        </strong>
      </div>

      <div
        style={{
          width:
            "38px",
          height:
            "38px",
          borderRadius:
            "12px",
          display:
            "grid",
          placeItems:
            "center",
          border:
            `1px solid ${accent}33`,
          background:
            `${accent}12`,
          color:
            accent,
          fontWeight:
            900,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function Info({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "13px",
        borderRadius:
          "13px",
        background:
          "#12141b",
        border:
          "1px solid #20232d",
      }}
    >
      <div
        style={{
          color:
            "#687087",
          fontSize:
            "10px",
          marginBottom:
            "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            "#e8eaf0",
          fontSize:
            "13px",
          fontWeight:
            700,
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}