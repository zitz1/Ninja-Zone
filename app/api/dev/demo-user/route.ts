import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const passwordHash = await hashPassword("NinjaZone@2026");

    const user = await prisma.user.upsert({
      where: {
        phone: "+9647700000000",
      },
      update: {
        name: "Ninja Zone Demo",
        role: UserRole.CUSTOMER,
        isActive: true,
        passwordHash,
      },
      create: {
        phone: "+9647700000000",
        name: "Ninja Zone Demo",
        role: UserRole.CUSTOMER,
        isActive: true,
        passwordHash,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/dev/demo-user failed:", error);

    return NextResponse.json(
      { error: "تعذر إنشاء مستخدم التجربة." },
      { status: 500 },
    );
  }
}