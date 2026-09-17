"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

type Service = {
  id: string;
  resourceType: string;
  pricePerHour: number;
  minMinutes: number;
  active: boolean;
  displayName: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  deviceCount: number;
};

type EditForm = {
  resourceType: string;
  displayName: string;
  description: string;
  imageUrl: string;
  pricePerHour: number;
  sortOrder: number;
  active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  PC_NORMAL: "PC عادي",
  PC_MASTER: "PC VIP",
  PS5: "PlayStation 5",
  CINEMA: "سينما",
  BILLIARD: "بليارد",
  TABLE: "طاولات",
};

const money = (value: number) =>
  `${new Intl.NumberFormat("ar-IQ").format(value)} د.ع`;

export default function AdminServicesPage() {
  const [data, setData] = useState<Service[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/services", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر تحميل الأقسام.");
      setData(result.services ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الأقسام.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر حفظ التغييرات.");
      setEdit(null);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التغييرات.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <main className="page" dir="rtl">
          <div className="center">
            <div className="loader" />
            <strong>جاري تحميل الأقسام</strong>
            <span>يتم جلب بيانات الأقسام...</span>
          </div>
          <style jsx>{styles}</style>
        </main>
      </AdminShell>
    );
  }

  if (!data) {
    return (
      <AdminShell>
        <main className="page" dir="rtl">
          <div className="center">
            <strong>تعذر تحميل الأقسام</strong>
            <span>{error || "حدث خطأ غير متوقع."}</span>
            <button className="primary" onClick={() => load(true)}>
              إعادة المحاولة
            </button>
          </div>
          <style jsx>{styles}</style>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="page" dir="rtl">
        <div className="container">
          <header className="header">
            <div>
              <div className="eyebrow">NINJA ZONE / SERVICES</div>
              <h1>إدارة الأقسام</h1>
              <p>تعديل أسماء الأقسام والوصف والصور والأسعار والترتيب والتفعيل.</p>
            </div>
            <div className="headerActions">
              <button className="ghost" disabled={refreshing} onClick={() => load(true)}>
                <span className={refreshing ? "spin" : ""}>↻</span> تحديث
              </button>
            </div>
          </header>

          {error && (
            <div className="errorBanner">
              <b>تنبيه</b>
              <span>{error}</span>
            </div>
          )}

          <section className="servicesGrid">
            {data.length === 0 ? (
              <div className="panel empty">لا توجد أقسام مسجلة.</div>
            ) : (
              data.map((service) => (
                <article className={`panel serviceCard ${!service.active ? "inactive" : ""}`} key={service.id}>
                  <div className="serviceTop">
                    <div className="serviceImage">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.displayName || service.resourceType} />
                      ) : (
                        <span>?</span>
                      )}
                    </div>
                    <div className="serviceIdentity">
                      <strong>{service.displayName || TYPE_LABELS[service.resourceType] || service.resourceType}</strong>
                      <span>{service.resourceType}</span>
                    </div>
                    <em className={`badge ${service.active ? "active" : "inactive"}`}>
                      <i />
                      {service.active ? "مفعل" : "معطل"}
                    </em>
                  </div>

                  <p className="serviceDesc">{service.description || "بدون وصف"}</p>

                  <div className="serviceMeta">
                    <div>
                      <span>السعر</span>
                      <b>{money(service.pricePerHour)} / ساعة</b>
                    </div>
                    <div>
                      <span>الأجهزة</span>
                      <b>{service.deviceCount} جهاز</b>
                    </div>
                    <div>
                      <span>الترتيب</span>
                      <b>{service.sortOrder}</b>
                    </div>
                  </div>

                  <button
                    className="editBtn"
                    onClick={() =>
                      setEdit({
                        resourceType: service.resourceType,
                        displayName: service.displayName ?? "",
                        description: service.description ?? "",
                        imageUrl: service.imageUrl ?? "",
                        pricePerHour: service.pricePerHour,
                        sortOrder: service.sortOrder,
                        active: service.active,
                      })
                    }
                  >
                    تعديل القسم
                  </button>
                </article>
              ))
            )}
          </section>
        </div>

        {edit && (
          <div className="backdrop">
            <div className="modal" role="dialog" aria-modal="true">
              <div className="modalHead">
                <div>
                  <div className="eyebrow">EDIT SERVICE</div>
                  <h2>تعديل قسم {TYPE_LABELS[edit.resourceType] || edit.resourceType}</h2>
                </div>
                <button className="close" onClick={() => !saving && setEdit(null)}>
                  ×
                </button>
              </div>
              <div className="form">
                <label>
                  اسم القسم (يظهر للعملاء)
                  <input
                    value={edit.displayName}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, displayName: e.target.value })}
                  />
                </label>
                <label>
                  الوصف
                  <textarea
                    value={edit.description}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                    rows={3}
                  />
                </label>
                <label>
                  رابط الصورة
                  <input
                    value={edit.imageUrl}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })}
                    placeholder="/reference-cards/ps5.jpg"
                    dir="ltr"
                  />
                </label>
                <label>
                  السعر للساعة (د.ع)
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={edit.pricePerHour}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, pricePerHour: Number(e.target.value) })}
                  />
                </label>
                <label>
                  ترتيب العرض
                  <input
                    type="number"
                    min={0}
                    value={edit.sortOrder}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })}
                  />
                </label>
                <div className="switchRow">
                  <div>
                    <strong>القسم مفعل</strong>
                    <small>المعطل لا يظهر للعملاء في الموقع.</small>
                  </div>
                  <button
                    className={`switch ${edit.active ? "on" : ""}`}
                    disabled={saving}
                    onClick={() => setEdit({ ...edit, active: !edit.active })}
                  >
                    <i />
                  </button>
                </div>
              </div>
              <div className="modalActions">
                <button className="ghost" disabled={saving} onClick={() => setEdit(null)}>
                  إلغاء
                </button>
                <button className="primary" disabled={saving} onClick={save}>
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{styles}</style>
      </main>
    </AdminShell>
  );
}

const styles = `
*{box-sizing:border-box}.page{min-height:100vh;padding:30px 18px 70px;background:radial-gradient(circle at 90% 0%,rgba(139,92,246,.11),transparent 25%),#08090d;color:#f5f7fb;font-family:Tahoma,Arial,"Segoe UI",sans-serif}.container{width:min(1320px,100%);margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}.eyebrow{color:#9d82ff;font-size:10px;font-weight:900;letter-spacing:.15em;margin-bottom:8px}.header h1{margin:0;font-size:clamp(29px,4vw,42px);font-weight:950;letter-spacing:-.045em}.header p{margin:8px 0 0;color:#69717e;font-size:12px}.headerActions{display:flex;gap:8px}.ghost,.primary,.editBtn,.close{border:1px solid #282e38;background:#12151b;color:#e8ebf1;border-radius:11px;min-height:42px;padding:0 13px;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px}.primary{background:#8d69f2;border-color:#8d69f2}.ghost:disabled,.primary:disabled{opacity:.5;cursor:wait}.errorBanner{display:flex;gap:8px;padding:12px 14px;margin-bottom:13px;border:1px solid rgba(255,77,103,.2);border-radius:12px;background:rgba(255,77,103,.06);color:#efb7c1;font-size:10px}.panel{border:1px solid #212630;background:#101218;border-radius:17px}.servicesGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.serviceCard{padding:17px;position:relative;overflow:hidden}.serviceCard.inactive{opacity:.6}.serviceTop{display:flex;align-items:center;gap:10px}.serviceIcon,.serviceTop .serviceIcon{width:56px;height:42px;border-radius:11px;background:rgba(155,123,255,.1);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.serviceIcon img{width:100%;height:100%;object-fit:cover}.serviceIcon span{color:#b8aaff;font-size:12px;font-weight:950}.serviceIdentity{flex:1;min-width:0}.serviceIdentity strong,.serviceIdentity span{display:block}.serviceIdentity strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.serviceIdentity span{margin-top:3px;color:#596270;font-size:8px}.badge{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;font-style:normal;font-size:7px;font-weight:950;white-space:nowrap}.badge i{width:5px;height:5px;border-radius:50%;background:currentColor}.badge.active{color:#67e1a8;background:rgba(49,212,139,.08)}.badge.inactive{color:#8d95a5;background:rgba(141,149,165,.08)}.serviceDesc{margin:12px 0 0;color:#69717e;font-size:9px;line-height:1.7;min-height:30px}.serviceMeta{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.serviceMeta>div{padding:9px;border:1px solid #1d222a;border-radius:9px;background:#0b0d11}.serviceMeta span,.serviceMeta b{display:block}.serviceMeta span{color:#515a67;font-size:7px}.serviceMeta b{margin-top:4px;color:#c9ced6;font-size:9px}.editBtn{margin-top:14px;width:100%;min-height:36px;background:#11141a;border-color:#252a33;font-size:9px;color:#bfafff;border-color:rgba(155,123,255,.23)}.empty{min-height:220px;display:flex;align-items:center;justify-content:center;color:#5b6471;font-size:10px}.backdrop{position:fixed;inset:0;z-index:50;background:rgba(4,5,8,.75);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:12px}.modal{width:min(520px,100%);max-height:88vh;overflow:auto;padding:18px;border:1px solid #2a303a;border-radius:18px;background:#11141a;box-shadow:0 25px 90px rgba(0,0,0,.45)}.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px}.modalHead h2{margin:0;font-size:14px;font-weight:950}.close{width:35px;height:35px;padding:0;font-size:20px}.form{display:grid;gap:12px;margin-top:18px}.form label{display:grid;gap:6px;color:#747d89;font-size:9px;font-weight:900}.form input,.form textarea{width:100%;min-height:43px;padding:0 11px;border:1px solid #242934;border-radius:10px;background:#0b0d11;color:#eef1f5;outline:none;font:inherit;font-size:10px}.form textarea{padding:10px 11px;min-height:80px;resize:vertical}.form input:focus,.form textarea:focus{border-color:#8b6cf0}.switchRow{display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #20252d;border-radius:10px;background:#0d0f13}.switchRow strong,.switchRow small{display:block}.switchRow strong{font-size:10px}.switchRow small{margin-top:4px;color:#606975;font-size:8px}.switch{width:48px;height:28px;padding:3px;border:0;border-radius:999px;background:#2a2f38;cursor:pointer}.switch i{display:block;width:22px;height:22px;border-radius:50%;background:#89909a;transition:.18s}.switch.on{background:#8767ea}.switch.on i{transform:translateX(-20px);background:#fff}.switch:disabled{opacity:.45;cursor:not-allowed}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.center{min-height:85vh;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:7px}.center span{color:#68717e;font-size:10px}.loader{width:40px;height:40px;margin-bottom:8px;border:3px solid #2b3039;border-top-color:#9574f4;border-radius:50%;animation:spin .8s linear infinite}.spin{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.servicesGrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:650px){.page{padding:18px 10px 40px}.header{flex-direction:column;align-items:stretch}.headerActions{display:grid;grid-template-columns:1fr 1fr}.headerActions>*{width:100%}.servicesGrid{grid-template-columns:1fr}.modal{padding:15px}}
`;