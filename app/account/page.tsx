import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";

import styles from "./account.module.css";

export const dynamic = "force-dynamic";

function getRoleInfo(role: "CUSTOMER" | "CASHIER" | "ADMIN") {
  switch (role) {
    case "ADMIN":
      return {
        label: "مدير النظام",
        description: "لديك صلاحيات كاملة لإدارة Ninja Zone.",
        className: styles.admin,
      };

    case "CASHIER":
      return {
        label: "الكاشير",
        description: "إدارة الطلبات ومتابعة حالة الحجوزات والطلبات.",
        className: styles.cashier,
      };

    default:
      return {
        label: "عميل",
        description: "احجز جهازك واطلب من المنيو وتابع حجوزاتك.",
        className: styles.customer,
      };
  }
}

export default async function AccountPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const role = getRoleInfo(user.role);

  const initial =
    user.name?.trim()?.charAt(0)?.toUpperCase() || "N";

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>MY ACCOUNT</span>

          <h1>حسابي</h1>

          <p>
            إدارة حسابك ومعلوماتك والوصول السريع إلى خدمات
            Ninja Zone.
          </p>
        </div>

        <div className={styles.headerRole}>
          <span className={role.className}>
            {role.label}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Profile */}
        <section className={styles.profileCard}>
          <div className={styles.profileTop}>
            <div className={styles.avatar}>{initial}</div>

            <div className={styles.profileIdentity}>
              <h2>{user.name}</h2>

              <span>{role.label}</span>
            </div>
          </div>

          <div className={styles.line} />

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>
                <span className={styles.infoIcon}>☎</span>
                <span>رقم الهاتف</span>
              </div>

              <strong dir="ltr">{user.phone}</strong>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>
                <span className={styles.infoIcon}>◈</span>
                <span>نوع الحساب</span>
              </div>

              <strong>{role.label}</strong>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>
                <span className={styles.infoIcon}>✓</span>
                <span>حالة الحساب</span>
              </div>

              <strong className={styles.activeStatus}>
                <i />
                نشط
              </strong>
            </div>
          </div>

          <LogoutButton />
        </section>

        {/* Main content */}
        <div className={styles.content}>
          <section className={styles.welcomeCard}>
            <div className={styles.welcomeGlow} />

            <div className={styles.welcomeContent}>
              <span className={styles.eyebrow}>
                NINJA ZONE
              </span>

              <h2>
                أهلاً بك،
                <span>{user.name}</span>
              </h2>

              <p>{role.description}</p>
            </div>
          </section>

          {/* CASHIER */}
          {user.role === "CASHIER" && (
            <section className={styles.roleCard}>
              <div className={styles.roleIcon}>▣</div>

              <div className={styles.roleBody}>
                <span className={styles.smallTitle}>
                  CASHIER PANEL
                </span>

                <h3>لوحة الكاشير</h3>

                <p>
                  افتح لوحة الكاشير لمتابعة الطلبات الجديدة،
                  معرفة موقع العميل، وتحديث حالة الطلبات.
                </p>

                <Link
                  href="/cashier"
                  className={styles.primaryButton}
                >
                  فتح لوحة الكاشير
                  <span>←</span>
                </Link>
              </div>
            </section>
          )}

          {/* ADMIN */}
          {user.role === "ADMIN" && (
            <section className={styles.roleCard}>
              <div className={styles.roleIcon}>◆</div>

              <div className={styles.roleBody}>
                <span className={styles.smallTitle}>
                  ADMIN PANEL
                </span>

                <h3>لوحة الإدارة</h3>

                <p>
                  إدارة الأجهزة والحجوزات والمنيو والمستخدمين
                  وإعدادات المركز.
                </p>

                <Link
                  href="/admin"
                  className={styles.primaryButton}
                >
                  فتح لوحة الإدارة
                  <span>←</span>
                </Link>
              </div>
            </section>
          )}

          {/* CUSTOMER */}
          {user.role === "CUSTOMER" && (
            <div className={styles.actionsGrid}>
              <Link
                href="/sections"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>◫</div>

                <div>
                  <h3>احجز جهازك</h3>
                  <p>اختر القسم والجهاز والوقت المناسب.</p>
                </div>

                <span>←</span>
              </Link>

              <Link
                href="/bookings"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>□</div>

                <div>
                  <h3>حجوزاتي</h3>
                  <p>تابع جميع حجوزاتك الحالية والسابقة.</p>
                </div>

                <span>←</span>
              </Link>

              <Link
                href="/menu"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>☷</div>

                <div>
                  <h3>المنيو</h3>
                  <p>اطلب الأكل والمشروبات من مكانك.</p>
                </div>

                <span>←</span>
              </Link>

              <Link
                href="/support"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>◌</div>

                <div>
                  <h3>الدعم والمساعدة</h3>
                  <p>تواصل مع فريق Ninja Zone.</p>
                </div>

                <span>←</span>
              </Link>
            </div>
          )}

          <section className={styles.securityCard}>
            <div>
              <span className={styles.securityDot} />
            </div>

            <div>
              <h3>حسابك محمي</h3>
              <p>
                جلسة الدخول الخاصة بك مرتبطة بهذا الحساب ولا
                يتم عرض كلمة المرور داخل الموقع.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}