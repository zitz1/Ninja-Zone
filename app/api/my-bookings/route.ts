import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لعرض حجوزاتك." },
        { status: 401 },
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: session.id,
      },
      orderBy: {
        startAt: "desc",
      },
      take: 50,
      include: {
        items: {
          orderBy: {
            startAt: "asc",
          },
          include: {
            resource: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        totalAmount: booking.totalAmount,
        customerNote: booking.customerNote,
        createdAt: booking.createdAt.toISOString(),
        items: booking.items.map((item) => ({
          id: item.id,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          durationMinutes: item.durationMinutes,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          resource: item.resource,
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/my-bookings failed:", error);
    return NextResponse.json(
      { error: "تعذر تحميل الحجوزات." },
      { status: 500 },
    );
  }
}