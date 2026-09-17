import { NextRequest, NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import {
  BookingValidationError,
  getAvailability,
  makeIraqDate,
} from "@/lib/booking-engine";

function isResourceType(value: string): value is ResourceType {
  return Object.values(ResourceType).includes(value as ResourceType);
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    const date = request.nextUrl.searchParams.get("date");
    const time = request.nextUrl.searchParams.get("time");
    const duration = Number(request.nextUrl.searchParams.get("duration") ?? "30");

    if (!type || !isResourceType(type)) {
      return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
    }
    if (!date || !time) {
      return NextResponse.json({ error: "date and time are required." }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 30 || duration % 30 !== 0) {
      return NextResponse.json({ error: "Duration must be a multiple of 30 minutes." }, { status: 400 });
    }

    const startAt = makeIraqDate(date, time);
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    const result = await getAvailability(type, startAt, endAt);

    return NextResponse.json({ ...result, type, startAt, endAt, durationMinutes: duration });
  } catch (error: unknown) {
    if (error instanceof BookingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Availability error:", error);
    const message = error instanceof Error ? error.message : "";
    const databaseUnavailable = /pg_hba\.conf|ECONNREFUSED|connection refused|connect|database/i.test(message);
    return NextResponse.json(
      {
        error: databaseUnavailable
          ? "قاعدة البيانات غير متاحة حاليًا. شغّل PostgreSQL وتأكد أن ملف pg_hba.conf موجود ثم أعد المحاولة."
          : "تعذر التحقق من توفر الأجهزة حاليًا.",
        code: databaseUnavailable ? "DATABASE_UNAVAILABLE" : "AVAILABILITY_ERROR",
      },
      { status: databaseUnavailable ? 503 : 500 },
    );
  }
}
