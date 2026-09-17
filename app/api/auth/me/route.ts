import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("GET /api/auth/me failed:", error);

    return NextResponse.json(
      { error: "تعذر التحقق من الجلسة." },
      { status: 500 },
    );
  }
}