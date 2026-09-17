"use client";

import Link from "next/link";

export default function CashierDashboard() {
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

      {/* الهيرو الاحترافي الجديد (Dashboard Header) */}
      <section className="dashboardHeader">
        <div className="headerMain">
          <div className="statusBadge">
            <span className="pulse"></span>
            نظام الكاشير متصل
          </div>
          <h2>
            أهلاً بك، <span>جاهز لاستقبال الطلبات؟</span>
          </h2>
          <p>
            هذه المساحة مخصصة لك لإدارة حركة الجلسات، تنفيذ طلبات المنيو، ومتابعة المدفوعات بدقة وسرعة.
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
              <span className="statValue">حالة المركز</span>
              <span className="statDesc">مفتوح الآن</span>
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

  /* الشريط العلوي */
  .top {
    width: min(1050px, 100%);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 32px;
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

  /* الهيرو الاحترافي (Dashboard Header) */
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

  /* الكروت */
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
    align-items: flex-start;
    margin-bottom: 24px;
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

  /* ريسبونسف (شاشات الموبايل) */
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