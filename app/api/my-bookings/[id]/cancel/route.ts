import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, ResourceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "الحجز غير موجود." }, { status: 404 });
    }

    // التأكد من أن الحجز يخص العميل نفسه
    if (booking.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح لك بإلغاء هذا الحجز." }, { status: 403 });
    }

    // السماح بإلغاء الحجز فقط إذا كان بانتظار التأكيد (PENDING) أو مؤكداً ولم يبدأ بعد
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      return NextResponse.json(
        { error: "عذراً، لا يمكن إلغاء الحجز بعد بدء الجلسة أو إكتمالها." },
        { status: 400 }
      );
    }

    // تحديث حالة الحجز إلى ملغي وإرجاع حالة الأجهزة إلى متاح
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          expiresAt: null,
        },
      });

      // إرجاع الأجهزة المرتبطة لتصبح متاحة للغير
      for (const item of booking.items) {
        if (item.resourceId) {
          await tx.resource.update({
            where: { id: item.resourceId },
            data: { status: ResourceStatus.AVAILABLE },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "تم إلغاء الحجز بنجاح." });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json({ error: "تعذر إلغاء الحجز." }, { status: 500 });
  }
}