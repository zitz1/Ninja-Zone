"use client";

import { useEffect, useState } from "react";
import { CustomerShell } from "@/components/customer-shell";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string | null;
};

// دالة تقرأ اسم العنصر وتحدد الإيموجي المناسب كبديل للصورة
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
  if (n.includes("بيبسي") || n.includes("موهيتو") || n.includes("عصير") || n.includes("مياه")) return "🥤";
  
  if (category === "عروض") return "🎁";
  if (category === "مشروبات") return "🥤";
  if (category === "حلويات") return "🍰";
  return "🍽️";
};

// دالة ذكية لتصليح أي رابط صورة حتى لو كان ناقص /
const getValidImageUrl = (url: string | null | undefined) => {
  if (!url || typeof url !== "string" || url.trim() === "") return null;
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith("http") || cleanUrl.startsWith("data:image")) return cleanUrl;
  
  // إضافة السلاش المفقود حتى يشتغل المسار المحلي بشكل صحيح
  if (!cleanUrl.startsWith("/")) {
    cleanUrl = "/" + cleanUrl;
  }
  return cleanUrl;
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["الكل"]);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        // إضافة وقت لكسر الكاش حتى نجلب أحدث البيانات دائماً
        const res = await fetch(`/api/menu-items?t=${new Date().getTime()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const menuArray = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
          setItems(menuArray);

          const uniqueCats = Array.from(
            new Set(menuArray.map((item) => item.category))
          ).filter(Boolean);
          setCategories(["الكل", ...uniqueCats]);
        }
      } catch (err) {
        console.error("فشل جلب عناصر المنيو", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  const filteredItems =
    activeCategory === "الكل"
      ? items
      : items.filter((item) => item.category === activeCategory);

  return (
    <CustomerShell>
      <main className="nz-container" style={{ padding: "32px 16px" }}>
        <header style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#fff" }}>
            اختياراتنا
          </h1>
          <p style={{ color: "#7a8494", marginTop: "4px", fontSize: "14px" }}>
            استمتع بأفضل المأكولات والمشروبات المتاحة في السنتر
          </p>
        </header>

        {/* تصنيفات المنيو */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingBottom: "12px",
            marginBottom: "24px",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 18px",
                borderRadius: "12px",
                border: "1px solid",
                borderColor: activeCategory === cat ? "#8d69f2" : "#1e232b",
                background: activeCategory === cat ? "#8d69f2" : "#0d0f13",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "13px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* شبكة العناصر */}
        {loading ? (
          <div style={{ color: "#7a8494", padding: "40px 0", textAlign: "center" }}>
            جاري تحميل المنيو...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ color: "#7a8494", padding: "40px 0", textAlign: "center" }}>
            لا توجد عناصر متاحة في هذا القسم حالياً.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredItems.map((item) => {
              const validImageSrc = getValidImageUrl(item.imageUrl);
              
              // تنظيف الوصف: إذا كان الوصف يحتوي على مسار الصورة بالغلط، نقوم بإخفائه
              let finalDescription = item.description;
              if (finalDescription && (finalDescription.includes("uploads/") || finalDescription.includes("http"))) {
                finalDescription = ""; 
              }

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#0d0f13",
                    border: "1px solid #1a1e26",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  {/* عرض الصورة أو الإيموجي */}
                  <div
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#161922",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #232834",
                    }}
                  >
                    {validImageSrc ? (
                      <img
                        src={validImageSrc}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<span style="font-size: 28px;">${getItemEmoji(item.name, item.category)}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "28px" }}>
                        {getItemEmoji(item.name, item.category)}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: "#fff",
                        marginBottom: "4px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </h3>

                    {/* عرض الوصف فقط إذا كان نظيفاً وليس رابطاً */}
                    {finalDescription && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#6c7685",
                          marginBottom: "8px",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {finalDescription}
                      </p>
                    )}

                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: "#8d69f2",
                      }}
                    >
                      {item.price.toLocaleString()} د.ع
                    </div>
                  </div>

                  <button
                    style={{
                      background: item.available ? "#161a23" : "#111318",
                      color: item.available ? "#fff" : "#4a5260",
                      border: "1px solid #242a36",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: item.available ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                    disabled={!item.available}
                  >
                    {item.available ? "+ أضف" : "غير متاح"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </CustomerShell>
  );
}