import { NextResponse } from "next/server";
import {
  BookingStatus,
  MenuOrderStatus,
  PaymentStatus,
  ResourceStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function iraqToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function iraqDayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+03:00`),
    end: new Date(`${date}T23:59:59.999+03:00`),
  };
}

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error: "غير مصرح لك بالوصول.",
        },
        { status: 401 },
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          error: "ليس لديك صلاحية للوصول إلى لوحة الإدارة.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    session,
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const date = iraqToday();
    const { start, end } = iraqDayRange(date);

    const [
      totalCustomers,

      totalResources,
      availableResources,
      reservedResources,
      playingResources,
      maintenanceResources,

      todayBookings,
      todayPendingBookings,
      todayConfirmedBookings,
      todayActiveBookings,
      todayCompletedBookings,

      todayOrders,
      todayPendingOrders,
      todayPreparingOrders,
      todayReadyOrders,
      todayCompletedOrders,

      paidPayments,
      completedMenuOrders,
    ] = await Promise.all([
      /* =========================
         CUSTOMERS
      ========================= */

      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),

      /* =========================
         RESOURCES
      ========================= */

      prisma.resource.count({
        where: {
          isActive: true,
        },
      }),

      prisma.resource.count({
        where: {
          isActive: true,
          status: ResourceStatus.AVAILABLE,
        },
      }),

      prisma.resource.count({
        where: {
          isActive: true,
          status: ResourceStatus.RESERVED,
        },
      }),

      prisma.resource.count({
        where: {
          isActive: true,
          status: ResourceStatus.PLAYING,
        },
      }),

      prisma.resource.count({
        where: {
          isActive: true,
          status: ResourceStatus.MAINTENANCE,
        },
      }),

      /* =========================
         BOOKINGS
      ========================= */

      prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: BookingStatus.PENDING,
        },
      }),

      prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: BookingStatus.CONFIRMED,
        },
      }),

      prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: BookingStatus.ACTIVE,
        },
      }),

      prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: BookingStatus.COMPLETED,
        },
      }),

      /* =========================
         MENU ORDERS
      ========================= */

      prisma.menuOrder.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),

      prisma.menuOrder.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: MenuOrderStatus.PENDING,
        },
      }),

      prisma.menuOrder.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: MenuOrderStatus.PREPARING,
        },
      }),

      prisma.menuOrder.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: MenuOrderStatus.READY,
        },
      }),

      prisma.menuOrder.count({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: MenuOrderStatus.COMPLETED,
        },
      }),

      /* =========================
         BOOKING REVENUE
         Payment has paidAt, not createdAt
      ========================= */

      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      /* =========================
         MENU REVENUE
      ========================= */

      prisma.menuOrder.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: MenuOrderStatus.COMPLETED,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    /* =========================
       LATEST BOOKINGS
    ========================= */

    const latestBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },

        items: {
          orderBy: {
            startAt: "asc",
          },

          include: {
            resource: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    /* =========================
       LATEST ORDERS
    ========================= */

    const latestOrders = await prisma.menuOrder.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        phone: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        locationType: true,
        locationLabel: true,
      },
    });

    const bookingRevenue =
      paidPayments._sum.amount ?? 0;

    const menuRevenue =
      completedMenuOrders._sum.totalAmount ?? 0;

    const totalRevenue =
      bookingRevenue + menuRevenue;

    return NextResponse.json({
      date,

      revenue: {
        paid: bookingRevenue,
        bookings: bookingRevenue,
        menu: menuRevenue,
        total: totalRevenue,
      },

      customers: {
        total: totalCustomers,
      },

      resources: {
        total: totalResources,
        available: availableResources,
        reserved: reservedResources,
        playing: playingResources,
        maintenance: maintenanceResources,
      },

      bookings: {
        total: todayBookings,
        pending: todayPendingBookings,
        confirmed: todayConfirmedBookings,
        active: todayActiveBookings,
        completed: todayCompletedBookings,
      },

      orders: {
        total: todayOrders,
        pending: todayPendingOrders,
        preparing: todayPreparingOrders,
        ready: todayReadyOrders,
        completed: todayCompletedOrders,
      },

      latestBookings,
      latestOrders,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/dashboard failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "تعذر تحميل لوحة الإدارة.",
      },
      { status: 500 },
    );
  }
}