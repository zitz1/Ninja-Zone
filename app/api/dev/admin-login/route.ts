import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_PHONE = "07851011864";
const ADMIN_PASSWORD = "Admin@2026";

export async function POST() {
  try {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const admin = await prisma.user.upsert({
      where: { phone: ADMIN_PHONE },
      update: {
        name: "مدير النظام",
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash,
      },
      create: {
        phone: ADMIN_PHONE,
        name: "مدير النظام",
        role: UserRole.ADMIN,
        isActive: true,
        passwordHash,
      },
    });

    await createSession({
      id: admin.id,
      phone: admin.phone,
      name: admin.name ?? "مدير النظام",
      role: "ADMIN",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("POST /api/dev/admin-login failed:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء جلسة الأدمن." },
      { status: 500 },
    );
  }
}