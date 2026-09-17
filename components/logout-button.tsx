"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      style={{
        width: "100%",
        height: "44px",
        marginTop: "20px",
        borderRadius: "11px",
        border: "1px solid rgba(239,68,68,.13)",
        background: "rgba(239,68,68,.045)",
        color: "rgba(248,113,113,.78)",
        fontFamily: "inherit",
        fontSize: "11px",
        fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.55 : 1,
        transition: "all .2s ease",
      }}
    >
      {loading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
    </button>
  );
}