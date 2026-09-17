"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");

    if (!/^07\d{9}$/.test(cleanPhone)) {
      setError("رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 11 رقم.");
      return;
    }

    if (!password) {
      setError("أدخل كلمة المرور.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "تعذر تسجيل الدخول.");
      }

      if (data.user?.role === "ADMIN") {
        router.replace("/admin");
      } else if (data.user?.role === "CASHIER") {
        router.replace("/cashier");
      } else {
        router.replace("/");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تسجيل الدخول.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at 50% -10%, rgba(124, 58, 237, 0.16), transparent 34%), #060609;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          direction: rtl;
          font-family: "Cairo", "Tajawal", Arial, sans-serif;
        }

        .shell {
          width: 100%;
          max-width: 390px;
          min-height: 650px;
          background: linear-gradient(180deg, #18181d 0%, #151519 45%, #141419 100%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.52), 0 0 50px rgba(124, 58, 237, 0.05);
        }

        .corner {
          position: absolute;
          top: 0;
          right: 0;
          width: 110px;
          height: 110px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(59, 130, 246, 0.02));
          clip-path: polygon(45% 0, 100% 0, 100% 100%, 0 0);
          pointer-events: none;
        }

        .content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 28px 20px 20px;
        }

        .brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
        }

        .logoBox {
          width: 110px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 10px;
          background: #080911;
          padding: 5px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .brandName {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .tabs {
          width: 100%;
          height: 47px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: #09090b;
          margin-bottom: 30px;
        }

        .tab {
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.38);
          font-size: 12px;
          font-weight: 700;
        }

        .tabActive {
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6 0%, #7045e8 100%);
        }

        .error {
          width: 100%;
          margin-bottom: 18px;
          padding: 10px;
          border-radius: 9px;
          border: 1px solid rgba(248, 113, 113, 0.15);
          background: rgba(239, 68, 68, 0.07);
          color: #fca5a5;
          font-size: 11px;
        }

        .field {
          width: 100%;
          margin-bottom: 19px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 11px;
          font-weight: 600;
        }

        .inputWrap {
          width: 100%;
          position: relative;
        }

        .input {
          display: block;
          width: 100%;
          height: 46px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          outline: none;
          background: #08080a;
          color: #fff;
          font-size: 12px;
          padding: 0 12px;
        }

        .phoneInput {
          direction: ltr;
          text-align: left;
        }

        .passwordInput {
          padding-left: 44px;
        }

        .eye {
          position: absolute;
          left: 5px;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.27);
        }

        .mainButton {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 9px;
          color: #fff;
          background: linear-gradient(135deg, #8b5cf6 0%, #7045e8 100%);
          font-size: 13px;
          font-weight: 900;
        }

        .divider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0 14px;
        }

        .line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        .secondaryButton {
          width: 100%;
          height: 46px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #101014;
          color: rgba(255, 255, 255, 0.61);
          font-size: 12px;
          font-weight: 700;
        }

        .back {
          width: 100%;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.2);
          font-size: 11px;
          margin-top: 20px;
        }

        @media (max-width: 450px) {
          .page { padding: 0; background: #060609; }
          .shell { min-height: 100vh; border-radius: 0; border: none; display: flex; flex-direction: column; justify-content: center; }
        }
      `}</style>

      <main className="page">
        <section className="shell">
          <div className="corner" />

          <div className="content">
            <div className="brand">
              <div className="logoBox">
                <img
                  src="/ninja-zone-logo-reference.jpg"
                  alt="Ninja Zone"
                  className="logo"
                />
              </div>

              <div className="brandName">NINJA ZONE</div>
              <div style={{ fontSize: '9px', color: '#666', letterSpacing: '2px', marginTop: '5px' }}>GAMING CENTER</div>
            </div>

            <div className="tabs">
              <button type="button" className="tab tabActive">
                تسجيل الدخول
              </button>

              <button
                type="button"
                className="tab"
                onClick={() => router.push("/register")}
              >
                حساب جديد
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="phone" className="label">
                  رقم الواتساب
                </label>

                <div className="inputWrap">
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="07xxxxxxxxx"
                    className="input phoneInput"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password" className="label">
                  كلمة المرور
                </label>

                <div className="inputWrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input passwordInput"
                  />

                  <button
                    type="button"
                    className="eye"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <button type="submit" className="mainButton" disabled={loading}>
                {loading ? "جاري الدخول..." : "دخول"}
              </button>
            </form>

            <div className="divider">
              <div className="line" />
              <span style={{ fontSize: '10px', color: '#555' }}>أو</span>
              <div className="line" />
            </div>

            <button
              type="button"
              className="secondaryButton"
              onClick={() => router.push("/register")}
            >
              إنشاء حساب جديد
            </button>

            <button
              type="button"
              className="back"
              onClick={() => router.push("/")}
            >
              العودة إلى الموقع
            </button>
          </div>
        </section>
      </main>
    </>
  );
}