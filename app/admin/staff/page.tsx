"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

type StaffUser = {
  id: string;
  name: string | null;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bookings: number;
    menuOrders: number;
    Payment: number;
  };
};

type ApiData = {
  users: StaffUser[];
  total: number;
  page: number;
  pageSize: number;
  roleCounts: Record<string, number>;
};

type EditForm = {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  password: string;
};

type CreateForm = {
  name: string;
  phone: string;
  password: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  CASHIER: "كاشير",
  MANAGER: "مدير",
  ADMIN: "أدمن",
};

const ROLE_COLORS: Record<string, string> = {
  CASHIER: "#f5c451",
  MANAGER: "#9b7bff",
  ADMIN: "#ff4d67",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Baghdad",
  }).format(new Date(value));
}

export default function AdminStaffPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [createOpen, setCreateOpen] = useState<CreateForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (roleFilter !== "ALL") params.set("role", roleFilter);
        if (search.trim()) params.set("search", search.trim());
        params.set("page", String(page));
        params.set("pageSize", "20");

        const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "تعذر تحميل الموظفين.");
        setData(result);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر تحميل الموظفين.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roleFilter, search, page],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const staffUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => u.role !== "CUSTOMER");
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edit.id,
          name: edit.name,
          role: edit.role,
          isActive: edit.isActive,
          ...(edit.password ? { password: edit.password } : {}),
        }),
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

  async function createStaff() {
    if (!createOpen) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createOpen),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الموظف.");
      setCreateOpen(null);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الموظف.");
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
            <strong>جاري تحميل الموظفين</strong>
            <span>يتم جلب بيانات الموظفين...</span>
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
            <strong>تعذر تحميل الموظفين</strong>
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
              <div className="eyebrow">NINJA ZONE / STAFF</div>
              <h1>إدارة الموظفين</h1>
              <p>إدارة حسابات الكاشير والمديرين وصلاحياتهم.</p>
            </div>
            <div className="headerActions">
              <button className="ghost" disabled={refreshing} onClick={() => load(true)}>
                <span className={refreshing ? "spin" : ""}>↻</span> تحديث
              </button>
              <button
                className="primary"
                onClick={() => setCreateOpen({ name: "", phone: "", password: "", role: "CASHIER" })}
              >
                + موظف جديد
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
            <Stat title="إجمالي الموظفين" value={staffUsers.length} tone="purple" />
            <Stat title="كاشير" value={data.roleCounts.CASHIER ?? 0} tone="gold" />
            <Stat title="مدير" value={data.roleCounts.MANAGER ?? 0} tone="green" />
            <Stat title="أدمن" value={data.roleCounts.ADMIN ?? 0} tone="red" />
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
                placeholder="اسم الموظف أو رقم الهاتف..."
              />
            </label>
            <label>
              الدور
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">كل الأدوار</option>
                <option value="CASHIER">كاشير</option>
                <option value="MANAGER">مدير</option>
                <option value="ADMIN">أدمن</option>
              </select>
            </label>
            <button
              className="reset"
              onClick={() => {
                setSearch("");
                setRoleFilter("ALL");
                setPage(1);
              }}
            >
              تصفير الفلاتر
            </button>
          </section>

          <section className="panel tablePanel">
            <div className="tableHead">
              <div>
                <h2>الموظفون</h2>
                <span>{staffUsers.length} موظف</span>
              </div>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>رقم الهاتف</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>الحجوزات</th>
                    <th>الطلبات</th>
                    <th>المدفوعات</th>
                    <th>تاريخ الإنشاء</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="emptyRow">
                        لا يوجد موظفون مطابقون.
                      </td>
                    </tr>
                  ) : (
                    staffUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="userCell">
                            <div className="avatar">{user.name?.charAt(0) || "N"}</div>
                            <strong>{user.name || "بدون اسم"}</strong>
                          </div>
                        </td>
                        <td dir="ltr">{user.phone}</td>
                        <td>
                          <span className="roleBadge" style={{ color: ROLE_COLORS[user.role] || "#9b7bff", background: `${ROLE_COLORS[user.role] || "#9b7bff"}18` }}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`statusBadge ${user.isActive ? "active" : "inactive"}`}>
                            <i />
                            {user.isActive ? "نشط" : "معطل"}
                          </span>
                        </td>
                        <td>{user._count?.bookings ?? 0}</td>
                        <td>{user._count?.menuOrders ?? 0}</td>
                        <td>{user._count?.Payment ?? 0}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <button
                            className="editBtn"
                            onClick={() =>
                              setEdit({
                                id: user.id,
                                name: user.name || "",
                                phone: user.phone,
                                role: user.role,
                                isActive: user.isActive,
                                password: "",
                              })
                            }
                          >
                            تعديل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

        {/* EDIT MODAL */}
        {edit && (
          <div className="backdrop">
            <div className="modal" role="dialog" aria-modal="true">
              <div className="modalHead">
                <div>
                  <div className="eyebrow">EDIT STAFF</div>
                  <h2>تعديل الموظف</h2>
                </div>
                <button className="close" onClick={() => !saving && setEdit(null)}>
                  ×
                </button>
              </div>
              <div className="form">
                <label>
                  الاسم
                  <input value={edit.name} disabled={saving} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </label>
                <label>
                  رقم الهاتف
                  <input value={edit.phone} disabled dir="ltr" />
                </label>
                <label>
                  الدور
                  <select value={edit.role} disabled={saving} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                    <option value="CASHIER">كاشير</option>
                    <option value="MANAGER">مدير</option>
                    <option value="ADMIN">أدمن</option>
                  </select>
                </label>
                <label>
                  كلمة مرور جديدة <small>(اتركها فارغة لعدم التغيير)</small>
                  <input
                    type="password"
                    value={edit.password}
                    disabled={saving}
                    onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </label>
                <div className="switchRow">
                  <div>
                    <strong>الحساب نشط</strong>
                    <small>المعطل لا يمكنه تسجيل الدخول.</small>
                  </div>
                  <button
                    className={`switch ${edit.isActive ? "on" : ""}`}
                    disabled={saving}
                    onClick={() => setEdit({ ...edit, isActive: !edit.isActive })}
                  >
                    <i />
                  </button>
                </div>
              </div>
              <div className="modalActions">
                <button className="ghost" disabled={saving} onClick={() => setEdit(null)}>
                  إلغاء
                </button>
                <button className="primary" disabled={saving} onClick={saveEdit}>
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE MODAL */}
        {createOpen && (
          <div className="backdrop">
            <div className="modal" role="dialog" aria-modal="true">
              <div className="modalHead">
                <div>
                  <div className="eyebrow">NEW STAFF</div>
                  <h2>إنشاء موظف جديد</h2>
                </div>
                <button className="close" onClick={() => !saving && setCreateOpen(null)}>
                  ×
                </button>
              </div>
              <div className="form">
                <label>
                  الاسم
                  <input value={createOpen.name} disabled={saving} onChange={(e) => setCreateOpen({ ...createOpen, name: e.target.value })} />
                </label>
                <label>
                  رقم الهاتف
                  <input
                    value={createOpen.phone}
                    disabled={saving}
                    onChange={(e) => setCreateOpen({ ...createOpen, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                  />
                </label>
                <label>
                  كلمة المرور
                  <input
                    type="password"
                    value={createOpen.password}
                    disabled={saving}
                    onChange={(e) => setCreateOpen({ ...createOpen, password: e.target.value })}
                    placeholder="8 أحرف على الأقل"
                  />
                </label>
                <label>
                  الدور
                  <select value={createOpen.role} disabled={saving} onChange={(e) => setCreateOpen({ ...createOpen, role: e.target.value })}>
                    <option value="CASHIER">كاشير</option>
                    <option value="MANAGER">مدير</option>
                    <option value="ADMIN">أدمن</option>
                  </select>
                </label>
              </div>
              <div className="modalActions">
                <button className="ghost" disabled={saving} onClick={() => setCreateOpen(null)}>
                  إلغاء
                </button>
                <button className="primary" disabled={saving} onClick={createStaff}>
                  {saving ? "جاري الإنشاء..." : "إنشاء الموظف"}
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

function Stat({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <article className={`stat ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

const styles = `
*{box-sizing:border-box}.page{min-height:100vh;padding:30px 18px 70px;background:radial-gradient(circle at 90% 0%,rgba(139,92,246,.11),transparent 25%),#08090d;color:#f5f7fb;font-family:Tahoma,Arial,"Segoe UI",sans-serif}.container{width:min(1320px,100%);margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}.eyebrow{color:#9d82ff;font-size:10px;font-weight:900;letter-spacing:.15em;margin-bottom:8px}.header h1{margin:0;font-size:clamp(29px,4vw,42px);font-weight:950;letter-spacing:-.045em}.header p{margin:8px 0 0;color:#69717e;font-size:12px}.headerActions{display:flex;gap:8px}.ghost,.primary,.reset,.editBtn,.close{border:1px solid #282e38;background:#12151b;color:#e8ebf1;border-radius:11px;min-height:42px;padding:0 13px;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:7px}.primary{background:#8d69f2;border-color:#8d69f2}.ghost:disabled,.primary:disabled{opacity:.5;cursor:wait}.errorBanner{display:flex;gap:8px;padding:12px 14px;margin-bottom:13px;border:1px solid rgba(255,77,103,.2);border-radius:12px;background:rgba(255,77,103,.06);color:#efb7c1;font-size:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:13px}.stat,.panel{border:1px solid #212630;background:#101218;border-radius:17px}.stat{min-height:125px;padding:17px;position:relative;overflow:hidden}.stat:after{content:"";position:absolute;right:0;left:0;bottom:0;height:3px;background:var(--tone)}.stat.purple{--tone:#9b7bff}.stat.green{--tone:#31d48b}.stat.gold{--tone:#f5c451}.stat.red{--tone:#ff4d67}.stat span{color:#747d8a;font-size:10px;font-weight:900}.stat strong{display:block;margin-top:23px;font-size:35px;font-weight:950}.panel{padding:17px}.filters{display:grid;grid-template-columns:1.5fr .8fr auto;gap:10px;margin-bottom:13px}.filters label,.form label{display:grid;gap:6px;color:#747d89;font-size:9px;font-weight:900}.filters input,.filters select,.form input,.form select{width:100%;min-height:43px;padding:0 11px;border:1px solid #242934;border-radius:10px;background:#0b0d11;color:#eef1f5;outline:none;font:inherit;font-size:10px}.filters input:focus,.filters select:focus,.form input:focus,.form select:focus{border-color:#8b6cf0}.reset{align-self:end}.tablePanel{padding:0;overflow:hidden}.tableHead{display:flex;justify-content:space-between;align-items:center;padding:17px}.tableHead h2{margin:0;font-size:14px;font-weight:950}.tableHead span{display:block;margin-top:4px;color:#5d6673;font-size:9px}.tableWrap{overflow-x:auto}.table{width:100%;border-collapse:collapse;font-size:10px}.table th{text-align:right;padding:12px 14px;background:#0b0d11;color:#5d6673;font-size:8px;font-weight:900;white-space:nowrap;border-bottom:1px solid #1e232b}.table td{padding:12px 14px;border-bottom:1px solid #171b21;white-space:nowrap}.table tr:last-child td{border-bottom:0}.table tr:hover td{background:rgba(139,92,246,.03)}.userCell{display:flex;align-items:center;gap:9px}.avatar{width:30px;height:30px;border-radius:9px;background:rgba(155,123,255,.12);color:#b8aaff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:950}.roleBadge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900}.statusBadge{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900}.statusBadge i{width:5px;height:5px;border-radius:50%;background:currentColor}.statusBadge.active{color:#67e1a8;background:rgba(49,212,139,.08)}.statusBadge.inactive{color:#8d95a5;background:rgba(141,149,165,.08)}.editBtn{min-height:30px;padding:0 10px;background:#11141a;border-color:#252a33;font-size:8px;color:#bfafff;border-color:rgba(155,123,255,.23)}.emptyRow{text-align:center;color:#5b6471;padding:40px!important}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;padding:15px}.pagination button{min-height:34px;padding:0 12px;border:1px solid #242934;border-radius:9px;background:#0d0f13;color:#c9ced6;font-size:9px;font-weight:900;cursor:pointer}.pagination button:disabled{opacity:.4;cursor:not-allowed}.pagination span{color:#5d6673;font-size:9px}.backdrop{position:fixed;inset:0;z-index:50;background:rgba(4,5,8,.75);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:12px}.modal{width:min(520px,100%);max-height:88vh;overflow:auto;padding:18px;border:1px solid #2a303a;border-radius:18px;background:#11141a;box-shadow:0 25px 90px rgba(0,0,0,.45)}.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px}.modalHead h2{margin:0;font-size:14px;font-weight:950}.close{width:35px;height:35px;padding:0;font-size:20px}.form{display:grid;gap:12px;margin-top:18px}.form label small{color:#5d6673;font-size:8px}.switchRow{display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #20252d;border-radius:10px;background:#0d0f13}.switchRow strong,.switchRow small{display:block}.switchRow strong{font-size:10px}.switchRow small{margin-top:4px;color:#606975;font-size:8px}.switch{width:48px;height:28px;padding:3px;border:0;border-radius:999px;background:#2a2f38;cursor:pointer}.switch i{display:block;width:22px;height:22px;border-radius:50%;background:#89909a;transition:.18s}.switch.on{background:#8767ea}.switch.on i{transform:translateX(-20px);background:#fff}.switch:disabled{opacity:.45;cursor:not-allowed}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.center{min-height:85vh;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:7px}.center span{color:#68717e;font-size:10px}.loader{width:40px;height:40px;margin-bottom:8px;border:3px solid #2b3039;border-top-color:#9574f4;border-radius:50%;animation:spin .8s linear infinite}.spin{display:inline-block;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.summary{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:1fr 1fr}.reset{grid-column:1/-1}}
@media(max-width:650px){.page{padding:18px 10px 40px}.header{flex-direction:column;align-items:stretch}.headerActions{display:grid;grid-template-columns:1fr 1fr}.headerActions>*{width:100%}.summary{grid-template-columns:1fr}.filters{grid-template-columns:1fr}.reset{grid-column:auto}.modal{padding:15px}}
`;