"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function playDashboardAlert() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    //
  }
}

export default function CashierDashboard() {
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const prevCount = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkLiveOrders() {
      try {
        const res = await fetch("/api/menu/orders?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.orders)) {
          const count = data.orders.filter((o: { status: string }) => o.status === "PENDING").length;
          if (prevCount.current !== null && count > prevCount.current) {
            playDashboardAlert();
          }
          prevCount.current = count;
          if (mounted) setPendingOrdersCount(count);
        }
      } catch {
        //
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    checkLiveOrders();
    const timer = setInterval(checkLiveOrders, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // منع الشاشة البيضاء تماماً وعرض مؤشر تحميل أنيق
  if (!isReady) {
    return (
      <main className="page" dir="rtl" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#8b5cf6", fontSize: "14px", fontWeight: "bold" }}>جاري تحميل لوحة الكاشير...</div>
      </main>
    );
  }

  return (
    <main className="page" dir="rtl">
      {/* الشريط العلوي البسيط */}
      <div className="top">
        <div>
          <span className="eyebrow">
            NINJA ZONE
          </span>
          <h1>لوحة الكاشير</h1>
        </div>

        <Link href="/" className="backButton">
          <span>→</span>
          الرئيسية
        </Link>
      </div>

      {/* تنبيه بارز في حال وجود طلبات معلقة */}
      {pendingOrdersCount > 0 && (
        <div className="alertNotice">
          <span className="alertBell">🔔</span>
          <div>
            <strong>يوجد {pendingOrdersCount} طلبات جديدة بانتظار التأكيد!</strong>
            <p>اضغط على كارت الطلبات والتسليم للبدء بالتحضير فوراً.</p>
          </div>
          <Link href="/cashier/orders" className="alertAction">
            معاينة الطلبات ←
          </Link>
        </div>
      )}

      {/* الهيرو الاحترافي الجديد (Dashboard Header) */}
      <section className="dashboardHeader">
        <div className="headerMain">
          <div className="statusBadge">
            <span className="pulse"></span>
            نظام الكاشير متصل وجاهز للاستقبال
          </div>
          <h2>
            أهلاً بك، <span>جاهز لمتابعة المركز؟</span>
          </h2>
          <p>
            هذه المساحة مخصصة لك لإدارة حركة الجلسات، تنفيذ طلبات المنيو، وتنبيهك تلقائياً عند ورود أي حجز أو طلب.
          </p>
        </div>

        <div className="headerStats">
          <div className="statItem">
            <span className="statIcon">◷</span>
            <div className="statInfo">
              <span className="statValue">ساعات العمل</span>
              <span className="statDesc">10 ص - 3 ف</span>
            </div>
          </div>
          <div className="statSeparator"></div>
          <div className="statItem">
            <span className="statIcon">◎</span>
            <div className="statInfo">
              <span className="statValue">الطلبات المعلقة</span>
              <span className="statDesc" style={{ color: pendingOrdersCount > 0 ? "#ff4d67" : "#34d399", fontWeight: 700 }}>
                {pendingOrdersCount > 0 ? `${pendingOrdersCount} طلب جديد` : "لا توجد طلبات معلقة"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* قسم الكروت */}
      <section className="section">
        <div className="sectionHeader">
          <h2>أدوات الإدارة</h2>
        </div>

        <div className="cards">
          {/* ORDERS */}
          <Link href="/cashier/orders" className="mainCard">
            <div className="cardHeader">
              <div className="cardIcon ordersIcon">▣</div>
              {pendingOrdersCount > 0 && (
                <span className="badgeCount">{pendingOrdersCount} جديد</span>
              )}
              <span className="cardArrow">←</span>
            </div>
            <div className="cardBody">
              <h3>الطلبات والتسليم</h3>
              <p>إدارة طلبات المنيو، متابعة التحضير، وتسليم الطلبات للعملاء في الوقت المحدد.</p>
            </div>
          </Link>

          {/* BOOKINGS */}
          <Link href="/cashier/bookings" className="mainCard">
            <div className="cardHeader">
              <div className="cardIcon bookingsIcon">◷</div>
              <span className="cardArrow">←</span>
            </div>
            <div className="cardBody">
              <h3>إدارة الحجوزات</h3>
              <p>متابعة الجلسات الحالية، تأكيد الحجوزات الجديدة، وتخصيص الأجهزة للعملاء.</p>
            </div>
          </Link>

          {/* PAYMENTS */}
          <Link href="/cashier/payments" className="mainCard">
            <div className="cardHeader">
              <div className="cardIcon paymentsIcon">◆</div>
              <span className="cardArrow">←</span>
            </div>
            <div className="cardBody">
              <h3>المدفوعات والفواتير</h3>
              <p>إصدار الفواتير، متابعة الإيرادات النقدية، ومراجعة العمليات المالية اليومية.</p>
            </div>
          </Link>
        </div>
      </section>

      <div className="footerNav">
        <Link href="/" className="homeLink">
          <span>→</span>
          العودة إلى الرئيسية
        </Link>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page {
    min-height: 100vh;
    padding: 40px 24px 80px;
    background-color: #050508;
    color: #e2e8f0;
    font-family: Tahoma, Arial, "Segoe UI", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .top {
    width: min(1050px, 100%);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24px;
  }

  .eyebrow {
    display: block;
    color: #8b5cf6;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    margin-bottom: 8px;
  }

  .top h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    color: #f8fafc;
    letter-spacing: -0.02em;
  }

  .backButton {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: transparent;
    border: 1px solid #1e293b;
    border-radius: 8px;
    color: #94a3b8;
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .backButton:hover {
    background: #0f172a;
    color: #f8fafc;
    border-color: #334155;
  }

  /* تنبيه الطلبات المعلقة */
  .alertNotice {
    width: min(1050px, 100%);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.08));
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 14px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.1);
  }

  .alertBell {
    font-size: 24px;
    animation: bounce 1s infinite alternate;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-4px); }
  }

  .alertNotice strong {
    display: block;
    color: #fca5a5;
    font-size: 14px;
  }

  .alertNotice p {
    margin: 3px 0 0;
    color: #cbd5e1;
    font-size: 12px;
  }

  .alertAction {
    margin-inline-start: auto;
    padding: 8px 16px;
    background: #ef4444;
    color: #fff;
    border-radius: 8px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    transition: background 0.2s ease;
  }

  .alertAction:hover {
    background: #dc2626;
  }

  .dashboardHeader {
    width: min(1050px, 100%);
    background: #0a0b10;
    border: 1px solid #161822;
    border-radius: 16px;
    padding: 32px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 48px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  }

  .headerMain {
    max-width: 550px;
  }

  .statusBadge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 6px;
    color: #34d399;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .pulse {
    width: 6px;
    height: 6px;
    background-color: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

  .dashboardHeader h2 {
    font-size: 26px;
    font-weight: 800;
    margin: 0 0 12px 0;
    color: #ffffff;
  }

  .dashboardHeader h2 span {
    color: #94a3b8;
    font-weight: 600;
  }

  .dashboardHeader p {
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }

  .headerStats {
    display: flex;
    align-items: center;
    background: #0d0f16;
    border: 1px solid #1c1f2e;
    border-radius: 12px;
    padding: 20px 28px;
    gap: 24px;
  }

  .statItem {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .statIcon {
    width: 36px;
    height: 36px;
    background: #151824;
    border: 1px solid #232738;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8b5cf6;
    font-size: 16px;
  }

  .statInfo {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .statValue {
    color: #f8fafc;
    font-size: 13px;
    font-weight: 700;
  }

  .statDesc {
    color: #64748b;
    font-size: 11px;
  }

  .statSeparator {
    width: 1px;
    height: 32px;
    background: #1c1f2e;
  }

  .section {
    width: min(1050px, 100%);
  }

  .sectionHeader h2 {
    font-size: 18px;
    font-weight: 800;
    color: #e2e8f0;
    margin: 0 0 24px 0;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .mainCard {
    background: #0a0b10;
    border: 1px solid #161822;
    border-radius: 16px;
    padding: 28px;
    text-decoration: none;
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .mainCard:hover {
    background: #0c0e15;
    border-color: #2a2f42;
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .cardHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .badgeCount {
    background: #ef4444;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 999px;
  }

  .cardIcon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .ordersIcon { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
  .bookingsIcon { background: rgba(168, 85, 247, 0.1); color: #c084fc; }
  .paymentsIcon { background: rgba(16, 185, 129, 0.1); color: #34d399; }

  .cardArrow {
    color: #475569;
    font-size: 16px;
    transition: transform 0.2s ease, color 0.2s ease;
  }

  .mainCard:hover .cardArrow {
    color: #8b5cf6;
    transform: translateX(-4px);
  }

  .cardBody h3 {
    font-size: 16px;
    font-weight: 800;
    color: #f8fafc;
    margin: 0 0 10px 0;
  }

  .cardBody p {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .footerNav {
    width: min(1050px, 100%);
    margin-top: 60px;
    display: flex;
    justify-content: center;
  }

  .homeLink {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #64748b;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .homeLink:hover {
    color: #e2e8f0;
  }

  @media (max-width: 950px) {
    .dashboardHeader {
      flex-direction: column;
      align-items: flex-start;
      gap: 32px;
      padding: 28px;
    }
    
    .headerStats {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    .cards {
      grid-template-columns: 1fr;
    }

    .top {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .headerStats {
      flex-direction: column;
      align-items: stretch;
      padding: 16px;
      gap: 16px;
    }

    .statSeparator {
      width: 100%;
      height: 1px;
    }
  }
`;