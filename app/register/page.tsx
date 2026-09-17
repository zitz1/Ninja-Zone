"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("أدخل اسمك بشكل صحيح.");
      return;
    }

    if (!/^07\d{9}$/.test(cleanPhone)) {
      setError("رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 11 رقم.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف أو أكثر.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "تعذر إنشاء الحساب.");
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إنشاء الحساب حالياً.",
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
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(124, 58, 237, 0.16),
              transparent 34%
            ),
            #060609;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          direction: rtl;
          font-family:
            "Cairo",
            "Tajawal",
            Arial,
            sans-serif;
        }

        .shell {
          width: 100%;
          max-width: 390px;
          min-height: 720px;
          background:
            linear-gradient(
              180deg,
              #18181d 0%,
              #151519 45%,
              #141419 100%
            );
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          box-shadow:
            0 28px 90px rgba(0, 0, 0, 0.52),
            0 0 50px rgba(124, 58, 237, 0.05);
        }

        .corner {
          position: absolute;
          top: 0;
          right: 0;
          width: 110px;
          height: 110px;
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.12),
            rgba(59, 130, 246, 0.02)
          );
          clip-path: polygon(45% 0, 100% 0, 100% 100%, 0 0);
          pointer-events: none;
        }

        .content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 28px 15px 20px;
        }

        .brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
        }

        .logoBox {
          width: 108px;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .logo {
          width: 108px;
          height: 74px;
          object-fit: contain;
          object-position: center;
          display: block;
        }

        .brandName {
          font-size: 13px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .brandSub {
          margin-top: 6px;
          font-size: 8px;
          letter-spacing: 0.24em;
          color: rgba(255, 255, 255, 0.27);
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
          margin-bottom: 27px;
        }

        .tab {
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.38);
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .tabActive {
          color: #fff;
          background:
            linear-gradient(
              135deg,
              #8b5cf6 0%,
              #7045e8 100%
            );
          box-shadow:
            0 6px 18px rgba(112, 69, 232, 0.22);
        }

        .error {
          width: 100%;
          margin-bottom: 17px;
          padding: 10px 12px;
          border-radius: 9px;
          border: 1px solid rgba(248, 113, 113, 0.15);
          background: rgba(239, 68, 68, 0.07);
          color: #fca5a5;
          font-size: 11px;
          line-height: 1.7;
        }

        .field {
          width: 100%;
          margin-bottom: 15px;
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
          font-family: inherit;
          font-size: 12px;
          padding: 0 12px;
          transition: 0.2s ease;
        }

        .input::placeholder {
          color: rgba(255, 255, 255, 0.19);
        }

        .input:focus {
          border-color: rgba(139, 92, 246, 0.45);
          background: #0a0a0d;
          box-shadow:
            0 0 0 3px rgba(139, 92, 246, 0.05);
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
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 8px;
        }

        .mainButton {
          width: 100%;
          height: 48px;
          margin-top: 4px;
          border: 0;
          border-radius: 9px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              #8b5cf6 0%,
              #7045e8 100%
            );
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 9px 24px rgba(112, 69, 232, 0.2);
          transition: 0.15s ease;
        }

        .mainButton:hover {
          filter: brightness(1.08);
        }

        .mainButton:active {
          transform: scale(0.99);
        }

        .mainButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .loginLink {
          display: block;
          width: 100%;
          margin-top: 18px;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.31);
          font-family: inherit;
          font-size: 11px;
          cursor: pointer;
        }

        .loginLink:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .back {
          width: 100%;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.2);
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
          margin-top: 27px;
        }

        .footer {
          text-align: center;
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.12);
          font-size: 8px;
          letter-spacing: 0.16em;
        }

        @media (max-width: 420px) {
          .page {
            padding: 0;
          }

          .shell {
            min-height: 100vh;
            border-radius: 0;
            border-left: 0;
            border-right: 0;
          }
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
              <div className="brandSub">GAMING CENTER</div>
            </div>

            <div className="tabs">
              <button
                type="button"
                className="tab"
                onClick={() => router.push("/login")}
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                className="tab tabActive"
              >
                حساب جديد
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label
                  htmlFor="name"
                  className="label"
                >
                  الاسم الكامل
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value.slice(0, 80),
                    )
                  }
                  placeholder="اسمك"
                  className="input"
                />
              </div>

              <div className="field">
                <label
                  htmlFor="phone"
                  className="label"
                >
                  رقم الواتساب
                </label>

                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11),
                    )
                  }
                  placeholder="07xxxxxxxxx"
                  className="input phoneInput"
                />
              </div>

              <div className="field">
                <label
                  htmlFor="password"
                  className="label"
                >
                  كلمة المرور
                </label>

                <div className="inputWrap">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    className="input passwordInput"
                  />

                  <button
                    type="button"
                    className="eye"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showPassword ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <div className="field">
                <label
                  htmlFor="confirmPassword"
                  className="label"
                >
                  تأكيد كلمة المرور
                </label>

                <div className="inputWrap">
                  <input
                    id="confirmPassword"
                    type={
                      showConfirm
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value,
                      )
                    }
                    placeholder="••••••••"
                    className="input passwordInput"
                  />

                  <button
                    type="button"
                    className="eye"
                    onClick={() =>
                      setShowConfirm(
                        (value) => !value,
                      )
                    }
                  >
                    {showConfirm ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="mainButton"
                disabled={loading}
              >
                {loading
                  ? "جاري إنشاء الحساب..."
                  : "إنشاء الحساب"}
              </button>
            </form>

            <button
              type="button"
              className="loginLink"
              onClick={() => router.push("/login")}
            >
              لديك حساب؟ تسجيل الدخول
            </button>

            <button
              type="button"
              className="back"
              onClick={() => router.push("/")}
            >
              العودة إلى الموقع
            </button>

            <div className="footer">
              NINJA ZONE GAMING CENTER
            </div>
          </div>
        </section>
      </main>
    </>
  );
}