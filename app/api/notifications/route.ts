import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ notifications: [] });
    }

    // جلب إشعارات المستخدم الحالية أو إشعارات دور المستخدم (مثلاً الكاشير/الأدمن)
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: session.id },
          { role: session.role },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ notifications: [] });
  }
}

export async function PATCH() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    // تحديد كل الإشعارات كمقروءة عند فتح القائمة
    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: session.id },
          { role: session.role },
        ],
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}