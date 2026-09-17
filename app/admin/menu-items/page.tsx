"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { AdminShell } from "@/components/admin-shell";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
};

const CATEGORIES = [
  "مشروبات",
  "وجبات",
  "سناكات",
  "عروض",
  "حلويات",
  "مأكولات",
  "أخرى",
];

const money = (value: number) =>
  new Intl.NumberFormat("ar-IQ").format(value) + " د.ع";

const getItemEmoji = (name: string, category: string) => {
  const n = name ? name.toLowerCase() : "";
  if (n.includes("دونات")) return "🍩";
  if (n.includes("وافل")) return "🧇";
  if (n.includes("كريب") || n.includes("بان كيك")) return "🥞";
  if (n.includes("كيك")) return "🍰";
  if (n.includes("بيتزا")) return "🍕";
  if (n.includes("برغر") || n.includes("همبرغر")) return "🍔";
  if (n.includes("بطاطا") || n.includes("فنكر")) return "🍟";
  if (n.includes("زنجر") || n.includes("شاورما") || n.includes("دونار") || n.includes("صاج")) return "🌯";
  if (n.includes("بيبسي") || n.includes("موهيتو") || n.includes("عصير")) return "🥤";
  
  if (category === "عروض") return "🎁";
  if (category === "مشروبات") return "🥤";
  if (category === "حلويات") return "🍰";
  return "🍽️";
};

const isValidImageUrl = (url: string | null | undefined) => {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  return url.startsWith("http") || url.startsWith("/");
};

export default function AdminMenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<FormData>({
    name: "",
    description: "",
    category: "سناكات",
    price: 0,
    imageUrl: "",
    isAvailable: true,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/menu-items", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر جلب عناصر المنيو.");
      setItems(data.items || []);
      setError("");
      setSuccess("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر جلب عناصر المنيو.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category: "سناكات",
      price: 0,
      imageUrl: "",
      isAvailable: true,
    });
    setEditingId(null);
  };

  const startEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category || "سناكات",
      price: item.price,
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
    });
    setEditingId(item.id);
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // نظام الرفع المحلي (أضمن طريقة)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت.");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل الرفع للسيرفر المحلي.");
      }

      setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      setSuccess("تم رفع الصورة بنجاح! لا تنسَ الضغط على زر الحفظ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء رفع الصورة.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = `/api/admin/menu-items`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: editingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ التغييرات.");
      }

      setSuccess(
        editingId
          ? "تم تعديل العنصر بنجاح."
          : "تم إضافة العنصر بنجاح."
      );
      resetForm();
      await loadItems(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التغييرات.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر؟")) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/menu-items?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حذف العنصر.");
      }

      setSuccess("تم حذف العنصر بنجاح.");
      await loadItems(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف العنصر.");
    } finally {
      setDeletingId(null);
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || "أخرى";
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <AdminShell>
      <main className="admin-page" dir="rtl">
        <div className="admin-content">
          <header className="admin-header">
            <div>
              <div className="admin-eyebrow">NINJA ZONE / MENU</div>
              <h1>إدارة المنيو</h1>
              <p>إضافة، تعديل، وحذف عناصر المنيو والوجبات.</p>
            </div>
            <div className="admin-header-actions">
              <button
                className="admin-btn-secondary"
                disabled={refreshing}
                onClick={() => loadItems(true)}
              >
                <span className={refreshing ? "spinner" : ""}>↻</span>
                تحديث
              </button>
            </div>
          </header>

          {error && (
            <div className="admin-alert admin-alert-error">
              <span>⚠</span>
              <div>
                <strong>خطأ</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="admin-alert admin-alert-success">
              <span>✓</span>
              <div>
                <strong>تم بنجاح</strong>
                <p>{success}</p>
              </div>
            </div>
          )}

          <div className="admin-card admin-form-card">
            <div className="admin-card-header">
              <h2>{editingId ? "تعديل العنصر الحالي" : "إضافة عنصر جديد"}</h2>
              {editingId && (
                <button
                  type="button"
                  className="admin-btn-text"
                  onClick={resetForm}
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>
                    <span>اسم العنصر *</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="مثلاً: دونات شوكولاتة"
                      required
                      disabled={saving || uploading}
                    />
                  </label>
                </div>

                <div className="admin-form-group">
                  <label>
                    <span>التصنيف *</span>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      disabled={saving || uploading}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="admin-form-group">
                <label>
                  <span>الوصف (امسح أي رابط موجود هنا)</span>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="مكونات الوجبة..."
                    rows={2}
                    disabled={saving || uploading}
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>
                    <span>السعر (د.ع) *</span>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      value={form.price || 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      required
                      disabled={saving || uploading}
                    />
                  </label>
                </div>

                <div className="admin-form-group">
                  <label>
                    <span>صورة العنصر (رفع مباشر)</span>
                    <div className="upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={saving || uploading}
                        id="file-upload"
                        className="file-input-hidden"
                      />
                      <label htmlFor="file-upload" className="upload-btn">
                        {uploading ? (
                          <>
                            <span className="spinner">↻</span> جاري الرفع...
                          </>
                        ) : (
                          <>
                            <span>📁</span> اختر صورة
                          </>
                        )}
                      </label>
                      {isValidImageUrl(form.imageUrl) && (
                        <div className="upload-preview">
                          <img src={form.imageUrl} alt="Preview" />
                          <button
                            type="button"
                            className="remove-img-btn"
                            onClick={() => setForm({ ...form, imageUrl: "" })}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="admin-form-group admin-form-checkbox">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isAvailable: e.target.checked,
                      })
                    }
                    disabled={saving || uploading}
                  />
                  <span>العنصر متاح للطلب</span>
                </label>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={resetForm}
                  disabled={saving || uploading}
                >
                  تفريغ الحقول
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={saving || uploading}
                >
                  {saving ? (
                    <>
                      <span className="spinner">↻</span>
                      جاري الحفظ...
                    </>
                  ) : editingId ? (
                    <>
                      <span className="icon">✎</span>
                      تحديث العنصر
                    </>
                  ) : (
                    <>
                      <span className="icon">+</span>
                      حفظ في المنيو
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2>إجمالي العناصر: {items.length}</h2>
            </div>

            {loading && items.length === 0 ? (
              <div className="admin-loading">
                <div className="spinner">↻</div>
                <p>جاري تحميل البيانات...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="admin-empty">
                <span>📋</span>
                <p>لا توجد عناصر في المنيو بعد.</p>
              </div>
            ) : (
              <div className="admin-menu-grid">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category} className="admin-category-section">
                    <div className="admin-category-header">
                      <span className="admin-category-icon">{category === "عروض" ? "🎁" : "▦"}</span>
                      <h3>{category}</h3>
                      <span className="admin-category-count">
                        {categoryItems.length} عنصر
                      </span>
                    </div>

                    <div className="admin-items-table-wrapper">
                      <table className="admin-items-table">
                        <thead>
                          <tr>
                            <th>العنصر والصورة</th>
                            <th>الوصف</th>
                            <th>السعر</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryItems.map((item) => (
                            <tr
                              key={item.id}
                              className={!item.isAvailable ? "admin-item-disabled" : ""}
                            >
                              <td>
                                <div className="admin-item-name">
                                  {isValidImageUrl(item.imageUrl) ? (
                                    <div className="admin-item-image-wrapper">
                                      <img
                                        src={item.imageUrl!}
                                        alt={item.name}
                                        className="admin-item-image-tag"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.innerHTML = `<div class="admin-item-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;">${getItemEmoji(item.name, item.category)}</div>`;
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="admin-item-placeholder">
                                      {getItemEmoji(item.name, item.category)}
                                    </div>
                                  )}
                                  <div className="admin-item-text-info">
                                    <strong>{item.name}</strong>
                                    <small className="admin-item-category">
                                      {item.category}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="admin-item-desc">
                                  {item.description || "—"}
                                </span>
                              </td>
                              <td>
                                <strong className="admin-item-price">
                                  {money(item.price)}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`admin-status-badge ${
                                    item.isAvailable
                                      ? "admin-status-active"
                                      : "admin-status-inactive"
                                  }`}
                                >
                                  <span
                                    className={`admin-status-dot ${
                                      item.isAvailable
                                        ? "admin-dot-active"
                                        : "admin-dot-inactive"
                                    }`}
                                  />
                                  {item.isAvailable ? "متاح" : "مخفي"}
                                </span>
                              </td>
                              <td>
                                <div className="admin-item-actions">
                                  <button
                                    className="admin-btn-icon admin-btn-edit"
                                    onClick={() => startEdit(item)}
                                    title="تعديل"
                                    disabled={saving || uploading}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="admin-btn-icon admin-btn-delete"
                                    onClick={() => handleDelete(item.id)}
                                    title="حذف"
                                    disabled={saving || uploading || deletingId === item.id}
                                  >
                                    {deletingId === item.id ? (
                                      <span className="spinner">↻</span>
                                    ) : (
                                      "✕"
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          padding: 24px;
          background: #0a0c10;
          color: #e8ebf1;
          font-family: Tahoma, Arial, sans-serif;
        }

        .admin-content {
          max-width: 1100px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .admin-eyebrow {
          color: #9d82ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          margin-bottom: 8px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .admin-header p {
          margin: 8px 0 0;
          color: #69717e;
          font-size: 12px;
        }

        .admin-header-actions {
          display: flex;
          gap: 8px;
        }

        .admin-btn-secondary,
        .admin-btn-primary,
        .admin-btn-text {
          border: 1px solid #282e38;
          background: #12151b;
          color: #e8ebf1;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .admin-btn-secondary:hover:not(:disabled) {
          background: #1a1e26;
          border-color: #3a4050;
        }

        .admin-btn-primary {
          background: #8d69f2;
          border-color: #8d69f2;
          color: #fff;
        }

        .admin-btn-primary:hover:not(:disabled) {
          background: #7a58e8;
          border-color: #7a58e8;
        }

        .admin-btn-text {
          background: transparent;
          border: 0;
          color: #8d95a5;
          padding: 6px 10px;
        }

        .admin-btn-text:hover {
          color: #e8ebf1;
        }

        .admin-btn-secondary:disabled,
        .admin-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-btn-icon {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid #282e38;
          background: #12151b;
          color: #e8ebf1;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .admin-btn-icon:hover:not(:disabled) {
          background: #1a1e26;
        }

        .admin-btn-edit:hover {
          border-color: #8d69f2;
          color: #8d69f2;
        }

        .admin-btn-delete:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .admin-btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-alert {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          align-items: flex-start;
        }

        .admin-alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .admin-alert-success {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #86efac;
        }

        .admin-alert strong {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .admin-alert p {
          margin: 0;
          font-size: 11px;
          opacity: 0.9;
        }

        .admin-card {
          background: #101218;
          border: 1px solid #1e232b;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .admin-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #1a1f26;
        }

        .admin-card-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #f0f2f5;
        }

        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .admin-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .admin-form-group label {
          font-size: 11px;
          font-weight: 700;
          color: #8d95a5;
        }

        .admin-form-group input,
        .admin-form-group select,
        .admin-form-group textarea {
          padding: 10px 12px;
          border: 1px solid #242934;
          border-radius: 10px;
          background: #0b0d11;
          color: #e8ebf1;
          font-size: 12px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .admin-form-group input:focus,
        .admin-form-group select:focus,
        .admin-form-group textarea:focus {
          border-color: #8d69f2;
        }

        .admin-form-group input:disabled,
        .admin-form-group select:disabled,
        .admin-form-group textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .admin-form-group textarea {
          resize: vertical;
          min-height: 70px;
        }

        .upload-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-input-hidden {
          display: none;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #171b22;
          border: 1px dashed #3a4253;
          border-radius: 10px;
          color: #c9ced6;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-btn:hover {
          border-color: #8d69f2;
          color: #8d69f2;
          background: #1d222b;
        }

        .upload-preview {
          position: relative;
          width: 44px;
          height: 44px;
        }

        .upload-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #3a4253;
        }

        .remove-img-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 50%;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-form-checkbox {
          padding-top: 4px;
        }

        .admin-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 12px;
          color: #c9ced6;
        }

        .admin-checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #8d69f2;
          cursor: pointer;
        }

        .admin-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid #1a1f26;
        }

        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
          color: #69717e;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #282e38;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .admin-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
          color: #69717e;
          text-align: center;
        }

        .admin-empty span {
          font-size: 48px;
        }

        .admin-empty p {
          margin: 0;
          font-size: 13px;
        }

        .admin-menu-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-category-section {
          background: #101218;
          border: 1px solid #1e232b;
          border-radius: 16px;
          overflow: hidden;
        }

        .admin-category-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: #141821;
          border-bottom: 1px solid #1a1f26;
        }

        .admin-category-icon {
          font-size: 18px;
        }

        .admin-category-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
          color: #f0f2f5;
        }

        .admin-category-count {
          margin-left: auto;
          font-size: 11px;
          color: #69717e;
          background: #1a1f26;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .admin-items-table-wrapper {
          overflow-x: auto;
        }

        .admin-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .admin-items-table th {
          text-align: right;
          padding: 12px 16px;
          background: #0d1016;
          color: #69717e;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #1a1f26;
        }

        .admin-items-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #141821;
          vertical-align: middle;
        }

        .admin-items-table tr:last-child td {
          border-bottom: 0;
        }

        .admin-item-disabled {
          opacity: 0.5;
        }

        .admin-item-name {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-item-image-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          overflow: hidden;
          background: #171b22;
          border: 1px solid #242934;
          flex-shrink: 0;
        }

        .admin-item-image-tag {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .admin-item-placeholder {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #171b22;
          border: 1px solid #242934;
          border-radius: 8px;
          font-size: 20px;
          flex-shrink: 0;
        }

        .admin-item-text-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-item-text-info strong {
          font-size: 13px;
          color: #e8ebf1;
        }

        .admin-item-category {
          font-size: 9px;
          color: #69717e;
          text-transform: uppercase;
        }

        .admin-item-desc {
          font-size: 11px;
          color: #8d95a5;
          max-width: 200px;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-item-price {
          color: #ffd000;
          font-size: 13px;
        }

        .admin-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
        }

        .admin-status-active {
          background: rgba(34, 197, 94, 0.1);
          color: #86efac;
        }

        .admin-status-inactive {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }

        .admin-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .admin-dot-active {
          background: #22c55e;
        }

        .admin-dot-inactive {
          background: #ef4444;
        }

        .admin-item-actions {
          display: flex;
          gap: 6px;
        }

        @media (max-width: 640px) {
          .admin-form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminShell>
  );
}