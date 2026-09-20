import { NextRequest, NextResponse } from "next/server";
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ResourceStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireCashier() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error: "غير مصرح لك بالوصول.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  if (
    session.role !== "CASHIER" &&
    session.role !== "ADMIN"
  ) {
    return {
      error: NextResponse.json(
        {
          error: "ليس لديك صلاحية لإدارة الحجوزات.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    session,
  };
}

function iraqToday() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

async function finalizeExpiredActiveBookings() {
  const now = new Date();

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.ACTIVE,
      endAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      items: {
        select: {
          resourceId: true,
        },
      },
    },
  });

  if (!expiredBookings.length) return;

  await prisma.$transaction(async (tx) => {
    for (const booking of expiredBookings) {
      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.ACTIVE,
          endAt: {
            lte: now,
          },
        },
        data: {
          status: BookingStatus.COMPLETED,
          expiresAt: null,
        },
      });

      if (updated.count === 0) continue;

      for (const item of booking.items) {
        if (!item.resourceId) continue;

        await tx.resource.update({
          where: {
            id: item.resourceId,
          },
          data: {
            status: ResourceStatus.AVAILABLE,
          },
        });
      }
    }
  });
}

function iraqDayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+03:00`),
    end: new Date(`${date}T23:59:59.999+03:00`),
  };
}

async function buildBookingView(bookingIds: string[]) {
  if (!bookingIds.length) {
    return new Map();
  }

  const payments = await prisma.payment.findMany({
    where: {
      bookingId: {
        in: bookingIds,
      },
    },
    select: {
      bookingId: true,
      amount: true,
      status: true,
    },
  });

  const paid = new Map<string, number>();

  for (const payment of payments) {
    if (payment.status !== PaymentStatus.PAID) {
      continue;
    }

    paid.set(
      payment.bookingId,
      (paid.get(payment.bookingId) || 0) + payment.amount,
    );
  }

  const bookings = await prisma.booking.findMany({
    where: {
      id: {
        in: bookingIds,
      },
    },
    select: {
      id: true,
      totalAmount: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          paymentStatus: true,
        },
      },
    },
  });

  return new Map(
    bookings.map((booking) => {
      const amount = paid.get(booking.id) || 0;
      const paymentStatus =
        booking.invoices?.paymentStatus ??
        (amount >= booking.totalAmount
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING);

      return [
        booking.id,
        {
          paidAmount: amount,
          remainingAmount: Math.max(booking.totalAmount - amount, 0),
          invoiceNumber: booking.invoices?.invoiceNumber ?? null,
          invoiceId: booking.invoices?.id ?? null,
          paymentStatus,
        },
      ];
    }),
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCashier();
    if ("error" in auth) {
      return auth.error;
    }

    await finalizeExpiredActiveBookings();

    const date =
      request.nextUrl.searchParams.get("date") || iraqToday();

    const { start, end } = iraqDayRange(date);

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          {
            startAt: {
              gte: start,
              lte: end,
            },
          },
          {
            endAt: {
              gte: start,
              lte: end,
            },
          },
          {
            startAt: {
              lte: start,
            },
            endAt: {
              gte: end,
            },
          },
        ],
      },
      orderBy: [
        {
          startAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        invoices: true,
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
                status: true,
              },
            },
          },
        },
      },
    });

    const paymentMap = await buildBookingView(
      bookings.map((booking) => booking.id),
    );

    return NextResponse.json({
      date,
      bookings: bookings.map((booking) => {
        const payment = paymentMap.get(booking.id);
        const paidAmount = payment?.paidAmount || 0;
        const remainingAmount =
          payment?.remainingAmount ?? booking.totalAmount;
        const paymentStatus =
          payment?.paymentStatus ??
          booking.invoices?.paymentStatus ??
          PaymentStatus.PENDING;

        return {
          ...booking,
          bookingNumber: booking.bookingNumber,
          invoiceNumber: booking.invoices?.invoiceNumber ?? null,
          paymentStatus,
          paidAmount,
          remainingAmount,
          payment: {
            invoiceId: payment?.invoiceId ?? booking.invoices?.id ?? null,
            invoiceNumber:
              payment?.invoiceNumber ??
              booking.invoices?.invoiceNumber ??
              null,
            totalAmount: booking.totalAmount,
            paidAmount,
            remainingAmount,
            status: paymentStatus,
          },
        };
      }),
    });
  } catch (error) {
    console.error("Cashier bookings GET error:", error);
    return NextResponse.json(
      {
        error: "تعذر تحميل الحجوزات.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireCashier();
    if ("error" in auth) {
      return auth.error;
    }

    const body = (await request.json()) as {
      bookingId?: string;
      status?: BookingStatus;
      action?: string;
    };

    if (!body.bookingId) {
      return NextResponse.json(
        {
          error: "رقم الحجز مطلوب.",
        },
        {
          status: 400,
        },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: body.bookingId,
      },
      include: {
        items: true,
        invoices: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: "الحجز غير موجود.",
        },
        {
          status: 404,
        },
      );
    }

    // إذا كان الإجراء دفع نقدي أو إنهاء مع استلام المبلغ
    const shouldRecordPayment =
      body.action === "PAY_CASH" || body.status === BookingStatus.COMPLETED;

    const nextStatus =
      body.status ||
      (body.action === "PAY_CASH"
        ? BookingStatus.COMPLETED
        : booking.status);

    const updated = await prisma.$transaction(
      async (tx) => {
        // تحديث حالة الأجهزة حسب حالة الحجز
        if (nextStatus === BookingStatus.ACTIVE) {
          for (const item of booking.items) {
            if (item.resourceId) {
              await tx.resource.update({
                where: { id: item.resourceId },
                data: { status: ResourceStatus.PLAYING },
              });
            }
          }
        }

        if (
          nextStatus === BookingStatus.COMPLETED ||
          nextStatus === BookingStatus.CANCELLED
        ) {
          for (const item of booking.items) {
            if (item.resourceId) {
              await tx.resource.update({
                where: { id: item.resourceId },
                data: { status: ResourceStatus.AVAILABLE },
              });
            }
          }
        }

        // إنشاء الفاتورة والدفعة النقدية إذا لم تكن مدفوعة
        if (shouldRecordPayment) {
          let invoice = booking.invoices;

          if (!invoice) {
            const shortId = Date.now().toString().slice(-6);
            invoice = await tx.invoice.create({
              data: {
                id: randomUUID(),
                bookingId: booking.id,
                invoiceNumber: `INV-${booking.bookingNumber?.replace("#", "") || shortId}-${shortId}`,
                subtotal: booking.totalAmount,
                discount: 0,
                total: booking.totalAmount,
                paymentStatus: PaymentStatus.PAID,
              },
            });
          } else {
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { paymentStatus: PaymentStatus.PAID },
            });
          }

          // فحص هل سُجلت دفعة مسبقاً
          const existingPayment = await tx.payment.findFirst({
            where: {
              bookingId: booking.id,
              status: PaymentStatus.PAID,
            },
          });

          if (!existingPayment) {
            const shortPay = Date.now().toString().slice(-6);
            await tx.payment.create({
              data: {
                id: randomUUID(),
                bookingId: booking.id,
                amount: booking.totalAmount,
                method: PaymentMethod.CASH,
                status: PaymentStatus.PAID,
                paidAt: new Date(),
                paymentNumber: `PAY-B-${booking.bookingNumber?.replace("#", "") || shortPay}-${shortPay}`,
                receivedById: auth.session.id,
              },
            });
          }
        }

        // تحديث الحجز
        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: nextStatus,
            expiresAt: null,
            ...(nextStatus === BookingStatus.CONFIRMED
              ? {
                  approvedAt: new Date(),
                  approvedById: auth.session.id,
                }
              : {}),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            items: {
              include: {
                resource: true,
              },
            },
            invoices: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return NextResponse.json({
      booking: updated,
      message: "تم تحديث الحجز واستلام المبلغ بنجاح.",
    });
  } catch (error) {
    console.error("Cashier bookings PATCH error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر تنفيذ العملية.",
      },
      {
        status: 500,
      },
    );
  }
}