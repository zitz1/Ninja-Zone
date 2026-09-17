import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = cleanText(body?.phone, 20);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!/^07\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 07." },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "اكتب كلمة المرور." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة." },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "هذا الحساب غير فعال حالياً." },
        { status: 403 },
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة." },
        { status: 401 },
      );
    }

    await createSession({
      id: user.id,
      phone: user.phone,
      name: user.name ?? "",
      role: user.role as "CUSTOMER" | "CASHIER" | "ADMIN",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name ?? "",
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);

    return NextResponse.json(
      { error: "تعذر تسجيل الدخول حالياً." },
      { status: 500 },
    );
  }
}