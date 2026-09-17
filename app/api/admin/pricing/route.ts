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
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لإدارة الأسعار.", 403) };
  return { session };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const pricing = await prisma.pricing.findMany({
      orderBy: { resourceType: "asc" },
    });

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error("GET /api/admin/pricing failed:", error);
    return errorResponse("تعذر تحميل الأسعار.", 500);
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
    const pricePerHour = Number(payload.pricePerHour);
    const minMinutes = Number(payload.minMinutes ?? 30);
    const active = payload.active !== undefined ? Boolean(payload.active) : true;

    if (!RESOURCE_TYPES.has(resourceType)) return errorResponse("نوع المورد غير صالح.");
    if (!Number.isInteger(pricePerHour) || pricePerHour < 0) return errorResponse("السعر يجب أن يكون رقماً صحيحاً غير سالب.");
    if (!Number.isInteger(minMinutes) || minMinutes < 15 || minMinutes > 120) return errorResponse("الحد الأدنى للمدة يجب أن يكون بين 15 و 120 دقيقة.");

    const existing = await prisma.pricing.findUnique({
      where: { resourceType: resourceType as ResourceType },
    });

    if (!existing) return errorResponse("نوع السعر غير موجود.", 404);

    const updated = await prisma.pricing.update({
      where: { resourceType: resourceType as ResourceType },
      data: {
        pricePerHour,
        minMinutes,
        active,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "PRICING_UPDATED",
        entity: "Pricing",
        entityId: updated.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تحديث السعر بنجاح.", pricing: updated });
  } catch (error) {
    console.error("PATCH /api/admin/pricing failed:", error);
    return errorResponse("تعذر تحديث السعر.", 500);
  }
}