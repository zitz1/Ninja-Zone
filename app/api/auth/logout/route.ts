import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("POST /api/auth/logout failed:", error);

    return NextResponse.json(
      { error: "تعذر تسجيل الخروج حالياً." },
      { status: 500 },
    );
  }
}