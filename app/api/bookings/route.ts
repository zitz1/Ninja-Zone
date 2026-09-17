import { NextRequest, NextResponse } from "next/server";
import {
  createPendingBooking,
  BookingValidationError,
  type BookingRequestItem,
} from "@/lib/booking-engine";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    let userId: string | null = session?.id ?? null;

    if (!userId && process.env.NODE_ENV !== "production") {
      const demoUser = await prisma.user.findUnique({
        where: {
          phone: "+9647700000000",
        },
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      });

      if (demoUser && demoUser.isActive) {
        userId = demoUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: "Authentication is required.",
        },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          error: "User account was not found or is inactive.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      items?: BookingRequestItem[];
      customerNote?: string;
    };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          error: "items are required.",
        },
        { status: 400 },
      );
    }

    const booking = await createPendingBooking(
      userId,
      body.items,
      body.customerNote,
    );

    return NextResponse.json(
      {
        booking,
        message:
          "Booking request created and is waiting for cashier approval.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    // طباعة تفاصيل الخطأ بدقة في الترمنال لمتابعة أي مشكلة مستقبلاً
    console.error("Booking creation error details:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: `Unable to create booking: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}