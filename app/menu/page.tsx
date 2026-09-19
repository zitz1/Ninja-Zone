"use client";

import { CustomerShell } from "@/components/customer-shell";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  imageUrl: string | null;
};

type CartLine = Item & {
  quantity: number;
};

type LocationType = "جهاز" | "طاولة" | "سينما" | "بليارد";

const cats = ["الكل", "وجبات", "سناكات", "مشروبات", "عروض"];

const locations: {
  type: LocationType;
  icon: string;
  description: string;
  options: string[];
}[] = [
  {
    type: "جهاز",
    icon: "🎮",
    description: "حدد الجهاز الذي تجلس عليه",
    options: [
      "PC Normal 01", "PC Normal 02", "PC Normal 03", "PC Normal 04",
      "PC Normal 05", "PC Normal 06", "PC Normal 07", "PC Normal 08",
      "PC Master 01", "PC Master 02", "PC Master 03", "PC Master 04",
      "PC Master 05", "PC Master 06", "PC Master 07", "PC Master 08",
      "PS5 01", "PS5 02", "PS5 03", "PS5 04", "PS5 05",
      "PS5 06", "PS5 07", "PS5 08", "PS5 09", "PS5 10",
    ],
  },
  {
    type: "طاولة",
    icon: "🪑",
    description: "حدد رقم الطاولة",
    options: [
      "طاولة 01", "طاولة 02", "طاولة 03", "طاولة 04",
      "طاولة 05", "طاولة 06", "طاولة 07", "طاولة 08",
    ],
  },
  {
    type: "سينما",
    icon: "🎬",
    description: "حدد غرفة السينما",
    options: [
      "Cinema 01", "Cinema 02", "Cinema 03", "Cinema 04",
    ],
  },
  {
    type: "بليارد",
    icon: "🎱",
    description: "حدد طاولة البليارد",
    options: [
      "Billiard 01", "Billiard 02",
    ],
  },
];

const money = (n: number) =>
  new Intl.NumberFormat("ar-IQ").format(n) + " د.ع";

const statusLabel = (s: string) =>
  ({
    PENDING: "بانتظار الكاشير",
    PREPARING: "جاري التحضير",
    READY: "جاهز للاستلام",
    COMPLETED: "تم التسليم",
    CANCELLED: "ملغي",
  }[s] || s);

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

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("الكل");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [locationType, setLocationType] =
    useState<LocationType | "">("");

  const [locationLabel, setLocationLabel] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [success, setSuccess] = useState<{
    id: string;
    total: number;
    status: string;
    locationType: string;
    locationLabel: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/menu/items?t=${new Date().getTime()}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));

        if (!r.ok) {
          throw new Error(
            d.error ||
              `تعذر تحميل المنيو (${r.status}).`
          );
        }

        if (!Array.isArray(d.items)) {
          throw new Error(
            "استجابة المنيو غير صحيحة."
          );
        }

        setItems(d.items);
        setError("");
      })
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "تعذر تحميل المنيو."
        )
      );
  }, []);

  const shown = useMemo(
    () =>
      active === "الكل"
        ? items
        : items.filter(
            (x) => x.category === active
          ),
    [items, active]
  );

  const count = cart.reduce(
    (s, x) => s + x.quantity,
    0
  );

  const total = cart.reduce(
    (s, x) => s + x.price * x.quantity,
    0
  );

  function add(item: Item) {
    setCart((c) => {
      const old = c.find(
        (x) => x.id === item.id
      );

      return old
        ? c.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  quantity: x.quantity + 1,
                }
              : x
          )
        : [
            ...c,
            {
              ...item,
              quantity: 1,
            },
          ];
    });
  }

  function change(
    id: string,
    d: number
  ) {
    setCart((c) =>
      c.flatMap((x) =>
        x.id !== id
          ? [x]
          : [
              {
                ...x,
                quantity: x.quantity + d,
              },
            ].filter(
              (y) => y.quantity > 0
            )
      )
    );
  }

  function selectLocationType(
    type: LocationType
  ) {
    setLocationType(type);
    setLocationLabel("");
    setError("");
  }

  async function submit() {
    setError("");

    if (name.trim().length < 2) {
      setError("اكتب اسمك.");
      return;
    }

    if (!/^07\d{9}$/.test(phone.trim())) {
      setError(
        "رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 07."
      );
      return;
    }

    if (!locationType) {
      setError(
        "حدد مكان جلوسك أو جهازك."
      );
      return;
    }

    if (!locationLabel) {
      setError(
        "حدد رقم الجهاز أو الطاولة."
      );
      return;
    }

    if (cart.length === 0) {
      setError("السلة فارغة.");
      return;
    }

    setBusy(true);

    try {
      const r = await fetch(
        "/api/menu/orders",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            customerName: name,
            phone,
            note,
            locationType,
            locationLabel,
            items: cart.map((x) => ({
              id: x.id,
              quantity: x.quantity,
            })),
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw new Error(
          d.error ||
            "تعذر إرسال الطلب."
        );
      }

      setSuccess({
        id: d.order.id,
        total: d.order.totalAmount,
        status: d.order.status,
        locationType:
          d.order.locationType,
        locationLabel:
          d.order.locationLabel,
      });

      setCart([]);
      setCheckout(false);
      setOpen(false);

      setName("");
      setPhone("");
      setNote("");
      setLocationType("");
      setLocationLabel("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "تعذر إرسال الطلب."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CustomerShell>
        <main className="nz-container nz-page-shell nz-menu-modern" style={{ paddingBottom: "220px" }}>

          {/* HEADER */}

          <header className="nz-page-titlebar">
            <div>
              <span className="nz-label">
                NINJA ZONE • MENU
              </span>

              <h1>المنيو</h1>

              <p>
                اطلب أكلك ومشروبك وأنت بمكانك،
                والطلب يوصل مباشرة للكاشير.
              </p>
            </div>

            <button
              className="nz-menu-cart-btn"
              onClick={() => setOpen(true)}
            >
              🛒 السلة <b>{count}</b>
            </button>
          </header>


          {/* HERO */}

          <section className="nz-menu-hero">
            <div className="nz-menu-hero-copy">
              <span className="nz-menu-kicker">
                PLAY • EAT • REPEAT
              </span>

              <h2>
                اختار طلبك
                <br />
                <b>
                  وخلي اللعب مستمر.
                </b>
              </h2>

              <p>
                الوجبات تشمل البطاطا والأكل
                المالح، والسناكات مخصصة
                للحلويات مثل الكريب والكيك
                والوافل.
              </p>
            </div>

            <div className="nz-menu-hero-orb">
              <span>{count}</span>
              <small>طلب بالسلة</small>
            </div>
          </section>


          {/* CATEGORIES */}

          <div
            className="nz-menu-tabs"
            role="tablist"
          >
            {cats.map((c) => (
              <button
                key={c}
                className={
                  active === c
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActive(c)
                }
              >
                <span>
                  {c === "وجبات"
                    ? "🍔"
                    : c === "سناكات"
                    ? "🍰"
                    : c === "مشروبات"
                    ? "🥤"
                    : c === "عروض"
                    ? "✦"
                    : "☷"}
                </span>

                <strong>{c}</strong>

                <small>
                  {c === "وجبات"
                    ? "بطاطا وأكل"
                    : c === "سناكات"
                    ? "كريب وكيك"
                    : c === "مشروبات"
                    ? "بارد وساخن"
                    : c === "عروض"
                    ? "باقات مميزة"
                    : "كل الأصناف"}
                </small>
              </button>
            ))}
          </div>


          {error && (
            <div className="nz-menu-error">
              {error}
            </div>
          )}


          {/* MENU */}

          <section className="nz-menu-content">

            <div className="nz-menu-content-head">
              <div>
                <span className="nz-label">
                  {active}
                </span>

                <h2>اختياراتنا</h2>
              </div>

              <span>
                {shown.length} أصناف
              </span>
            </div>

            <div className="nz-menu-items">
              {shown.map((item) => {
                let actualImg = item.imageUrl;
                let actualDesc = item.description;

                if (actualDesc && (actualDesc.includes("uploads") || actualDesc.includes("http") || actualDesc.includes("data:image"))) {
                  actualImg = actualDesc;
                  actualDesc = null; 
                }

                if (actualImg && !actualImg.startsWith("/") && !actualImg.startsWith("http") && !actualImg.startsWith("data:")) {
                  actualImg = "/" + actualImg;
                }

                return (
                <article
                  key={item.id}
                  className="nz-menu-item-card nz-order-card"
                >
                  <div className="nz-menu-item-icon" style={{ overflow: "hidden", padding: 0 }}>
                    {actualImg ? (
                      <img 
                        src={actualImg} 
                        alt={item.name} 
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `<span>${getItemEmoji(item.name, item.category)}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span>{getItemEmoji(item.name, item.category)}</span>
                    )}
                  </div>

                  <div className="nz-order-info">
                    <h3>{item.name}</h3>

                    {actualDesc && (
                      <p>
                        {actualDesc}
                      </p>
                    )}

                    <strong>
                      {money(item.price)}
                    </strong>
                  </div>

                  <button
                    className="nz-add-btn"
                    onClick={() =>
                      add(item)
                    }
                  >
                    + أضف
                  </button>
                </article>
                );
              })}
            </div>

          </section>


          {/* SUCCESS */}

          {success && (
            <div className="nz-order-success">

              <div className="nz-success-icon">
                ✓
              </div>

              <h2>
                تم إرسال طلبك بنجاح
              </h2>

              <p>
                رقم الطلب:{" "}
                <b>
                  {success.id
                    .slice(-8)
                    .toUpperCase()}
                </b>
              </p>

              <p>
                المجموع:{" "}
                <b>
                  {money(
                    success.total
                  )}
                </b>
              </p>

              <p>
                📍 المكان:{" "}
                <b>
                  {success.locationLabel}
                </b>
              </p>

              <span>
                {statusLabel(
                  success.status
                )}
              </span>

              <button
                className="nz-btn nz-btn-primary"
                onClick={() =>
                  setSuccess(null)
                }
              >
                تمام
              </button>

            </div>
          )}


          {/* CART */}

          {open && (
            <div
              className="nz-cart-overlay"
              style={{ alignItems: "flex-end", paddingBottom: "100px" }}
              onMouseDown={(e) =>
                e.currentTarget ===
                  e.target &&
                setOpen(false)
              }
            >
              <aside className="nz-cart" style={{ paddingBottom: "140px", maxHeight: "80vh", overflowY: "auto" }}>

                <div className="nz-cart-head">
                  <h2>
                    سلة الطلب
                  </h2>

                  <button
                    onClick={() =>
                      setOpen(false)
                    }
                  >
                    ×
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="nz-cart-empty">
                    <span>🛒</span>

                    <h3>
                      السلة فارغة
                    </h3>

                    <p>
                      أضف وجبة أو سناك
                      أو مشروب حتى ترسل
                      طلبك.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="nz-cart-lines">

                      {cart.map((x) => (
                        <div
                          className="nz-cart-line"
                          key={x.id}
                        >
                          <div>
                            <b>
                              {x.name}
                            </b>

                            <small>
                              {money(
                                x.price
                              )}{" "}
                              ×{" "}
                              {x.quantity}
                            </small>
                          </div>

                          <div className="nz-qty">

                            <button
                              onClick={() =>
                                change(
                                  x.id,
                                  -1
                                )
                              }
                            >
                              −
                            </button>

                            <b>
                              {x.quantity}
                            </b>

                            <button
                              onClick={() =>
                                change(
                                  x.id,
                                  1
                                )
                              }
                            >
                              +
                            </button>

                          </div>
                        </div>
                      ))}

                    </div>

                    <div className="nz-cart-total">
                      <span>
                        المجموع
                      </span>

                      <b>
                        {money(total)}
                      </b>
                    </div>

                    <button
                      className="nz-btn nz-btn-primary nz-cart-submit"
                      onClick={() =>
                        setCheckout(true)
                      }
                      style={{ marginBottom: "60px" }}
                    >
                      متابعة وإرسال الطلب
                    </button>
                  </>
                )}

              </aside>
            </div>
          )}


          {/* CHECKOUT */}

          {checkout && (
            <div className="nz-cart-overlay" style={{ alignItems: "flex-end", paddingBottom: "100px", zIndex: 100 }}>

              <aside className="nz-checkout" style={{ paddingBottom: "180px", maxHeight: "80vh", overflowY: "auto" }}>

                <div className="nz-cart-head">
                  <h2>
                    بيانات الطلب
                  </h2>

                  <button
                    onClick={() =>
                      setCheckout(false)
                    }
                  >
                    ×
                  </button>
                </div>

                <p>
                  أدخل بياناتك ومكان جلوسك حتى
                  يعرف الكاشير والويتر أين يوصلون
                  الطلب.
                </p>


                {/* NAME */}

                <label>
                  الاسم

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    placeholder="اسمك"
                    maxLength={80}
                  />
                </label>


                {/* PHONE */}

                <label>
                  رقم الهاتف

                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            11
                          )
                      )
                    }
                    placeholder="07XXXXXXXXX"
                    inputMode="numeric"
                  />
                </label>


                {/* LOCATION */}

                <div className="nz-location-box">

                  <div className="nz-location-heading">
                    <strong>
                      📍 أين تريد استلام طلبك؟
                    </strong>

                    <span>
                      حدد مكانك داخل المركز
                    </span>
                  </div>


                  {/* LOCATION TYPES */}

                  <div className="nz-location-types">

                    {locations.map(
                      (location) => (
                        <button
                          type="button"
                          key={
                            location.type
                          }
                          className={
                            locationType ===
                            location.type
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            selectLocationType(
                              location.type
                            )
                          }
                        >

                          <span>
                            {
                              location.icon
                            }
                          </span>

                          <strong>
                            {
                              location.type
                            }
                          </strong>

                          <small>
                            {
                              location.description
                            }
                          </small>

                        </button>
                      )
                    )}

                  </div>


                  {/* LOCATION OPTIONS */}

                  {locationType && (
                    <div className="nz-location-options">

                      <div className="nz-location-options-title">
                        <strong>
                          اختر المكان
                        </strong>

                        <span>
                          {locationType}
                        </span>
                      </div>


                      <div className="nz-location-grid">

                        {locations
                          .find(
                            (x) =>
                              x.type ===
                              locationType
                          )
                          ?.options.map(
                            (option) => (
                              <button
                                type="button"
                                key={
                                  option
                                }
                                className={
                                  locationLabel ===
                                  option
                                    ? "active"
                                    : ""
                                }
                                onClick={() => {
                                  setLocationLabel(
                                    option
                                  );
                                  setError(
                                    ""
                                  );
                                }}
                              >
                                {option}
                              </button>
                            )
                          )}

                      </div>

                    </div>
                  )}


                  {/* SELECTED */}

                  {locationLabel && (
                    <div className="nz-selected-location">

                      <span>
                        ✓
                      </span>

                      <div>
                        <small>
                          مكان استلام الطلب
                        </small>

                        <strong>
                          {
                            locationLabel
                          }
                        </strong>
                      </div>

                    </div>
                  )}

                </div>


                {/* NOTE */}

                <label>
                  ملاحظة{" "}
                  <small>
                    اختياري
                  </small>

                  <textarea
                    value={note}
                    onChange={(e) =>
                      setNote(
                        e.target.value
                      )
                    }
                    maxLength={500}
                    placeholder="مثلاً: بدون بصل..."
                  />
                </label>


                {error && (
                  <div className="nz-menu-error">
                    {error}
                  </div>
                )}


                {/* TOTAL */}

                <div className="nz-cart-total">
                  <span>
                    المجموع
                  </span>

                  <b>
                    {money(total)}
                  </b>
                </div>


                <button
                  className="nz-btn nz-btn-primary nz-cart-submit"
                  disabled={busy}
                  onClick={submit}
                  style={{ marginBottom: "80px" }}
                >
                  {busy
                    ? "جاري الإرسال..."
                    : "إرسال الطلب للكاشير"}
                </button>

              </aside>

            </div>
          )}

        </main>
      </CustomerShell>


      {/* ==================================================
          LOCATION DESIGN
          ================================================== */}

      <style jsx>{`

        .nz-location-box {
          margin-top: 18px;
          padding: 16px;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              rgba(30, 22, 55, .95),
              rgba(12, 14, 28, .98)
            );

          border: 1px solid
            rgba(139, 92, 246, .22);

          box-shadow:
            inset 0 1px 0
              rgba(255,255,255,.025),
            0 12px 35px
              rgba(0,0,0,.25);
        }


        .nz-location-heading {
          display: flex;
          flex-direction: column;

          gap: 4px;

          margin-bottom: 13px;
        }


        .nz-location-heading strong {
          color: #fff;

          font-size: 15px;
          font-weight: 800;
        }


        .nz-location-heading span {
          color: #8587a3;

          font-size: 11px;
        }


        .nz-location-types {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 9px;
        }


        .nz-location-types button {
          appearance: none;
          -webkit-appearance: none;

          width: 100%;
          min-height: 82px;

          padding: 10px 7px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 5px;

          border-radius: 14px;

          border: 1px solid
            rgba(255,255,255,.07);

          background:
            linear-gradient(
              145deg,
              rgba(31,33,54,.96),
              rgba(18,20,36,.98)
            );

          color: #fff;

          cursor: pointer;

          transition:
            transform .18s ease,
            border-color .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }


        .nz-location-types button:hover {
          transform: translateY(-2px);

          border-color:
            rgba(139,92,246,.55);

          background:
            linear-gradient(
              145deg,
              rgba(45,35,78,.98),
              rgba(20,22,42,1)
            );

          box-shadow:
            0 8px 22px
              rgba(124,58,237,.12);
        }


        .nz-location-types button.active {
          border-color:
            rgba(139,92,246,.95);

          background:
            linear-gradient(
              145deg,
              rgba(91,55,170,.52),
              rgba(37,28,76,.95)
            );

          box-shadow:
            0 0 0 1px
              rgba(139,92,246,.18),
            0 0 24px
              rgba(124,58,237,.22),
            inset 0 0 25px
              rgba(124,58,237,.08);
        }


        .nz-location-types button > span {
          font-size: 23px;

          line-height: 1;

          filter:
            drop-shadow(
              0 0 5px
              rgba(139,92,246,.15)
            );
        }


        .nz-location-types button strong {
          color: #f5f3ff;

          font-size: 13px;
          font-weight: 800;
        }


        .nz-location-types button.active strong {
          color: #c4b5fd;
        }


        .nz-location-types button small {
          color: #777b98;

          font-size: 9px;

          text-align: center;

          line-height: 1.3;
        }


        .nz-location-options {
          margin-top: 15px;

          padding-top: 14px;

          border-top: 1px solid
            rgba(255,255,255,.06);
        }


        .nz-location-options-title {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 10px;

          margin-bottom: 10px;
        }


        .nz-location-options-title strong {
          color: #fff;

          font-size: 13px;
          font-weight: 800;
        }


        .nz-location-options-title span {
          padding: 4px 9px;

          border-radius: 999px;

          background:
            rgba(139,92,246,.12);

          border: 1px solid
            rgba(139,92,246,.2);

          color: #a78bfa;

          font-size: 10px;
          font-weight: 800;
        }


        .nz-location-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 7px;

          max-height: 220px;

          overflow-y: auto;

          padding-right: 2px;
        }


        .nz-location-grid::-webkit-scrollbar {
          width: 4px;
        }


        .nz-location-grid::-webkit-scrollbar-track {
          background: transparent;
        }


        .nz-location-grid::-webkit-scrollbar-thumb {
          background:
            rgba(139,92,246,.35);

          border-radius: 999px;
        }


        .nz-location-grid button {
          appearance: none;
          -webkit-appearance: none;

          width: 100%;

          min-height: 42px;

          padding: 7px 8px;

          border-radius: 10px;

          border: 1px solid
            rgba(255,255,255,.07);

          background:
            rgba(255,255,255,.035);

          color: #b9bbce;

          font-size: 11px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background .18s ease,
            border-color .18s ease,
            color .18s ease,
            transform .18s ease,
            box-shadow .18s ease;
        }


        .nz-location-grid button:hover {
          transform: translateY(-1px);

          border-color:
            rgba(139,92,246,.5);

          background:
            rgba(139,92,246,.1);

          color: #ddd6fe;
        }


        .nz-location-grid button.active {
          border-color: #8b5cf6;

          background:
            linear-gradient(
              135deg,
              rgba(124,58,237,.72),
              rgba(59,130,246,.5)
            );

          color: #fff;

          box-shadow:
            0 0 16px
              rgba(124,58,237,.22);
        }


        .nz-selected-location {
          display: flex;

          align-items: center;

          gap: 10px;

          margin-top: 12px;

          padding: 10px 12px;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              rgba(34,197,94,.08),
              rgba(16,185,129,.035)
            );

          border: 1px solid
            rgba(34,197,94,.2);
        }


        .nz-selected-location > span {
          width: 27px;
          height: 27px;

          flex: 0 0 27px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(34,197,94,.13);

          color: #4ade80;

          font-size: 13px;
          font-weight: 900;
        }


        .nz-selected-location div {
          display: flex;

          flex-direction: column;

          gap: 2px;
        }


        .nz-selected-location small {
          color: #7f849c;

          font-size: 9px;
        }


        .nz-selected-location strong {
          color: #86efac;

          font-size: 12px;
        }


        @media (min-width: 700px) {

          .nz-location-types {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .nz-location-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

        }


        @media (max-width: 520px) {

          .nz-location-box {
            padding: 13px;

            border-radius: 16px;
          }

          .nz-location-types {
            gap: 7px;
          }

          .nz-location-types button {
            min-height: 76px;

            border-radius: 12px;
          }

          .nz-location-types button > span {
            font-size: 21px;
          }

        }

      `}</style>
    </>
  );
}