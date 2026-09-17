"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

type Resource = {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { bookingItems: number; Session: number };
};

type ApiData = {
  resources: Resource[];
  summary: { total: number; allActive: number; available: number; reserved: number; playing: number; maintenance: number; disabled: number };
  typeCounts: Record<string, number>;
};

type EditForm = { id: string; name: string; code: string; type: string; status: string; isActive: boolean };

const TYPES = [
  ["ALL", "الكل"], ["PC_NORMAL", "PC عادي"], ["PC_MASTER", "PC VIP"],
  ["PS5", "PS5"], ["CINEMA", "Cinema"], ["BILLIARD", "بليارد"], ["TABLE", "طاولات"],
] as const;

const TYPE_LABELS: Record<string, string> = {
  PC_NORMAL: "PC عادي", PC_MASTER: "PC VIP", PS5: "PS5", CINEMA: "Cinema", BILLIARD: "بليارد", TABLE: "طاولات",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "متاح", RESERVED: "محجوز", PLAYING: "جاري اللعب", MAINTENANCE: "صيانة", DISABLED: "معطل",
};

function statusClass(status: string) { return status.toLowerCase(); }
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baghdad" }).format(new Date(value));
}

export default function AdminResourcesPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/resources?${params}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر تحميل الأجهزة.");
      setData(result); setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الأجهزة.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => load(), 5000);
    return () => window.clearInterval(interval);
  }, [load]);

  const groups = useMemo(() => {
    if (!data) return [] as [string, Resource[]][];
    const map: Record<string, Resource[]> = {};
    for (const r of data.resources) (map[r.type] ??= []).push(r);
    return Object.entries(map);
  }, [data]);

  function openEdit(r: Resource, quickStatus?: string) {
    setEdit({ id: r.id, name: r.name, code: r.code, type: r.type, status: quickStatus ?? r.status, isActive: quickStatus === "DISABLED" ? false : r.isActive });
    setError("");
  }

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/resources", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر حفظ التغييرات.");
      setEdit(null); await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التغييرات.");
    } finally { setSaving(false); }
  }

  if (loading) return <AdminShell><main className="page" dir="rtl"><div className="center"><div className="loader"/><strong>جاري تحميل إدارة الأجهزة</strong><span>يتم جلب موارد Ninja Zone...</span></div><style jsx>{styles}</style></main></AdminShell>;
  if (!data) return <AdminShell><main className="page" dir="rtl"><div className="center"><strong>تعذر تحميل الأجهزة</strong><span>{error || "حدث خطأ غير متوقع."}</span><button className="primary" onClick={() => load(true)}>إعادة المحاولة</button></div><style jsx>{styles}</style></main></AdminShell>;

  return (
    <AdminShell>
    <main className="page" dir="rtl">
      <div className="container">
        <header className="header">
          <div><div className="eyebrow">NINJA ZONE / RESOURCES</div><h1>إدارة الأجهزة والموارد</h1><p>إدارة الأجهزة والتفعيل والصيانة من مكان واحد.</p></div>
          <div className="headerActions"><button className="ghost" disabled={refreshing} onClick={() => load(true)}><span className={refreshing ? "spin" : ""}>↻</span> تحديث</button><a className="ghost" href="/admin">← لوحة الإدارة</a></div>
        </header>

        {error && <div className="errorBanner"><b>تنبيه</b><span>{error}</span></div>}

        <section className="summary">
          <Stat title="إجمالي الفعال" value={data.summary.allActive} tone="purple" />
          <Stat title="متاح الآن" value={data.summary.available} tone="green" />
          <Stat title="جاري اللعب" value={data.summary.playing} tone="red" />
          <Stat title="صيانة / معطل" value={data.summary.maintenance + data.summary.disabled} tone="gold" />
        </section>

        <section className="panel types"><div className="panelHead"><div><h2>أنواع الموارد</h2><span>التوزيع الحالي للأجهزة الفعالة</span></div></div><div className="typeGrid">{TYPES.slice(1).map(([value, label]) => <button key={value} className={`typeCard ${typeFilter === value ? "selected" : ""}`} onClick={() => setTypeFilter(typeFilter === value ? "ALL" : value)}><span>{label}</span><strong>{data.typeCounts[value] ?? 0}</strong></button>)}</div></section>

        <section className="panel filters">
          <label>البحث<input value={search} onChange={e => setSearch(e.target.value)} placeholder="اسم الجهاز أو الكود..." /></label>
          <label>النوع<select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>الحالة<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">كل الحالات</option><option value="AVAILABLE">متاح</option><option value="RESERVED">محجوز</option><option value="PLAYING">جاري اللعب</option><option value="MAINTENANCE">صيانة</option><option value="DISABLED">معطل</option></select></label>
          <button className="reset" onClick={() => { setTypeFilter("ALL"); setStatusFilter("ALL"); setSearch(""); }}>تصفير الفلاتر</button>
        </section>

        <section className="groups">
          {groups.length === 0 ? <div className="panel empty">لا توجد أجهزة تطابق الفلاتر الحالية.</div> : groups.map(([type, resources]) => (
            <article className="panel group" key={type}>
              <div className="groupHead"><div><h2>{TYPE_LABELS[type] || type}</h2><span>{resources.length} جهاز</span></div><b>{resources.filter(r => r.isActive).length} فعال</b></div>
              <div className="resources">
                {resources.map(r => <ResourceCard key={r.id} r={r} edit={() => openEdit(r)} available={() => openEdit(r, "AVAILABLE")} maintenance={() => openEdit(r, "MAINTENANCE")} disable={() => openEdit(r, "DISABLED")} />)}
              </div>
            </article>
          ))}
        </section>
      </div>

      {edit && <div className="backdrop"><div className="modal" role="dialog" aria-modal="true">
        <div className="modalHead"><div><div className="eyebrow">EDIT RESOURCE</div><h2>تعديل الجهاز</h2></div><button className="close" onClick={() => !saving && setEdit(null)}>×</button></div>
        <div className="form">
          <label>اسم الجهاز<input value={edit.name} disabled={saving} onChange={e => setEdit({...edit, name: e.target.value})} /></label>
          <label>الكود<input value={edit.code} disabled={saving} onChange={e => setEdit({...edit, code: e.target.value.toUpperCase().replace(/\s+/g, "-")})} /></label>
          <label>النوع<select value={edit.type} disabled={saving} onChange={e => setEdit({...edit, type: e.target.value})}>{TYPES.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>الحالة اليدوية<select value={edit.status} disabled={saving || edit.status === "RESERVED" || edit.status === "PLAYING"} onChange={e => setEdit({...edit, status: e.target.value})}><option value="AVAILABLE">متاح</option><option value="MAINTENANCE">صيانة</option><option value="DISABLED">معطل</option>{edit.status === "RESERVED" && <option value="RESERVED">محجوز — إدارة النظام</option>}{edit.status === "PLAYING" && <option value="PLAYING">جاري اللعب — الكاشير</option>}</select></label>
          <div className="switchRow"><div><strong>الجهاز فعال</strong><small>المعطل لا يظهر للحجز.</small></div><button className={`switch ${edit.isActive ? "on" : ""}`} disabled={saving || edit.status === "DISABLED"} onClick={() => setEdit({...edit, isActive: !edit.isActive})}><i/></button></div>
        </div>
        <div className="note"><b>ملاحظة:</b> حالات <strong>محجوز</strong> و<strong>جاري اللعب</strong> يديرها نظام الحجز والكاشير تلقائيًا.</div>
        <div className="modalActions"><button className="ghost" disabled={saving} onClick={() => setEdit(null)}>إلغاء</button><button className="primary" disabled={saving} onClick={save}>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</button></div>
      </div></div>}

      <style jsx>{styles}</style>
    </main>
    </AdminShell>
  );
}

function Stat({ title, value, tone }: { title: string; value: number; tone: string }) { return <article className={`stat ${tone}`}><span>{title}</span><strong>{value}</strong></article>; }

function ResourceCard({ r, edit, available, maintenance, disable }: { r: Resource; edit: () => void; available: () => void; maintenance: () => void; disable: () => void }) {
  const systemManaged = r.status === "RESERVED" || r.status === "PLAYING";
  return <div className={`resource ${!r.isActive ? "inactive" : ""}`}>
    <div className="resourceTop"><div className="icon">{r.type === "PS5" ? "PS" : r.type === "CINEMA" ? "C" : r.type === "BILLIARD" ? "B" : r.type === "TABLE" ? "T" : "PC"}</div><div className="identity"><strong>{r.name}</strong><span>{r.code}</span></div><em className={`badge ${statusClass(r.status)}`}><i/>{STATUS_LABELS[r.status] || r.status}</em></div>
    <div className="meta"><div><span>النوع</span><b>{TYPE_LABELS[r.type] || r.type}</b></div><div><span>التفعيل</span><b>{r.isActive ? "فعال" : "معطل"}</b></div><div><span>آخر تحديث</span><b>{formatDate(r.updatedAt)}</b></div></div>
    <div className="actions"><button onClick={edit}>تعديل</button>{!systemManaged && <>{r.status !== "AVAILABLE" && <button onClick={available}>إتاحة</button>}{r.status !== "MAINTENANCE" && <button onClick={maintenance}>صيانة</button>}{r.status !== "DISABLED" && <button onClick={disable}>تعطيل</button>}</>}</div>
  </div>;
}

const styles = `
*{box-sizing:border-box}.page{min-height:100vh;padding:30px 18px 70px;background:radial-gradient(circle at 90% 0%,rgba(139,92,246,.11),transparent 25%),#08090d;color:#f5f7fb;font-family:Tahoma,Arial,"Segoe UI",sans-serif}.container{width:min(1320px,100%);margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}.eyebrow{color:#9d82ff;font-size:10px;font-weight:900;letter-spacing:.15em;margin-bottom:8px}.header h1{margin:0;font-size:clamp(29px,4vw,42px);font-weight:950;letter-spacing:-.045em}.header p{margin:8px 0 0;color:#69717e;font-size:12px}.headerActions{display:flex;gap:8px}.ghost,.primary,.reset,.actions button,.close{border:1px solid #282e38;background:#12151b;color:#e8ebf1;border-radius:11px;min-height:42px;padding:0 13px;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px}.primary{background:#8d69f2;border-color:#8d69f2}.ghost:disabled,.primary:disabled{opacity:.5;cursor:wait}.errorBanner{display:flex;gap:8px;padding:12px 14px;margin-bottom:13px;border:1px solid rgba(255,77,103,.2);border-radius:12px;background:rgba(255,77,103,.06);color:#efb7c1;font-size:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:13px}.stat,.panel{border:1px solid #212630;background:#101218;border-radius:17px}.stat{min-height:125px;padding:17px;position:relative;overflow:hidden}.stat:after{content:"";position:absolute;right:0;left:0;bottom:0;height:3px;background:var(--tone)}.stat.purple{--tone:#9b7bff}.stat.green{--tone:#31d48b}.stat.red{--tone:#ff4d67}.stat.gold{--tone:#f5c451}.stat span{color:#747d8a;font-size:10px;font-weight:900}.stat strong{display:block;margin-top:23px;font-size:35px;font-weight:950}.panel{padding:17px}.types{margin-bottom:13px}.panelHead,.groupHead,.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px}.panelHead h2,.groupHead h2,.modalHead h2{margin:0;font-size:14px;font-weight:950}.panelHead span,.groupHead span{display:block;margin-top:4px;color:#5d6673;font-size:9px}.typeGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px}.typeCard{min-height:72px;text-align:right;padding:10px;border:1px solid #20252d;border-radius:11px;background:#0d0f13;color:#dce0e7;cursor:pointer}.typeCard.selected{border-color:#8064dc;background:#13151b}.typeCard span{display:block;color:#68717d;font-size:8px}.typeCard strong{display:block;margin-top:8px;font-size:20px}.filters{display:grid;grid-template-columns:1.5fr .8fr .8fr auto;gap:10px;margin-bottom:13px}.filters label,.form label{display:grid;gap:6px;color:#747d89;font-size:9px;font-weight:900}.filters input,.filters select,.form input,.form select{width:100%;min-height:43px;padding:0 11px;border:1px solid #242934;border-radius:10px;background:#0b0d11;color:#eef1f5;outline:none;font:inherit;font-size:10px}.filters input:focus,.filters select:focus,.form input:focus,.form select:focus{border-color:#8b6cf0}.reset{align-self:end}.groups{display:grid;gap:13px}.groupHead>b{padding:7px 9px;border-radius:999px;background:rgba(49,212,139,.08);color:#74e6b2;font-size:8px}.resources{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:15px}.resource{padding:13px;border:1px solid #20252d;border-radius:13px;background:#0d0f13}.resource.inactive{opacity:.58}.resourceTop{display:flex;align-items:center;gap:10px}.icon{width:38px;height:38px;border-radius:11px;background:rgba(155,123,255,.09);color:#b8aaff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:950}.identity{flex:1;min-width:0}.identity strong,.identity span{display:block}.identity strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.identity span{margin-top:4px;color:#596270;font-size:8px}.badge{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:999px;font-style:normal;font-size:7px;font-weight:950;white-space:nowrap}.badge i{width:5px;height:5px;border-radius:50%;background:currentColor}.badge.available{color:#67e1a8;background:rgba(49,212,139,.08)}.badge.reserved{color:#c1b6ff;background:rgba(155,123,255,.09)}.badge.playing{color:#ff8e9f;background:rgba(255,77,103,.09)}.badge.maintenance{color:#f1d473;background:rgba(245,196,81,.08)}.badge.disabled{color:#848d9b;background:rgba(127,136,150,.08)}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:13px}.meta>div{padding:8px;border:1px solid #1d222a;border-radius:9px;background:#0b0d11;min-height:50px}.meta span,.meta b{display:block}.meta span{color:#515a67;font-size:7px}.meta b{margin-top:4px;color:#c9ced6;font-size:8px}.actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.actions button{min-height:31px;padding:0 9px;background:#11141a;border-color:#252a33;font-size:8px}.actions button:first-child{color:#bfafff;border-color:rgba(155,123,255,.23)}.empty{min-height:220px;display:flex;align-items:center;justify-content:center;color:#5b6471;font-size:10px}.backdrop{position:fixed;inset:0;z-index:50;background:rgba(4,5,8,.75);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:12px}.modal{width:min(520px,100%);max-height:88vh;overflow:auto;padding:18px;border:1px solid #2a303a;border-radius:18px;background:#11141a;box-shadow:0 25px 90px rgba(0,0,0,.45)}.close{width:35px;height:35px;padding:0;font-size:20px}.form{display:grid;gap:12px;margin-top:18px}.switchRow{display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #20252d;border-radius:10px;background:#0d0f13}.switchRow strong,.switchRow small{display:block}.switchRow strong{font-size:10px}.switchRow small{margin-top:4px;color:#606975;font-size:8px}.switch{width:48px;height:28px;padding:3px;border:0;border-radius:999px;background:#2a2f38;cursor:pointer}.switch i{display:block;width:22px;height:22px;border-radius:50%;background:#89909a;transition:.18s}.switch.on{background:#8767ea}.switch.on i{transform:translateX(-20px);background:#fff}.switch:disabled{opacity:.45;cursor:not-allowed}.note{margin-top:13px;padding:11px;border-radius:10px;background:rgba(155,123,255,.05);border:1px solid rgba(155,123,255,.12);color:#7d8692;font-size:8px;line-height:1.8}.note b{color:#c1b4ff}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.center{min-height:85vh;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:7px}.center span{color:#68717e;font-size:10px}.loader{width:40px;height:40px;margin-bottom:8px;border:3px solid #2b3039;border-top-color:#9574f4;border-radius:50%;animation:spin .8s linear infinite}.spin{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.summary{grid-template-columns:repeat(2,1fr)}.typeGrid{grid-template-columns:repeat(3,1fr)}.filters{grid-template-columns:1fr 1fr}.reset{grid-column:1/-1}.resources{grid-template-columns:1fr}}
@media(max-width:650px){.page{padding:18px 10px 40px}.header{flex-direction:column;align-items:stretch}.headerActions{display:grid;grid-template-columns:1fr 1fr}.headerActions>*{width:100%}.summary{grid-template-columns:1fr}.typeGrid{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:1fr}.reset{grid-column:auto}.resourceTop{flex-wrap:wrap}.badge{margin-inline-start:auto}.meta{grid-template-columns:1fr}.modal{padding:15px}}
`;
