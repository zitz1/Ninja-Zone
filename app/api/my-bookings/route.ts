import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
    }

    // 1. جلب حجوزات الأجهزة الخاصة بالعميل
    const bookings = await prisma.booking.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            resource: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    // 2. جلب طلبات المنيو الخاصة بالعميل (عن طريق رقم هاتفه)
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    let menuOrders: any[] = [];
    
    if (user && user.phone) {
        menuOrders = await prisma.$queryRaw<any[]>`
          SELECT
            o."id", o."orderNumber", o."status", o."totalAmount",
            o."createdAt", o."locationType", o."locationLabel",
            COALESCE(
              json_agg(
                json_build_object(
                  'itemName', oi."itemName",
                  'quantity', oi."quantity",
                  'totalPrice', oi."totalPrice"
                ) ORDER BY oi."itemName"
              ) FILTER (WHERE oi."id" IS NOT NULL), '[]'::json
            ) AS "items"
          FROM "MenuOrder" o
          LEFT JOIN "MenuOrderItem" oi ON oi."orderId" = o."id"
          WHERE o."phone" = ${user.phone}
          GROUP BY o."id"
          ORDER BY o."createdAt" DESC
        `;
    }

    // إرسال كلاهما للعميل في شاشة واحدة
    return NextResponse.json({ bookings, menuOrders });
  } catch (error) {
    console.error("My bookings GET error:", error);
    return NextResponse.json({ error: "تعذر تحميل الحجوزات والطلبات." }, { status: 500 });
  }
}