import { NextResponse } from "next/server";
import { BookingStatus, ResourceStatus, ResourceType, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MANUAL_STATUSES = new Set<ResourceStatus>([
  ResourceStatus.AVAILABLE,
  ResourceStatus.MAINTENANCE,
  ResourceStatus.DISABLED,
]);

const RESOURCE_TYPES = new Set<ResourceType>(Object.values(ResourceType));

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: errorResponse("غير مصرح لك بالوصول.", 401) };
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لإدارة الأجهزة.", 403) };
  return { session };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validType(value: unknown): value is ResourceType {
  return typeof value === "string" && RESOURCE_TYPES.has(value as ResourceType);
}

function validManualStatus(value: unknown): value is ResourceStatus {
  return typeof value === "string" && MANUAL_STATUSES.has(value as ResourceStatus);
}

async function getGuards(resourceId: string) {
  const now = new Date();
  const [activeSession, blockingBooking] = await Promise.all([
    prisma.session.findFirst({
      where: { resourceId, status: SessionStatus.ACTIVE },
      select: { id: true, startedAt: true },
    }),
    prisma.bookingItem.findFirst({
      where: {
        resourceId,
        endAt: { gt: now },
        booking: {
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
        },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        booking: { select: { bookingNumber: true, status: true, expiresAt: true } },
      },
    }),
  ]);
  return { activeSession, blockingBooking };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const typeParam = text(searchParams.get("type"));
    const statusParam = text(searchParams.get("status"));
    const search = text(searchParams.get("search"));

    const type = typeParam && validType(typeParam) ? typeParam : undefined;
    const status = statusParam && validManualStatus(statusParam) ? statusParam : undefined;

    if (typeParam && !type) return errorResponse("نوع المورد غير صالح.");
    if (statusParam && !status) return errorResponse("فلتر الحالة غير صالح.");

    const where = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [{ type: "asc" }, { code: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { bookingItems: true, Session: true } },
      },
    });

    const [allActive, available, reserved, playing, maintenance, disabled] = await Promise.all([
      prisma.resource.count({ where: { isActive: true } }),
      prisma.resource.count({ where: { isActive: true, status: ResourceStatus.AVAILABLE } }),
      prisma.resource.count({ where: { isActive: true, status: ResourceStatus.RESERVED } }),
      prisma.resource.count({ where: { isActive: true, status: ResourceStatus.PLAYING } }),
      prisma.resource.count({ where: { status: ResourceStatus.MAINTENANCE } }),
      prisma.resource.count({ where: { status: ResourceStatus.DISABLED } }),
    ]);

    const typeCounts = await prisma.resource.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { _all: true },
    });

    return NextResponse.json({
      resources,
      summary: {
        total: resources.length,
        allActive,
        available,
        reserved,
        playing,
        maintenance,
        disabled,
      },
      typeCounts: typeCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("GET /api/admin/resources failed:", error);
    return errorResponse("تعذر تحميل الأجهزة.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("بيانات الطلب غير صالحة.");

    const payload = body as Record<string, unknown>;
    const id = text(payload.id);
    if (!id) return errorResponse("معرّف الجهاز مطلوب.");

    const existing = await prisma.resource.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, type: true, status: true, isActive: true },
    });

    if (!existing) return errorResponse("الجهاز غير موجود.", 404);

    const nextName = payload.name !== undefined ? text(payload.name) : existing.name;
    const nextCode = payload.code !== undefined ? text(payload.code).toUpperCase() : existing.code;
    const nextType = payload.type !== undefined ? payload.type : existing.type;
    const nextStatus = payload.status !== undefined ? payload.status : existing.status;
    const nextIsActive = payload.isActive !== undefined ? payload.isActive : existing.isActive;

    if (!nextName || nextName.length < 2) return errorResponse("اسم الجهاز يجب أن يحتوي على حرفين على الأقل.");
    if (!/^[A-Z0-9-]{2,40}$/.test(nextCode)) return errorResponse("كود الجهاز يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطة فقط.");
    if (!validType(nextType)) return errorResponse("نوع الجهاز غير صالح.");
    if (!validManualStatus(nextStatus)) return errorResponse("حالة الإدارة اليدوية غير صالحة. حالة المحجوز والجاري يديرها النظام.");
    if (typeof nextIsActive !== "boolean") return errorResponse("قيمة التفعيل غير صالحة.");
    if (nextStatus === ResourceStatus.AVAILABLE && !nextIsActive) return errorResponse("لا يمكن أن يكون الجهاز متاحًا وهو معطل.");

    const needsGuard =
      nextStatus !== existing.status ||
      nextIsActive !== existing.isActive ||
      nextType !== existing.type ||
      nextName !== existing.name ||
      nextCode !== existing.code;

    if (needsGuard) {
      const guard = await getGuards(id);
      if (guard.activeSession) {
        return errorResponse("لا يمكن تعديل الجهاز أثناء وجود جلسة نشطة. أنهِ الجلسة أولًا.", 409);
      }
      if (guard.blockingBooking && (nextStatus === ResourceStatus.MAINTENANCE || nextStatus === ResourceStatus.DISABLED || !nextIsActive || nextType !== existing.type)) {
        return errorResponse(`لا يمكن تعديل هذا الجهاز الآن، توجد حجز فعّال أو قادم (${guard.blockingBooking.booking.bookingNumber}).`, 409);
      }
    }

    const duplicate = await prisma.resource.findFirst({
      where: { code: nextCode, NOT: { id } },
      select: { id: true },
    });
    if (duplicate) return errorResponse("كود الجهاز مستخدم بالفعل.", 409);

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        name: nextName,
        code: nextCode,
        type: nextType,
        status: nextStatus,
        isActive: nextIsActive,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "RESOURCE_UPDATED",
        entity: "Resource",
        entityId: updated.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تحديث الجهاز بنجاح.", resource: updated });
  } catch (error) {
    console.error("PATCH /api/admin/resources failed:", error);
    return errorResponse("تعذر تحديث الجهاز.", 500);
  }
}
