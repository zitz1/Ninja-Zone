import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = cleanText(body?.name, 80);
    const phone = cleanText(body?.phone, 20);
    const password = typeof body?.password === "string" ? body.password : "";

    if (name.length < 2) {
      return NextResponse.json(
        { error: "اكتب اسمك بشكل صحيح." },
        { status: 400 },
      );
    }

    if (!/^07\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 07." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 8 أحرف أو أكثر." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "رقم الهاتف مستخدم مسبقاً." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    });

    await createSession({
  id: user.id,
  phone: user.phone,
  name: user.name ?? "",
  role: user.role as "CUSTOMER" | "CASHIER" | "ADMIN",
});

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/auth/register failed:", error);

    return NextResponse.json(
      { error: "تعذر إنشاء الحساب حالياً." },
      { status: 500 },
    );
  }
}