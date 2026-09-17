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

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireCashier() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error:
            "غير مصرح لك بالوصول.",
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
          error:
            "ليس لديك صلاحية لإدارة الحجوزات.",
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

        const nextBooking = await tx.bookingItem.findFirst({
          where: {
            resourceId: item.resourceId,
            startAt: {
              gt: now,
            },
            endAt: {
              gt: now,
            },
            booking: {
              status: {
                in: [
                  BookingStatus.PENDING,
                  BookingStatus.CONFIRMED,
                ],
              },
              OR: [
                {
                  status: {
                    not: BookingStatus.PENDING,
                  },
                },
                {
                  status: BookingStatus.PENDING,
                  expiresAt: {
                    gt: now,
                  },
                },
              ],
            },
          },
          orderBy: {
            startAt: "asc",
          },
          select: {
            id: true,
          },
        });

        await tx.resource.update({
          where: {
            id: item.resourceId,
          },
          data: {
            status: nextBooking
              ? ResourceStatus.RESERVED
              : ResourceStatus.AVAILABLE,
          },
        });
      }
    }
  });
}

function iraqDayRange(date: string) {
  return {
    start: new Date(
      `${date}T00:00:00+03:00`,
    ),

    end: new Date(
      `${date}T23:59:59.999+03:00`,
    ),
  };
}

async function buildBookingView(
  bookingIds: string[],
) {
  if (!bookingIds.length) {
    return new Map<
      string,
      {
        paidAmount: number;
        remainingAmount: number;
        invoiceNumber: string | null;
        invoiceId: string | null;
        paymentStatus: PaymentStatus;
      }
    >();
  }

  const payments =
    await prisma.payment.findMany({
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

  const paid =
    new Map<string, number>();

  for (const payment of payments) {
    if (
      payment.status !==
      PaymentStatus.PAID
    ) {
      continue;
    }

    paid.set(
      payment.bookingId,
      (paid.get(payment.bookingId) || 0) +
        payment.amount,
    );
  }

  const bookings =
    await prisma.booking.findMany({
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
    bookings.map(
      (booking) => {
        const amount =
          paid.get(booking.id) ||
          0;

        const paymentStatus =
          booking.invoices
            ?.paymentStatus ??
          (amount >=
          booking.totalAmount
            ? PaymentStatus.PAID
            : PaymentStatus.PENDING);

        return [
          booking.id,
          {
            paidAmount:
              amount,

            remainingAmount:
              Math.max(
                booking.totalAmount -
                  amount,
                0,
              ),

            invoiceNumber:
              booking.invoices
                ?.invoiceNumber ??
              null,

            invoiceId:
              booking.invoices?.id ??
              null,

            paymentStatus,
          },
        ];
      },
    ),
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const auth =
      await requireCashier();

    if ("error" in auth) {
      return auth.error;
    }

    await finalizeExpiredActiveBookings();

    const date =
      request.nextUrl.searchParams.get(
        "date",
      ) || iraqToday();

    const {
      start,
      end,
    } =
      iraqDayRange(date);

    const bookings =
      await prisma.booking.findMany({
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

    const paymentMap =
      await buildBookingView(
        bookings.map(
          (booking) =>
            booking.id,
        ),
      );

    return NextResponse.json({
      date,

      bookings:
        bookings.map(
          (booking) => {
            const payment =
              paymentMap.get(
                booking.id,
              );

            const paidAmount =
              payment?.paidAmount ||
              0;

            const remainingAmount =
              payment?.remainingAmount ??
              booking.totalAmount;

            const paymentStatus =
              payment?.paymentStatus ??
              booking.invoices
                ?.paymentStatus ??
              PaymentStatus.PENDING;

            return {
              ...booking,

              bookingNumber:
                booking.bookingNumber,

              invoiceNumber:
                booking.invoices
                  ?.invoiceNumber ??
                null,

              paymentStatus,

              paidAmount,

              remainingAmount,

              payment: {
                invoiceId:
                  payment?.invoiceId ??
                  booking.invoices
                    ?.id ??
                  null,

                invoiceNumber:
                  payment?.invoiceNumber ??
                  booking.invoices
                    ?.invoiceNumber ??
                  null,

                totalAmount:
                  booking.totalAmount,

                paidAmount,

                remainingAmount,

                status:
                  paymentStatus,
              },
            };
          },
        ),
    });
  } catch (error) {
    console.error(
      "Cashier bookings GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "تعذر تحميل الحجوزات.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const auth =
      await requireCashier();

    if ("error" in auth) {
      return auth.error;
    }

    const body =
      (await request.json()) as {
        bookingId?: string;
        status?: BookingStatus;
        action?: string;
      };

    if (!body.bookingId) {
      return NextResponse.json(
        {
          error:
            "رقم الحجز مطلوب.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.action ===
      "PAY_CASH"
    ) {
      for (
        let attempt = 0;
        attempt < 3;
        attempt++
      ) {
        try {
          const result =
            await prisma.$transaction(
              async (tx) => {
                const booking =
                  await tx.booking.findUnique(
                    {
                      where: {
                        id: body.bookingId!,
                      },

                      include: {
                        invoices: true,
                      },
                    },
                  );

                if (!booking) {
                  throw new Error(
                    "الحجز غير موجود.",
                  );
                }

                if (
                  booking.status ===
                    BookingStatus.CANCELLED ||
                  booking.status ===
                    BookingStatus.EXPIRED
                ) {
                  throw new Error(
                    "لا يمكن تسجيل دفعة لحجز ملغي أو منتهي.",
                  );
                }

                const aggregate =
                  await tx.payment.aggregate(
                    {
                      where: {
                        bookingId:
                          booking.id,

                        status:
                          PaymentStatus.PAID,
                      },

                      _sum: {
                        amount: true,
                      },
                    },
                  );

                const paid =
                  aggregate._sum.amount ||
                  0;

                const remaining =
                  Math.max(
                    booking.totalAmount -
                      paid,
                    0,
                  );

                if (
                  remaining <= 0
                ) {
                  return {
                    alreadyPaid:
                      true,

                    amount:
                      0,

                    invoiceNumber:
                      booking.invoices
                        ?.invoiceNumber ??
                      null,

                    paymentNumber:
                      null,
                  };
                }

                let invoice =
                  booking.invoices;

                if (!invoice) {
                  const invoiceSequence =
                    await tx.$queryRaw<
                      Array<{
                        value: bigint;
                      }>
                    >`
                      SELECT nextval(
                        'ninja_zone_invoice_number_seq'
                      ) AS value
                    `;

                  const sequenceNumber =
                    String(
                      invoiceSequence[0]
                        .value,
                    ).padStart(
                      4,
                      "0",
                    );

                  const dateKey =
                    new Intl.DateTimeFormat(
                      "en-CA",
                      {
                        timeZone:
                          "Asia/Baghdad",
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                      },
                    )
                      .format(
                        new Date(),
                      )
                      .replaceAll(
                        "-",
                        "",
                      );

                  invoice =
                    await tx.invoice.create(
                      {
                        data: {
                          bookingId:
                            booking.id,

                          invoiceNumber:
                            `NZ-INV-${dateKey}-${sequenceNumber}`,

                          subtotal:
                            booking.totalAmount,

                          discount: 0,

                          total:
                            booking.totalAmount,

                          paymentStatus:
                            PaymentStatus.PENDING,
                        },
                      },
                    );
                }

                const paymentSequence =
                  await tx.$queryRaw<
                    Array<{
                      value: bigint;
                    }>
                  >`
                    SELECT nextval(
                      'ninja_zone_payment_number_seq'
                    ) AS value
                  `;

                const paymentSequenceNumber =
                  String(
                    paymentSequence[0]
                      .value,
                  ).padStart(
                    4,
                    "0",
                  );

                const dateKey =
                  new Intl.DateTimeFormat(
                    "en-CA",
                    {
                      timeZone:
                        "Asia/Baghdad",
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                    },
                  )
                    .format(
                      new Date(),
                    )
                    .replaceAll(
                      "-",
                      "",
                    );

                const paymentNumber =
                  `NZ-PAY-${dateKey}-${paymentSequenceNumber}`;

                await tx.payment.create({
                  data: {
                    bookingId:
                      booking.id,

                    amount:
                      remaining,

                    method:
                      PaymentMethod.CASH,

                    status:
                      PaymentStatus.PAID,

                    paymentNumber,

                    receivedById:
                      auth.session.id,
                  },
                });

                await tx.invoice.update({
                  where: {
                    id: invoice.id,
                  },

                  data: {
                    paymentStatus:
                      PaymentStatus.PAID,
                  },
                });

                return {
                  alreadyPaid:
                    false,

                  amount:
                    remaining,

                  invoiceNumber:
                    invoice.invoiceNumber,

                  paymentNumber,
                };
              },

              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
              },
            );

          return NextResponse.json({
            ...result,

            message:
              result.alreadyPaid
                ? "الحجز مدفوع بالكامل مسبقاً."
                : "تم استلام وتسجيل الدفعة النقدية بنجاح.",
          });
        } catch (error) {
          if (
            error instanceof
              Prisma.PrismaClientKnownRequestError &&
            error.code === "P2034" &&
            attempt < 2
          ) {
            continue;
          }

          throw error;
        }
      }
    }

    if (!body.status) {
      return NextResponse.json(
        {
          error:
            "الحالة مطلوبة.",
        },
        {
          status: 400,
        },
      );
    }

    const allowedStatuses:
      BookingStatus[] = [
        BookingStatus.CONFIRMED,
        BookingStatus.ACTIVE,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
      ];

    if (
      !allowedStatuses.includes(
        body.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "حالة الحجز غير مسموحة.",
        },
        {
          status: 400,
        },
      );
    }

    const booking =
      await prisma.booking.findUnique(
        {
          where: {
            id: body.bookingId,
          },

          include: {
            items: {
              include: {
                resource: true,
              },
            },
          },
        },
      );

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "الحجز غير موجود.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      booking.status ===
        BookingStatus.COMPLETED ||
      booking.status ===
        BookingStatus.CANCELLED ||
      booking.status ===
        BookingStatus.EXPIRED
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تغيير حالة حجز منتهي أو ملغي.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.status ===
        BookingStatus.CONFIRMED &&
      booking.status !==
        BookingStatus.PENDING
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الحجز ليس بانتظار التأكيد.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.status ===
        BookingStatus.ACTIVE &&
      booking.status !==
        BookingStatus.CONFIRMED &&
      booking.status !==
        BookingStatus.PENDING
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن بدء هذه الجلسة من الحالة الحالية.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.status ===
        BookingStatus.COMPLETED &&
      booking.status !==
        BookingStatus.ACTIVE
    ) {
      return NextResponse.json(
        {
          error:
            "يجب بدء الجلسة قبل إنهائها.",
        },
        {
          status: 400,
        },
      );
    }

    // [Security Fix] تم عزل هذه المعاملة أيضاً لتفادي مشاكل حالات التسابق عند تحديث الحالات.
    const updated =
      await prisma.$transaction(
        async (tx) => {
          if (
            body.status ===
            BookingStatus.ACTIVE
          ) {
            for (
              const item of booking.items
            ) {
              if (!item.resourceId) {
                continue;
              }

              await tx.resource.update({
                where: {
                  id: item.resourceId,
                },

                data: {
                  status:
                    ResourceStatus.PLAYING,
                },
              });
            }
          }

          if (
            body.status ===
              BookingStatus.COMPLETED ||
            body.status ===
              BookingStatus.CANCELLED
          ) {
            for (
              const item of booking.items
            ) {
              if (!item.resourceId) {
                continue;
              }

              await tx.resource.update({
                where: {
                  id: item.resourceId,
                },

                data: {
                  status:
                    ResourceStatus.AVAILABLE,
                },
              });
            }
          }

          return tx.booking.update({
            where: {
              id: booking.id,
            },

            data: {
              status:
                body.status,

              expiresAt:
                null,

              ...(body.status ===
              BookingStatus.CONFIRMED
                ? {
                    approvedAt:
                      new Date(),

                    approvedById:
                      auth.session.id,
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
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

    return NextResponse.json({
      booking: updated,

      message:
        "تم تحديث حالة الحجز.",
    });
  } catch (error) {
    console.error(
      "Cashier bookings PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تنفيذ العملية.",
      },
      {
        status: 500,
      },
    );
  }
}