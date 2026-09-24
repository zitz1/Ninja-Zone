import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { getServicesFromDb } from "@/lib/services-db";
import { formatIQD, formatResourceCount } from "@/lib/services";

export default async function Home() {
  const SERVICES = await getServicesFromDb();

  return (
    <CustomerShell>
      <main className="nz-home">
        <section className="nz-container nz-home-hero" style={{ display: "flex", justifyContent: "flex-end" }}>
          <img className="nz-hero-image" src="/hero-gaming.jpg" alt="Ninja Zone Gaming Center" />
          <div className="nz-hero-shade" />
          <div className="nz-hero-content" style={{ margin: "0 auto 0 0", textAlign: "right" }}>
            <span className="nz-hero-kicker">تجربة لعب استثنائية في الرمادي</span>
            <h1>مرحباً بك في<br /><span>Ninja Zone</span></h1>
            <p>اختار القسم، حدد وقت حضورك، واختار جهازك بنفسك. حجز واضح وسريع من أول خطوة.</p>
            <div className="nz-hero-actions">
              <Link className="nz-btn nz-btn-primary" href="/sections">احجز الآن <span>↗</span></Link>
              <Link className="nz-btn nz-btn-dark" href="/sections">استكشف الأقسام <span>▦</span></Link>
            </div>
          </div>
        </section>

        <section className="nz-container nz-stat-strip">
          <div><span>◈</span><b>دعم سريع</b><small>24/7</small></div>
          <div><span>✦</span><b>أعلى تقييم</b><small>4.9 / 5</small></div>
          <div><span>◷</span><b>ساعات العمل</b><small>10 AM — 3 AM</small></div>
          <div><span>◉</span><b>أحدث الأجهزة</b><small>PC • PS5 • Cinema</small></div>
          <div><span>✓</span><b>حجز مرن</b><small>ابتداءً من 30 دقيقة</small></div>
        </section>

        <section className="nz-container nz-section">
          <div className="nz-section-heading">
            <div><span className="nz-label">EXPLORE SERVICES</span><h2>الأقسام <span>المتاحة</span></h2></div>
            <Link href="/sections" className="nz-outline-link">عرض الكل ←</Link>
          </div>

          <div className="nz-category-grid">
            {SERVICES.map((service) => (
              <Link href={`/book/${service.type}`} key={service.type} className={`nz-category-card tone-${service.tone}`}>
                <div className="nz-category-image">
                  <img src={service.image} alt={service.arTitle} />
                  {/* الباج الصحيح على اليمين وبدقة تامة */}
                  <div className="nz-category-badge">
                    {formatResourceCount(service.count, service.type)}
                  </div>
                </div>
                <div className="nz-category-body">
                  <div><strong>{service.arTitle}</strong><small>{service.description}</small></div>
                  <div className="nz-category-price"><b>{formatIQD(service.price)}</b><span>/ ساعة</span></div>
                </div>
                <div className="nz-category-bottom"><span>احجز الآن</span><i>↗</i></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="nz-container nz-why-strip">
          <div><span>♢</span><strong>أمان عالي</strong><small>أنظمة حماية ومراقبة</small></div>
          <div><span>⌁</span><strong>إنترنت فائق السرعة</strong><small>اتصال سريع ومستقر</small></div>
          <div><span>♧</span><strong>دعم فني 24/7</strong><small>فريق جاهز دائمًا</small></div>
          <div><span>◈</span><strong>مواقف مجانية</strong><small>متاحة لجميع الزوار</small></div>
        </section>
      </main>
    </CustomerShell>
  );
}