import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RESOURCE_TYPES = new Set<string>(Object.values(ResourceType));

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: errorResponse("غير مصرح لك بالوصول.", 401) };
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لإدارة الأقسام.", 403) };
  return { session };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const [services, deviceCounts] = await Promise.all([
      prisma.pricing.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.resource.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: { _all: true },
      }),
    ]);

    const countMap: Record<string, number> = {};
    for (const item of deviceCounts) {
      countMap[item.type] = item._count._all;
    }

    return NextResponse.json({
      services: services.map((service) => ({
        ...service,
        deviceCount: countMap[service.resourceType] ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/services failed:", error);
    return errorResponse("تعذر تحميل الأقسام.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("بيانات الطلب غير صالحة.");

    const payload = body as Record<string, unknown>;
    const resourceType = text(payload.resourceType);
    if (!resourceType || !RESOURCE_TYPES.has(resourceType)) return errorResponse("نوع القسم غير صالح.");

    const existing = await prisma.pricing.findUnique({
      where: { resourceType: resourceType as ResourceType },
    });

    if (!existing) return errorResponse("القسم غير موجود.", 404);

    const nextDisplayName = payload.displayName !== undefined ? text(payload.displayName) : (existing.displayName ?? "");
    const nextDescription = payload.description !== undefined ? (text(payload.description) || null) : existing.description;
    const nextImageUrl = payload.imageUrl !== undefined ? (text(payload.imageUrl) || null) : existing.imageUrl;
    const nextPrice = payload.pricePerHour !== undefined ? Number(payload.pricePerHour) : existing.pricePerHour;
    const nextMinMinutes = payload.minMinutes !== undefined ? Number(payload.minMinutes) : existing.minMinutes;
    const nextSortOrder = payload.sortOrder !== undefined ? Number(payload.sortOrder) : existing.sortOrder;
    const nextActive = payload.active !== undefined ? Boolean(payload.active) : existing.active;

    if (nextDisplayName.length < 2) return errorResponse("اسم القسم يجب أن يحتوي على حرفين على الأقل.");
    if (!Number.isInteger(nextPrice) || nextPrice < 0) return errorResponse("السعر يجب أن يكون رقماً صحيحاً غير سالب.");
    if (!Number.isInteger(nextSortOrder) || nextSortOrder < 0) return errorResponse("الترتيب يجب أن يكون رقماً صحيحاً غير سالب.");

    const updated = await prisma.pricing.update({
      where: { resourceType: resourceType as ResourceType },
      data: {
        displayName: nextDisplayName,
        description: nextDescription,
        imageUrl: nextImageUrl,
        pricePerHour: nextPrice,
        sortOrder: nextSortOrder,
        active: nextActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "SERVICE_UPDATED",
        entity: "Pricing",
        entityId: updated.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تحديث القسم بنجاح.", service: updated });
  } catch (error) {
    console.error("PATCH /api/admin/services failed:", error);
    return errorResponse("تعذر تحديث القسم.", 500);
  }
}