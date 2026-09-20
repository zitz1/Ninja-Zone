import { NextRequest, NextResponse } from "next/server";
import {
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function iraqDayRange(date: string) {
  const start = new Date(
    `${date}T00:00:00+03:00`,
  );

  const end = new Date(
    `${date}T00:00:00+03:00`,
  );

  end.setUTCDate(
    end.getUTCDate() + 1,
  );

  return {
    gte: start,
    lt: end,
  };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function statusValue(
  value: string | null,
) {
  if (!value || value === "ALL") {
    return undefined;
  }

  return Object.values(
    PaymentStatus,
  ).includes(
    value as PaymentStatus,
  )
    ? (value as PaymentStatus)
    : undefined;
}

function methodValue(
  value: string | null,
) {
  if (!value || value === "ALL") {
    return undefined;
  }

  return Object.values(
    PaymentMethod,
  ).includes(
    value as PaymentMethod,
  )
    ? (value as PaymentMethod)
    : undefined;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول للوصول إلى المدفوعات.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.role !== "CASHIER" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية للوصول إلى المدفوعات.",
        },
        {
          status: 403,
        },
      );
    }

    const params =
      request.nextUrl.searchParams;

    const date =
      params.get("date") || "";

    const status =
      statusValue(
        params.get("status"),
      );

    const method =
      methodValue(
        params.get("method"),
      );

    const search =
      params.get("search")?.trim() ||
      "";

    if (
      date &&
      !validDate(date)
    ) {
      return NextResponse.json(
        {
          error:
            "التاريخ يجب أن يكون بصيغة YYYY-MM-DD.",
        },
        {
          status: 400,
        },
      );
    }

    const dayRange = date ? iraqDayRange(date) : undefined;

    // 1. جلب مدفوعات الحجوزات
    const payments =
      await prisma.payment.findMany({
        where: {
          ...(dayRange
            ? {
                paidAt: dayRange,
              }
            : {}),

          ...(status
            ? {
                status,
              }
            : {}),

          ...(method
            ? {
                method,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    id: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    paymentNumber: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    Booking: {
                      is: {
                        bookingNumber: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                  {
                    Booking: {
                      is: {
                        user: {
                          is: {
                            name: {
                              contains: search,
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    Booking: {
                      is: {
                        user: {
                          is: {
                            phone: {
                              contains: search,
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: {
          paidAt: "desc",
        },
        include: {
          Booking: {
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
          },
          User: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          Session: true,
        },
      });

    // 2. جلب طلبات المنيو المستلمة والمسددة (COMPLETED)
    const menuOrders = await prisma.menuOrder.findMany({
      where: {
        status: "COMPLETED",
        ...(dayRange
          ? {
              updatedAt: dayRange,
            }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  orderNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  customerName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  locationLabel: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        items: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // تحويل مدفوعات الحجوزات
    const formattedBookingPayments = payments.map((payment) => {
      const booking = payment.Booking;
      const invoice = booking?.invoices ?? null;

      return {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        paidAt: payment.paidAt.toISOString(),
        bookingId: payment.bookingId,
        bookingNumber: booking?.bookingNumber ?? null,
        invoice: invoice
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              subtotal: invoice.subtotal,
              discount: invoice.discount,
              total: invoice.total,
              paymentStatus: invoice.paymentStatus,
            }
          : null,
        receivedBy: payment.User,
        session: payment.Session
          ? {
              id: payment.Session.id,
              status: payment.Session.status,
              startedAt: payment.Session.startedAt?.toISOString() ?? null,
              endedAt: payment.Session.endedAt?.toISOString() ?? null,
              finalAmount: payment.Session.finalAmount,
            }
          : null,
        booking: booking
          ? {
              id: booking.id,
              bookingNumber: booking.bookingNumber,
              status: booking.status,
              startAt: booking.startAt.toISOString(),
              endAt: booking.endAt.toISOString(),
              totalAmount: booking.totalAmount,
              customer: booking.user,
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
            }
          : null,
      };
    });

    // تحويل مبيعات المنيو لتظهر كعمليات دفع نقدي رسمية
    const formattedOrderPayments = menuOrders.map((order) => ({
      id: order.id,
      paymentNumber: `ORD-${order.orderNumber.replace("#", "")}`,
      amount: order.totalAmount,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      paidAt: order.updatedAt.toISOString(),
      bookingId: order.id,
      bookingNumber: order.orderNumber,
      invoice: {
        id: order.id,
        invoiceNumber: `INV-ORD-${order.orderNumber.replace("#", "")}`,
        subtotal: order.totalAmount,
        discount: 0,
        total: order.totalAmount,
        paymentStatus: PaymentStatus.PAID,
      },
      receivedBy: {
        id: session.id,
        name: session.name || "الكاشير",
        phone: session.phone || "",
        role: session.role,
      },
      session: null,
      booking: {
        id: order.id,
        bookingNumber: order.orderNumber,
        status: "COMPLETED",
        startAt: order.createdAt.toISOString(),
        endAt: order.updatedAt.toISOString(),
        totalAmount: order.totalAmount,
        customer: {
          id: order.userId || order.id,
          name: `${order.customerName} (${order.locationLabel || "المنيو"})`,
          phone: order.phone,
        },
        items: order.items.map((it) => ({
          id: it.id,
          resourceType: "MENU_ORDER",
          resourceId: it.menuItemId,
          startAt: order.createdAt.toISOString(),
          endAt: order.updatedAt.toISOString(),
          durationMinutes: 0,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          resource: {
            id: it.id,
            code: `${it.quantity}x`,
            name: it.itemName,
            type: "طعام / مشروب",
            status: "COMPLETED",
          },
        })),
      },
    }));

    // دمج عمليات الدفع وترتيبها زمنياً
    const allCombinedPayments = [
      ...formattedBookingPayments,
      ...formattedOrderPayments,
    ].sort(
      (a, b) =>
        new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );

    const paidPayments = allCombinedPayments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );

    const totalAmount = paidPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    const cashAmount = paidPayments
      .filter((p) => p.method === PaymentMethod.CASH)
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payments: allCombinedPayments,
      count: allCombinedPayments.length,
      stats: {
        totalAmount,
        cashAmount,
        paidCount: paidPayments.length,
        count: allCombinedPayments.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/cashier/payments failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "تعذر تحميل المدفوعات.",
      },
      {
        status: 500,
      },
    );
  }
}