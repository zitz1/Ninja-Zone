import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: errorResponse("غير مصرح لك بالوصول.", 401) };
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لإدارة المنيو.", 403) };
  return { session };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const items = await prisma.menuItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/menu failed:", error);
    return errorResponse("تعذر تحميل المنيو.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("بيانات الطلب غير صالحة.");

    const payload = body as Record<string, unknown>;
    const name = text(payload.name);
    const description = text(payload.description) || null;
    const category = text(payload.category);
    const price = Number(payload.price);
    const imageUrl = text(payload.imageUrl) || null;
    const isAvailable = payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : true;

    if (name.length < 2) return errorResponse("اكتب اسم الصنف بشكل صحيح.");
    if (category.length < 2) return errorResponse("اكتب التصنيف بشكل صحيح.");
    if (!Number.isInteger(price) || price < 0) return errorResponse("السعر يجب أن يكون رقماً صحيحاً غير سالب.");

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        category,
        price,
        imageUrl,
        isAvailable,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "MENU_ITEM_CREATED",
        entity: "MenuItem",
        entityId: item.id,
        afterJson: item,
      },
    });

    return NextResponse.json({ message: "تم إنشاء الصنف بنجاح.", item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/menu failed:", error);
    return errorResponse("تعذر إنشاء الصنف.", 500);
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
    if (!id) return errorResponse("معرّف الصنف مطلوب.");

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) return errorResponse("الصنف غير موجود.", 404);

    const nextName = payload.name !== undefined ? text(payload.name) : existing.name;
    const nextDescription = payload.description !== undefined ? (text(payload.description) || null) : existing.description;
    const nextCategory = payload.category !== undefined ? text(payload.category) : existing.category;
    const nextPrice = payload.price !== undefined ? Number(payload.price) : existing.price;
    const nextImageUrl = payload.imageUrl !== undefined ? (text(payload.imageUrl) || null) : existing.imageUrl;
    const nextIsAvailable = payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : existing.isAvailable;

    if (nextName.length < 2) return errorResponse("اسم الصنف يجب أن يحتوي على حرفين على الأقل.");
    if (nextCategory.length < 2) return errorResponse("التصنيف يجب أن يحتوي على حرفين على الأقل.");
    if (!Number.isInteger(nextPrice) || nextPrice < 0) return errorResponse("السعر يجب أن يكون رقماً صحيحاً غير سالب.");

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: nextName,
        description: nextDescription,
        category: nextCategory,
        price: nextPrice,
        imageUrl: nextImageUrl,
        isAvailable: nextIsAvailable,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "MENU_ITEM_UPDATED",
        entity: "MenuItem",
        entityId: updated.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تحديث الصنف بنجاح.", item: updated });
  } catch (error) {
    console.error("PATCH /api/admin/menu failed:", error);
    return errorResponse("تعذر تحديث الصنف.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("بيانات الطلب غير صالحة.");

    const payload = body as Record<string, unknown>;
    const id = text(payload.id);
    if (!id) return errorResponse("معرّف الصنف مطلوب.");

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) return errorResponse("الصنف غير موجود.", 404);

    const orderCount = await prisma.menuOrderItem.count({ where: { menuItemId: id } });
    if (orderCount > 0) {
      return errorResponse("لا يمكن حذف صنف مرتبط بطلبات سابقة. يمكنك تعطيله بدلاً من ذلك.", 409);
    }

    await prisma.menuItem.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "MENU_ITEM_DELETED",
        entity: "MenuItem",
        entityId: id,
        beforeJson: existing,
      },
    });

    return NextResponse.json({ message: "تم حذف الصنف بنجاح." });
  } catch (error) {
    console.error("DELETE /api/admin/menu failed:", error);
    return errorResponse("تعذر حذف الصنف.", 500);
  }
}