"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

type LogUser = {
  id: string;
  name: string | null;
  phone: string;
  role: string;
};

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  User: LogUser | null;
};

type ApiData = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  entityCounts: Record<string, number>;
};

const ENTITY_LABELS: Record<string, string> = {
  User: "مستخدم",
  Resource: "جهاز",
  Pricing: "سعر",
  MenuItem: "صنف منيو",
  Booking: "حجز",
  Payment: "دفعة",
  Invoice: "فاتورة",
  Session: "جلسة",
};

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "إنشاء مستخدم",
  USER_UPDATED: "تحديث مستخدم",
  RESOURCE_UPDATED: "تحديث جهاز",
  PRICING_UPDATED: "تحديث سعر",
  MENU_ITEM_CREATED: "إنشاء صنف",
  MENU_ITEM_UPDATED: "تحديث صنف",
  MENU_ITEM_DELETED: "حذف صنف",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Baghdad",
  }).format(new Date(value));
}

export default function AdminLogsPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (entityFilter !== "ALL") params.set("entity", entityFilter);
        if (search.trim()) params.set("search", search.trim());
        params.set("page", String(page));
        params.set("pageSize", "30");

        const response = await fetch(`/api/admin/logs?${params}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "تعذر تحميل سجل النشاطات.");
        setData(result);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر تحميل سجل النشاطات.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entityFilter, search, page],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  if (loading) {
    return (
      <AdminShell>
        <main className="page" dir="rtl">
          <div className="center">
            <div className="loader" />
            <strong>جاري تحميل سجل النشاطات</strong>
            <span>يتم جلب سجلات النظام...</span>
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
            <strong>تعذر تحميل سجل النشاطات</strong>
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
              <div className="eyebrow">NINJA ZONE / AUDIT LOGS</div>
              <h1>سجل النشاطات</h1>
              <p>تتبع جميع العمليات والتغييرات التي تحدث في النظام.</p>
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

          <section className="summary">
            <Stat title="إجمالي السجلات" value={data.total} tone="purple" />
            <Stat title="مستخدمين" value={data.entityCounts.User ?? 0} tone="green" />
            <Stat title="أجهزة" value={data.entityCounts.Resource ?? 0} tone="gold" />
            <Stat title="منيو" value={(data.entityCounts.MenuItem ?? 0) + (data.entityCounts.Pricing ?? 0)} tone="red" />
          </section>

          <section className="panel filters">
            <label>
              البحث
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث في الإجراءات أو المعرفات..."
              />
            </label>
            <label>
              الكيان
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">كل الكيانات</option>
                {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} ({data.entityCounts[value] ?? 0})
                  </option>
                ))}
              </select>
            </label>
            <button
              className="reset"
              onClick={() => {
                setSearch("");
                setEntityFilter("ALL");
                setPage(1);
              }}
            >
              تصفير الفلاتر
            </button>
          </section>

          <section className="panel logsPanel">
            <div className="logsHead">
              <div>
                <h2>السجلات</h2>
                <span>{data.total} سجل</span>
              </div>
            </div>

            <div className="logsList">
              {data.logs.length === 0 ? (
                <div className="empty">لا توجد سجلات مطابقة.</div>
              ) : (
                data.logs.map((log) => {
                  const isExpanded = Boolean(expanded[log.id]);
                  return (
                    <article className="logRow" key={log.id}>
                      <button
                        type="button"
                        className="logMain"
                        onClick={() => setExpanded((cur) => ({ ...cur, [log.id]: !cur[log.id] }))}
                      >
                        <div className="logIcon">
                          {log.entity === "User" ? "👤" : log.entity === "Resource" ? "◉" : log.entity === "Pricing" ? "₿" : log.entity === "MenuItem" ? "☷" : "📋"}
                        </div>
                        <div className="logIdentity">
                          <strong>{ACTION_LABELS[log.action] || log.action}</strong>
                          <span>
                            {ENTITY_LABELS[log.entity] || log.entity}
                            {log.entityId ? ` • ${log.entityId.slice(0, 8)}...` : ""}
                          </span>
                        </div>
                        <div className="logUser">
                          <strong>{log.User?.name || "النظام"}</strong>
                          <span dir="ltr">{log.User?.phone || ""}</span>
                        </div>
                        <div className="logTime">{formatDate(log.createdAt)}</div>
                        <span className={`chevron ${isExpanded ? "open" : ""}`}>›</span>
                      </button>

                      {isExpanded && (
                        <div className="logDetails">
                          <div className="logDetailGrid">
                            <div>
                              <span>المعرف</span>
                              <b dir="ltr">{log.entityId || "—"}</b>
                            </div>
                            <div>
                              <span>المستخدم</span>
                              <b>{log.User?.name || "النظام"}</b>
                            </div>
                            <div>
                              <span>رقم الهاتف</span>
                              <b dir="ltr">{log.User?.phone || "—"}</b>
                            </div>
                            <div>
                              <span>الدور</span>
                              <b>{log.User?.role || "—"}</b>
                            </div>
                          </div>

                          {(log.beforeJson || log.afterJson) && (
                            <div className="logJson">
                              {log.beforeJson && (
                                <div>
                                  <span>قبل</span>
                                  <pre>{JSON.stringify(log.beforeJson, null, 2)}</pre>
                                </div>
                              )}
                              {log.afterJson && (
                                <div>
                                  <span>بعد</span>
                                  <pre>{JSON.stringify(log.afterJson, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← السابق
                </button>
                <span>
                  صفحة {page} من {totalPages}
                </span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  التالي ←
                </button>
              </div>
            )}
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    </AdminShell>
  );
}

function Stat({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <article className={`stat ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

const styles = `
*{box-sizing:border-box}.page{min-height:100vh;padding:30px 18px 70px;background:radial-gradient(circle at 90% 0%,rgba(139,92,246,.11),transparent 25%),#08090d;color:#f5f7fb;font-family:Tahoma,Arial,"Segoe UI",sans-serif}.container{width:min(1320px,100%);margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}.eyebrow{color:#9d82ff;font-size:10px;font-weight:900;letter-spacing:.15em;margin-bottom:8px}.header h1{margin:0;font-size:clamp(29px,4vw,42px);font-weight:950;letter-spacing:-.045em}.header p{margin:8px 0 0;color:#69717e;font-size:12px}.headerActions{display:flex;gap:8px}.ghost,.primary,.reset{border:1px solid #282e38;background:#12151b;color:#e8ebf1;border-radius:11px;min-height:42px;padding:0 13px;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px}.primary{background:#8d69f2;border-color:#8d69f2}.ghost:disabled,.primary:disabled{opacity:.5;cursor:wait}.errorBanner{display:flex;gap:8px;padding:12px 14px;margin-bottom:13px;border:1px solid rgba(255,77,103,.2);border-radius:12px;background:rgba(255,77,103,.06);color:#efb7c1;font-size:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:13px}.stat,.panel{border:1px solid #212630;background:#101218;border-radius:17px}.stat{min-height:125px;padding:17px;position:relative;overflow:hidden}.stat:after{content:"";position:absolute;right:0;left:0;bottom:0;height:3px;background:var(--tone)}.stat.purple{--tone:#9b7bff}.stat.green{--tone:#31d48b}.stat.gold{--tone:#f5c451}.stat.red{--tone:#ff4d67}.stat span{color:#747d8a;font-size:10px;font-weight:900}.stat strong{display:block;margin-top:23px;font-size:35px;font-weight:950}.panel{padding:17px}.filters{display:grid;grid-template-columns:1.5fr .8fr auto;gap:10px;margin-bottom:13px}.filters label{display:grid;gap:6px;color:#747d89;font-size:9px;font-weight:900}.filters input,.filters select{width:100%;min-height:43px;padding:0 11px;border:1px solid #242934;border-radius:10px;background:#0b0d11;color:#eef1f5;outline:none;font:inherit;font-size:10px}.filters input:focus,.filters select:focus{border-color:#8b6cf0}.reset{align-self:end}.logsPanel{padding:0;overflow:hidden}.logsHead{display:flex;justify-content:space-between;align-items:center;padding:17px}.logsHead h2{margin:0;font-size:14px;font-weight:950}.logsHead span{display:block;margin-top:4px;color:#5d6673;font-size:9px}.logsList{display:flex;flex-direction:column}.logRow{border-bottom:1px solid #171b21}.logRow:last-child{border-bottom:0}.logMain{width:100%;display:flex;align-items:center;gap:12px;padding:13px 17px;background:transparent;border:0;color:inherit;cursor:pointer;text-align:right;font:inherit}.logMain:hover{background:rgba(139,92,246,.03)}.logIcon{width:34px;height:34px;border-radius:10px;background:rgba(155,123,255,.1);color:#b8aaff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}.logIdentity{flex:1;min-width:0}.logIdentity strong,.logIdentity span{display:block}.logIdentity strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.logIdentity span{margin-top:3px;color:#596270;font-size:8px}.logUser{width:130px;flex-shrink:0}.logUser strong,.logUser span{display:block}.logUser strong{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.logUser span{margin-top:3px;color:#596270;font-size:8px}.logTime{width:150px;flex-shrink:0;color:#68717e;font-size:8px;text-align:left}.chevron{color:#5d6673;font-size:14px;transition:transform .2s;flex-shrink:0}.chevron.open{transform:rotate(90deg)}.logDetails{padding:0 17px 15px 17px;border-top:1px solid #171b21;background:#0b0d11}.logDetailGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:13px 0}.logDetailGrid>div{padding:9px;border:1px solid #1d222a;border-radius:9px;background:#0d0f13}.logDetailGrid span,.logDetailGrid b{display:block}.logDetailGrid span{color:#515a67;font-size:7px}.logDetailGrid b{margin-top:4px;color:#c9ced6;font-size:8px;word-break:break-all}.logJson{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:4px}.logJson>div{padding:10px;border:1px solid #1d222a;border-radius:9px;background:#0d0f13}.logJson span{display:block;color:#515a67;font-size:7px;margin-bottom:6px}.logJson pre{margin:0;color:#aab2bf;font-size:8px;line-height:1.6;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto}.empty{min-height:200px;display:flex;align-items:center;justify-content:center;color:#5b6471;font-size:10px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;padding:15px;border-top:1px solid #171b21}.pagination button{min-height:34px;padding:0 12px;border:1px solid #242934;border-radius:9px;background:#0d0f13;color:#c9ced6;font-size:9px;font-weight:900;cursor:pointer}.pagination button:disabled{opacity:.4;cursor:not-allowed}.pagination span{color:#5d6673;font-size:9px}.center{min-height:85vh;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:7px}.center span{color:#68717e;font-size:10px}.loader{width:40px;height:40px;margin-bottom:8px;border:3px solid #2b3039;border-top-color:#9574f4;border-radius:50%;animation:spin .8s linear infinite}.spin{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.summary{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:1fr 1fr}.reset{grid-column:1/-1}.logUser{display:none}.logTime{width:110px}}
@media(max-width:650px){.page{padding:18px 10px 40px}.header{flex-direction:column;align-items:stretch}.headerActions{display:grid;grid-template-columns:1fr 1fr}.headerActions>*{width:100%}.summary{grid-template-columns:1fr}.filters{grid-template-columns:1fr}.reset{grid-column:auto}.logTime{display:none}.logDetailGrid{grid-template-columns:1fr 1fr}.logJson{grid-template-columns:1fr}.modal{padding:15px}}
`;