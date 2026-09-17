import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { getServicesFromDb } from "@/lib/services-db";
import { formatIQD } from "@/lib/services";

export default async function SectionsPage() {
  const SERVICES = await getServicesFromDb();

  return (
    <CustomerShell>
      <main className="nz-container nz-sections-page">
        <header className="nz-sections-heading">
          <div>
            <span className="nz-section-kicker">NINJA ZONE / SECTIONS</span>
            <h1><i /> الأقسام الرئيسية</h1>
            <p>اختر القسم الذي يناسبك واستمتع بتجربة لا تُنسى</p>
          </div>
          <Link href="/" className="nz-outline-link">← الرئيسية</Link>
        </header>

        <div className="nz-reference-grid">
          {SERVICES.map((s) => (
            <Link href={`/book/${s.type}`} key={s.type} className={`nz-reference-card tone-${s.tone}`}>
              <div className="nz-reference-image">
                <img src={s.image} alt={s.arTitle} />
              </div>
              <div className="nz-reference-body">
                <div>
                  <h2>{s.arTitle}</h2>
                  <p>{s.description}</p>
                </div>
                <div className="nz-reference-price">
                  {s.type === "PC_MASTER" && <del>5,000 د.ع</del>}
                  <strong>{formatIQD(s.price)}</strong><span>/ ساعة</span>
                </div>
                <div className="nz-reference-action">احجز الآن <span>←</span></div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </CustomerShell>
  );
}
