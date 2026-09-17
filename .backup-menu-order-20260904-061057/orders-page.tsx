"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  note: string | null;
  locationType: string | null;
  locationLabel: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

type Filter =
  | "ALL"
  | "PENDING"
  | "PREPARING"
  | "READY";

const STATUS = {
  PENDING: {
    label: "جديد",
    color: "#ff4d67",
    bg: "rgba(255,77,103,.11)",
    border: "rgba(255,77,103,.32)",
  },
  PREPARING: {
    label: "قيد التحضير",
    color: "#f5c451",
    bg: "rgba(245,196,81,.11)",
    border: "rgba(245,196,81,.32)",
  },
  READY: {
    label: "جاهز",
    color: "#31d48b",
    bg: "rgba(49,212,139,.11)",
    border: "rgba(49,212,139,.32)",
  },
  COMPLETED: {
    label: "تم التسليم",
    color: "#9b7bff",
    bg: "rgba(155,123,255,.11)",
    border: "rgba(155,123,255,.32)",
  },
  CANCELLED: {
    label: "ملغي",
    color: "#8d95a5",
    bg: "rgba(141,149,165,.10)",
    border: "rgba(141,149,165,.22)",
  },
} satisfies Record<
  OrderStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
  }
>;

const money = (value: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeAgo(value: string) {
  const diff = Math.max(
    0,
    Date.now() - new Date(value).getTime(),
  );

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `منذ ${hours} ساعة`;

  return formatDate(value);
}

function getLocation(order: Order) {
  if (!order.locationType && !order.locationLabel) {
    return "غير محدد";
  }

  return [order.locationType, order.locationLabel]
    .filter(Boolean)
    .join(" — ");
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<
    Record<string, boolean>
  >({});
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadOrders(manual = false) {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/menu/orders", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "تعذر تحميل الطلبات.",
        );
      }

      setOrders(
        Array.isArray(data.orders) ? data.orders : [],
      );
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل الطلبات.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const interval = window.setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  async function changeStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    if (updating) return;

    setUpdating(orderId);
    setError("");

    try {
      const response = await fetch("/api/menu/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "تعذر تحديث حالة الطلب.",
        );
      }

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحديث حالة الطلب.",
      );
    } finally {
      setUpdating(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter(
        (order) => order.status === "PENDING",
      ).length,
      preparing: orders.filter(
        (order) => order.status === "PREPARING",
      ).length,
      ready: orders.filter(
        (order) => order.status === "READY",
      ).length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      let statusMatch = true;

      if (filter === "PENDING") {
        statusMatch = order.status === "PENDING";
      }

      if (filter === "PREPARING") {
        statusMatch = order.status === "PREPARING";
      }

      if (filter === "READY") {
        statusMatch = order.status === "READY";
      }

      if (!statusMatch) return false;

      if (!query) return true;

      const searchable = [
        order.id,
        order.customerName,
        order.phone,
        order.locationType ?? "",
        order.locationLabel ?? "",
        ...order.items.map((item) => item.itemName),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [orders, filter, search]);

  const filterTitle = {
    ALL: "كل الطلبات",
    PENDING: "الطلبات الجديدة",
    PREPARING: "الطلبات قيد التحضير",
    READY: "الطلبات الجاهزة",
  }[filter];

  return (
    <>
      <main className="cashierPage" dir="rtl">
        <div className="container">
          {/* HEADER */}
          <header className="header">
            <div className="headerText">
              <div className="kicker">
                NINJA ZONE / CASHIER
              </div>

              <h1>الطلبات والتسليم</h1>

              <p>
                تابع الطلب من لحظة استلامه إلى أن يتم تسليمه
                للعميل.
              </p>
            </div>

            <Link
              href="/cashier"
              className="dashboardButton"
            >
              <span>←</span>
              لوحة الكاشير
            </Link>
          </header>

          {/* SEARCH + REFRESH */}
          <section className="toolbar">
            <div className="searchBox">
              <span className="searchIcon">⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="ابحث عن العميل أو رقم الطلب أو المكان..."
              />

              {search && (
                <button
                  type="button"
                  className="clearButton"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() => loadOrders(true)}
              disabled={refreshing}
            >
              <span
                className={refreshing ? "refreshSpin" : ""}
              >
                ↻
              </span>

              تحديث
            </button>
          </section>

          {/* FILTERS */}
          <section className="filters">
            <button
              type="button"
              className={`filterCard ${
                filter === "ALL" ? "active" : ""
              }`}
              style={
                {
                  "--accent": "#9b7bff",
                  "--soft": "rgba(155,123,255,.10)",
                } as React.CSSProperties
              }
              onClick={() => setFilter("ALL")}
            >
              <div className="filterTop">
                <span className="filterIcon">◎</span>

                {filter === "ALL" && (
                  <span className="selectedText">
                    محدد
                  </span>
                )}
              </div>

              <div className="filterLabel">
                كل الطلبات
              </div>

              <strong>{counts.all}</strong>
            </button>

            <button
              type="button"
              className={`filterCard ${
                filter === "PENDING" ? "active" : ""
              }`}
              style={
                {
                  "--accent": "#ff4d67",
                  "--soft": "rgba(255,77,103,.10)",
                } as React.CSSProperties
              }
              onClick={() => setFilter("PENDING")}
            >
              <div className="filterTop">
                <span className="filterIcon">●</span>

                {filter === "PENDING" && (
                  <span className="selectedText">
                    محدد
                  </span>
                )}
              </div>

              <div className="filterLabel">
                جديد
              </div>

              <strong>{counts.pending}</strong>
            </button>

            <button
              type="button"
              className={`filterCard ${
                filter === "PREPARING" ? "active" : ""
              }`}
              style={
                {
                  "--accent": "#f5c451",
                  "--soft": "rgba(245,196,81,.10)",
                } as React.CSSProperties
              }
              onClick={() => setFilter("PREPARING")}
            >
              <div className="filterTop">
                <span className="filterIcon">◐</span>

                {filter === "PREPARING" && (
                  <span className="selectedText">
                    محدد
                  </span>
                )}
              </div>

              <div className="filterLabel">
                قيد التحضير
              </div>

              <strong>{counts.preparing}</strong>
            </button>

            <button
              type="button"
              className={`filterCard ${
                filter === "READY" ? "active" : ""
              }`}
              style={
                {
                  "--accent": "#31d48b",
                  "--soft": "rgba(49,212,139,.10)",
                } as React.CSSProperties
              }
              onClick={() => setFilter("READY")}
            >
              <div className="filterTop">
                <span className="filterIcon">✓</span>

                {filter === "READY" && (
                  <span className="selectedText">
                    محدد
                  </span>
                )}
              </div>

              <div className="filterLabel">
                جاهز
              </div>

              <strong>{counts.ready}</strong>
            </button>
          </section>

          {/* CURRENT FILTER */}
          <section className="sectionBar">
            <div>
              <h2>{filterTitle}</h2>

              <span>
                {filteredOrders.length} طلب ظاهر
                {search ? " حسب البحث الحالي" : ""}
              </span>
            </div>

            <div className="liveStatus">
              <i />
              تحديث تلقائي
            </div>
          </section>

          {/* ERROR */}
          {error && (
            <div className="errorBox">
              <div className="errorBadge">!</div>

              <div>
                <strong>تعذر تنفيذ العملية</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {loading ? (
            <Loading />
          ) : filteredOrders.length === 0 ? (
            <Empty
              filter={filter}
              hasSearch={Boolean(search)}
            />
          ) : (
            <section className="orders">
              {filteredOrders.map((order) => {
                const status = STATUS[order.status];
                const isExpanded =
                  Boolean(expanded[order.id]);
                const isOpen =
                  openOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className="orderCard"
                    style={
                      {
                        "--status": status.color,
                        "--status-bg": status.bg,
                        "--status-border":
                          status.border,
                      } as React.CSSProperties
                    }
                  >
                    <div className="statusLine" />

                    {/* ORDER HEADER */}
                    <button
                      type="button"
                      className="orderHeader orderToggle"
                      onClick={() =>
                        setOpenOrderId((current) =>
                          current === order.id ? null : order.id,
                        )
                      }
                      aria-expanded={isOpen}
                      aria-controls={`order-details-${order.id}`}
                    >
                      <div className="orderIdentity">
                        <div className="orderNumberBadge">
                          #
                        </div>

                        <div>
                          <div className="smallLabel">
                            رقم الطلب
                          </div>

                          <div className="orderNumber">
                            {order.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>

                      <div className="orderTime">
                        <strong>
                          {formatTime(order.createdAt)}
                        </strong>

                        <span>
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>

                      <div className="orderHeaderSummary">
                        <span className="headerStatusPill">
                          <i />
                          {status.label}
                        </span>

                        <strong className="headerTotal">
                          {money(order.total)}
                        </strong>

                        <span className="orderToggleHint">
                          {isOpen ? "إخفاء" : "تفاصيل"}
                          <span
                            className={`chevron ${isOpen ? "open" : ""}`}
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div
                        id={`order-details-${order.id}`}
                        className="orderDetails"
                      >

                    {/* STATUS */}
                    <div className="statusRow">
                      <span className="statusPill">
                        <i />
                        {status.label}
                      </span>

                      <span className="orderDate">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* CUSTOMER + LOCATION */}
                    <div className="mainInfo">
                      <div className="mainInfoCard customer">
                        <span className="infoTitle">
                          العميل
                        </span>

                        <strong>
                          {order.customerName ||
                            "بدون اسم"}
                        </strong>

                        <span
                          className="phone"
                          dir="ltr"
                        >
                          {order.phone}
                        </span>
                      </div>

                      <div className="mainInfoCard location">
                        <span className="infoTitle">
                          مكان التسليم
                        </span>

                        <strong>
                          {getLocation(order)}
                        </strong>

                        <span className="locationHint">
                          ← يوصل الطلب إلى هنا
                        </span>
                      </div>
                    </div>

                    {/* ITEMS */}
                    <div className="itemsSection">
                      <div className="itemsHeader">
                        <div>
                          <h3>محتويات الطلب</h3>

                          <span>
                            {order.items.length} أصناف
                          </span>
                        </div>

                        {order.items.length > 2 && (
                          <button
                            type="button"
                            className="detailsButton"
                            onClick={() =>
                              setExpanded((current) => ({
                                ...current,
                                [order.id]:
                                  !current[order.id],
                              }))
                            }
                          >
                            {isExpanded
                              ? "إخفاء التفاصيل"
                              : "عرض التفاصيل"}
                          </button>
                        )}
                      </div>

                      <div className="itemsList">
                        {(isExpanded
                          ? order.items
                          : order.items.slice(0, 2)
                        ).map((item) => (
                          <div
                            className="item"
                            key={item.id}
                          >
                            <div className="itemLeft">
                              <div className="itemName">
                                {item.itemName}
                              </div>

                              <div className="itemMeta">
                                {item.quantity} ×{" "}
                                {money(item.unitPrice)}
                              </div>
                            </div>

                            <strong className="itemTotal">
                              {money(item.totalPrice)}
                            </strong>
                          </div>
                        ))}
                      </div>

                      {!isExpanded &&
                        order.items.length > 2 && (
                          <button
                            type="button"
                            className="moreItems"
                            onClick={() =>
                              setExpanded((current) => ({
                                ...current,
                                [order.id]: true,
                              }))
                            }
                          >
                            + {order.items.length - 2} أصناف
                            إضافية
                          </button>
                        )}
                    </div>

                    {/* NOTE */}
                    {order.note && (
                      <div className="note">
                        <span>ملاحظة العميل</span>
                        <p>{order.note}</p>
                      </div>
                    )}

                    {/* TOTAL */}
                    <div className="totalRow">
                      <div>
                        <span>إجمالي الطلب</span>

                        <small>
                          شامل جميع الأصناف
                        </small>
                      </div>

                      <strong>
                        {money(order.totalAmount)}
                      </strong>
                    </div>

                    {/* ACTIONS */}
                    <div className="actions">
                      {order.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            className="action primary"
                            disabled={
                              updating === order.id
                            }
                            onClick={() =>
                              changeStatus(
                                order.id,
                                "PREPARING",
                              )
                            }
                          >
                            {updating === order.id
                              ? "جاري التحديث..."
                              : "بدء التحضير"}
                          </button>

                          <button
                            type="button"
                            className="action danger"
                            disabled={
                              updating === order.id
                            }
                            onClick={() =>
                              changeStatus(
                                order.id,
                                "CANCELLED",
                              )
                            }
                          >
                            إلغاء
                          </button>
                        </>
                      )}

                      {order.status === "PREPARING" && (
                        <>
                          <button
                            type="button"
                            className="action ready"
                            disabled={
                              updating === order.id
                            }
                            onClick={() =>
                              changeStatus(
                                order.id,
                                "READY",
                              )
                            }
                          >
                            {updating === order.id
                              ? "جاري التحديث..."
                              : "تحديد كجاهز"}
                          </button>

                          <button
                            type="button"
                            className="action danger"
                            disabled={
                              updating === order.id
                            }
                            onClick={() =>
                              changeStatus(
                                order.id,
                                "CANCELLED",
                              )
                            }
                          >
                            إلغاء
                          </button>
                        </>
                      )}

                      {order.status === "READY" && (
                        <button
                          type="button"
                          className="action ready full"
                          disabled={
                            updating === order.id
                          }
                          onClick={() =>
                            changeStatus(
                              order.id,
                              "COMPLETED",
                            )
                          }
                        >
                          {updating === order.id
                            ? "جاري التحديث..."
                            : "تم التسليم"}
                        </button>
                      )}

                      {order.status === "COMPLETED" && (
                        <div className="completed">
                          ✓ تم تسليم الطلب
                        </div>
                      )}

                      {order.status === "CANCELLED" && (
                        <div className="cancelled">
                          × تم إلغاء الطلب
                        </div>
                      )}
                    </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          <Link
            href="/cashier"
            className="bottomBack"
          >
            ← العودة إلى لوحة الكاشير
          </Link>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #090a0e !important;
        }

        body {
          color: #f5f7fb;
          font-family:
            Tahoma,
            Arial,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>

      <style jsx>{`
        .cashierPage {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(126, 87, 255, 0.08),
              transparent 25%
            ),
            #090a0e;
          padding: 26px 18px 60px;
        }

        .container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        /* HEADER */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 24px;
        }

        .kicker {
          color: #987cff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          margin-bottom: 9px;
        }

        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(27px, 4vw, 37px);
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .header p {
          margin: 9px 0 0;
          color: #7c8492;
          font-size: 13px;
          line-height: 1.8;
        }

        .dashboardButton {
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          border: 1px solid #282c36;
          border-radius: 12px;
          background: #12141a;
          color: #d9dde6;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          transition: 0.2s ease;
        }

        .dashboardButton:hover {
          background: #171920;
          border-color: #3a3e49;
          transform: translateY(-1px);
        }

        /* TOOLBAR */

        .toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 13px;
        }

        .searchBox {
          position: relative;
          flex: 1;
        }

        .searchBox input {
          width: 100%;
          height: 50px;
          padding: 0 43px 0 40px;
          border: 1px solid #252933;
          border-radius: 13px;
          outline: 0;
          background: #111319;
          color: #ffffff;
          font-size: 12px;
          transition: 0.2s ease;
        }

        .searchBox input::placeholder {
          color: #5f6673;
        }

        .searchBox input:focus {
          border-color: rgba(145, 111, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(145, 111, 255, 0.08);
        }

        .searchIcon {
          position: absolute;
          top: 50%;
          right: 14px;
          transform: translateY(-50%);
          color: #777f8d;
          font-size: 20px;
          pointer-events: none;
        }

        .clearButton {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 31px;
          height: 31px;
          border: 0;
          border-radius: 8px;
          background: #1b1e26;
          color: #a5adba;
          cursor: pointer;
          font-size: 17px;
        }

        .refreshButton {
          min-width: 91px;
          height: 50px;
          border: 1px solid #292d36;
          border-radius: 13px;
          background: #14161c;
          color: #dce0e7;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .refreshButton:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .refreshSpin {
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        /* FILTERS */

        .filters {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 11px;
          margin-bottom: 14px;
        }

        .filterCard {
          position: relative;
          min-height: 108px;
          padding: 15px;
          text-align: right;
          border: 1px solid #232731;
          border-radius: 16px;
          background: #111319;
          color: #fff;
          cursor: pointer;
          overflow: hidden;
          transition: 0.2s ease;
        }

        .filterCard:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
        }

        .filterCard.active {
          border-color: var(--accent);
          background:
            linear-gradient(
              145deg,
              var(--soft),
              #111319 70%
            );
          box-shadow:
            0 8px 30px rgba(0, 0, 0, 0.2),
            0 0 0 1px var(--accent);
        }

        .filterCard::after {
          content: "";
          position: absolute;
          right: 0;
          left: 0;
          bottom: 0;
          height: 3px;
          background: var(--accent);
          opacity: 0.9;
        }

        .filterTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .filterIcon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: var(--soft);
          color: var(--accent);
          font-size: 15px;
          font-weight: 950;
        }

        .selectedText {
          color: var(--accent);
          font-size: 9px;
          font-weight: 900;
        }

        .filterLabel {
          margin-top: 13px;
          color: #9aa1ae;
          font-size: 11px;
          font-weight: 800;
        }

        .filterCard strong {
          display: block;
          margin-top: 2px;
          color: #ffffff;
          font-size: 26px;
          line-height: 1.1;
          font-weight: 950;
        }

        /* SECTION */

        .sectionBar {
          min-height: 65px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 13px;
          padding: 12px 16px;
          border: 1px solid #20242c;
          border-radius: 15px;
          background: #0f1116;
        }

        .sectionBar h2 {
          margin: 0;
          color: #ffffff;
          font-size: 15px;
          font-weight: 950;
        }

        .sectionBar span {
          display: block;
          margin-top: 4px;
          color: #69717e;
          font-size: 10px;
        }

        .liveStatus {
          color: #66707e;
          font-size: 10px;
          display: flex !important;
          align-items: center;
          gap: 8px;
        }

        .liveStatus i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #31d48b;
          box-shadow: 0 0 0 4px rgba(49, 212, 139, 0.08);
        }

        /* ERROR */

        .errorBox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 13px;
          padding: 13px;
          border: 1px solid rgba(255, 77, 103, 0.22);
          border-radius: 14px;
          background: rgba(255, 77, 103, 0.06);
        }

        .errorBadge {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(255, 77, 103, 0.13);
          color: #ff91a0;
          font-weight: 950;
        }

        .errorBox strong {
          color: #ffd2d9;
          font-size: 11px;
        }

        .errorBox p {
          margin: 4px 0 0;
          color: #af7d86;
          font-size: 10px;
        }

        /* ORDERS */

        .orders {
          display: grid;
          gap: 14px;
        }

        .orderCard {
          position: relative;
          overflow: hidden;
          border: 1px solid #252933;
          border-radius: 18px;
          background: #111319;
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.16);
        }

        .statusLine {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 4px;
          background: var(--status);
        }

        .orderHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 17px 19px 14px;
          border-bottom: 1px solid #20232b;
        }

        .orderToggle {
          width: 100%;
          margin: 0;
          border: 0;
          border-radius: 0;
          color: inherit;
          background: transparent;
          font: inherit;
          text-align: right;
          cursor: pointer;
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .orderToggle:hover {
          background: rgba(255, 255, 255, 0.018);
        }

        .orderToggle:focus-visible {
          outline: 2px solid rgba(212, 175, 55, 0.72);
          outline-offset: -2px;
        }

        .orderHeaderSummary {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 9px;
          margin-inline-start: auto;
        }

        .headerStatusPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 26px;
          padding: 0 9px;
          border-radius: 999px;
          color: var(--status);
          background: var(--status-bg);
          border: 1px solid var(--status-border);
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .headerStatusPill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--status);
          box-shadow: 0 0 0 3px var(--status-bg);
        }

        .headerTotal {
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .orderToggleHint {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #9aa1ad;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          font-size: 18px;
          line-height: 1;
          transform: rotate(0deg);
          transition: transform 180ms ease;
        }

        .chevron.open {
          transform: rotate(90deg);
        }

        .orderDetails {
          border-top: 0;
        }

        .orderIdentity {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .orderNumberBadge {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: var(--status);
          background: var(--status-bg);
          border: 1px solid var(--status-border);
          font-size: 15px;
          font-weight: 950;
        }

        .smallLabel {
          color: #68707d;
          font-size: 9px;
          font-weight: 700;
        }

        .orderNumber {
          margin-top: 3px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 0.05em;
        }

        .orderTime {
          text-align: left;
        }

        .orderTime strong {
          display: block;
          color: #ffffff;
          font-size: 13px;
          font-weight: 950;
        }

        .orderTime span {
          display: block;
          margin-top: 4px;
          color: #69717e;
          font-size: 9px;
        }

        .statusRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 19px 0;
        }

        .statusPill {
          min-height: 31px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 10px;
          background: var(--status-bg);
          border: 1px solid var(--status-border);
          color: var(--status);
          font-size: 10px;
          font-weight: 900;
        }

        .statusPill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--status);
        }

        .orderDate {
          color: #606876;
          font-size: 9px;
        }

        .mainInfo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
          padding: 13px 19px;
        }

        .mainInfoCard {
          min-height: 91px;
          padding: 13px;
          border: 1px solid #20242d;
          border-radius: 13px;
          background: #0d0f13;
        }

        .mainInfoCard.location {
          border-color: rgba(155, 123, 255, 0.2);
          background: rgba(155, 123, 255, 0.05);
        }

        .infoTitle {
          display: block;
          color: #6b7380;
          font-size: 9px;
          font-weight: 700;
        }

        .mainInfoCard strong {
          display: block;
          margin-top: 8px;
          color: #f8fafc;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 950;
        }

        .customer .phone {
          display: block;
          margin-top: 5px;
          color: #858d9b;
          font-size: 10px;
          direction: ltr;
          text-align: right;
        }

        .location strong {
          color: #d9ceff;
        }

        .locationHint {
          display: block;
          margin-top: 5px;
          color: #8879b8;
          font-size: 9px;
        }

        /* ITEMS */

        .itemsSection {
          padding: 0 19px;
        }

        .itemsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        .itemsHeader h3 {
          margin: 0;
          color: #f4f6f9;
          font-size: 12px;
          font-weight: 950;
        }

        .itemsHeader span {
          display: block;
          margin-top: 3px;
          color: #656d79;
          font-size: 9px;
        }

        .detailsButton {
          border: 0;
          background: transparent;
          color: #9c83ee;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .itemsList {
          display: grid;
          gap: 7px;
        }

        .item {
          min-height: 53px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 11px;
          border: 1px solid #1e2229;
          border-radius: 10px;
          background: #0d0f13;
        }

        .itemLeft {
          min-width: 0;
        }

        .itemName {
          color: #e3e7ed;
          font-size: 11px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .itemMeta {
          margin-top: 4px;
          color: #646d7b;
          font-size: 9px;
        }

        .itemTotal {
          color: #ffffff;
          font-size: 11px;
          white-space: nowrap;
        }

        .moreItems {
          width: 100%;
          height: 33px;
          margin-top: 7px;
          border: 1px dashed #2b2f38;
          border-radius: 9px;
          background: #111319;
          color: #7e8794;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
        }

        .moreItems:hover {
          color: #aab1bc;
          background: #15181e;
        }

        /* NOTE */

        .note {
          margin: 13px 19px 0;
          padding: 10px 12px;
          border: 1px solid rgba(245, 196, 81, 0.16);
          border-radius: 11px;
          background: rgba(245, 196, 81, 0.05);
        }

        .note span {
          color: #e3c66d;
          font-size: 9px;
          font-weight: 900;
        }

        .note p {
          margin: 4px 0 0;
          color: #a39875;
          font-size: 10px;
          line-height: 1.7;
        }

        /* TOTAL */

        .totalRow {
          margin: 14px 19px 0;
          padding: 14px 0 0;
          border-top: 1px solid #20242b;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .totalRow span {
          display: block;
          color: #717985;
          font-size: 10px;
          font-weight: 800;
        }

        .totalRow small {
          display: block;
          margin-top: 3px;
          color: #4e5663;
          font-size: 8px;
        }

        .totalRow strong {
          color: #ffffff;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        /* ACTIONS */

        .actions {
          display: flex;
          gap: 8px;
          margin: 14px 19px 18px;
        }

        .action {
          flex: 1;
          min-height: 44px;
          border-radius: 11px;
          border: 0;
          cursor: pointer;
          font-size: 10px;
          font-weight: 950;
          transition: 0.18s ease;
        }

        .action:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.07);
        }

        .action:disabled {
          opacity: 0.45;
          cursor: wait;
        }

        .primary {
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #8f64ff,
            #6f43ea
          );
          box-shadow: 0 10px 24px rgba(111, 67, 234, 0.18);
        }

        .ready {
          color: #04130c;
          background: #31d48b;
          box-shadow: 0 10px 24px rgba(49, 212, 139, 0.12);
        }

        .danger {
          color: #ff9aaa;
          background: rgba(255, 77, 103, 0.08);
          border: 1px solid rgba(255, 77, 103, 0.18);
        }

        .full {
          width: 100%;
        }

        .completed,
        .cancelled {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          font-size: 10px;
          font-weight: 950;
        }

        .completed {
          background: rgba(155, 123, 255, 0.09);
          border: 1px solid rgba(155, 123, 255, 0.18);
          color: #b8a5ff;
        }

        .cancelled {
          background: rgba(141, 149, 165, 0.07);
          border: 1px solid rgba(141, 149, 165, 0.15);
          color: #929aa8;
        }

        /* BOTTOM */

        .bottomBack {
          display: flex;
          justify-content: center;
          margin-top: 22px;
          color: #525a67;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
        }

        .bottomBack:hover {
          color: #858e9c;
        }

        /* STATES */

        .loading,
        .empty {
          min-height: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid #20242c;
          border-radius: 18px;
          background: #111319;
        }

        .loader {
          width: 35px;
          height: 35px;
          margin-bottom: 12px;
          border-radius: 50%;
          border: 3px solid #282c35;
          border-top-color: #9b7bff;
          animation: spin 0.8s linear infinite;
        }

        .emptyIcon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 13px;
          border-radius: 16px;
          background: #171a20;
          color: #717988;
          font-size: 20px;
        }

        .empty strong,
        .loading strong {
          color: #ffffff;
          font-size: 13px;
          font-weight: 950;
        }

        .empty p,
        .loading span {
          max-width: 420px;
          margin: 6px 0 0;
          color: #66707e;
          font-size: 10px;
          line-height: 1.7;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* TABLET */

        @media (max-width: 800px) {
          .filters {
            grid-template-columns: repeat(2, 1fr);
          }

          .header {
            align-items: stretch;
            flex-direction: column;
          }

          .dashboardButton {
            width: 100%;
          }
        }

        /* MOBILE */

        @media (max-width: 600px) {
          .cashierPage {
            padding: 16px 10px 42px;
          }

          .header {
            gap: 13px;
            margin-bottom: 16px;
          }

          .header h1 {
            font-size: 27px;
          }

          .header p {
            font-size: 11px;
          }

          .toolbar {
            flex-direction: column;
          }

          .refreshButton {
            width: 100%;
          }

          .filters {
            gap: 8px;
          }

          .filterCard {
            min-height: 94px;
            padding: 12px;
          }

          .filterCard strong {
            font-size: 24px;
          }

          .sectionBar {
            min-height: auto;
            align-items: flex-start;
            flex-direction: column;
          }

          .liveStatus {
            margin-top: 3px;
          }

          .orderHeader {
            padding: 14px;
          }

          .statusRow {
            padding: 11px 14px 0;
          }

          .mainInfo {
            grid-template-columns: 1fr;
            padding: 12px 14px;
          }

          .itemsSection {
            padding: 0 14px;
          }

          .note {
            margin-left: 14px;
            margin-right: 14px;
          }

          .totalRow {
            margin-left: 14px;
            margin-right: 14px;
          }

          .actions {
            margin-left: 14px;
            margin-right: 14px;
            flex-direction: column;
          }

          .action {
            width: 100%;
            flex: none;
          }
        }

        @media (max-width: 390px) {
          .filterLabel {
            font-size: 10px;
          }

          .filterCard strong {
            font-size: 22px;
          }

          .orderNumber {
            font-size: 13px;
          }

          .totalRow strong {
            font-size: 17px;
          }
        }
      `}</style>
    </>
  );
}

function Loading() {
  return (
    <div className="loading">
      <div className="loader" />

      <strong>جاري تحميل الطلبات</strong>

      <span>
        يتم تحديث الطلبات تلقائيًا كل 5 ثوانٍ.
      </span>
    </div>
  );
}

function Empty({
  filter,
  hasSearch,
}: {
  filter: Filter;
  hasSearch: boolean;
}) {
  let title = "لا توجد طلبات حاليًا";

  if (filter === "PENDING") {
    title = "لا توجد طلبات جديدة";
  }

  if (filter === "PREPARING") {
    title = "لا توجد طلبات قيد التحضير";
  }

  if (filter === "READY") {
    title = "لا توجد طلبات جاهزة";
  }

  return (
    <div className="empty">
      <div className="emptyIcon">◎</div>

      <strong>{title}</strong>

      <p>
        {hasSearch
          ? "جرّب تغيير كلمة البحث أو اختيار فلتر آخر."
          : "أي طلب جديد راح يظهر هنا تلقائيًا."}
      </p>
    </div>
  );
}