import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "غير مصرح لك بالوصول." }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "ليس لديك صلاحية لإدارة المنيو." }, { status: 403 }) };
  }
  return { session };
}

// GET - جلب جميع عناصر المنيو
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const items = await prisma.menuItem.findMany({
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/admin/menu-items failed:", error);
    return NextResponse.json({ error: "تعذر جلب عناصر المنيو." }, { status: 500 });
  }
}

// POST - إضافة عنصر جديد للمنيو
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { name, description, category, price, imageUrl, isAvailable } = body;

    // التحقق من البيانات
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "اسم العنصر مطلوب." }, { status: 400 });
    }

    if (!category || typeof category !== "string" || category.trim().length === 0) {
      return NextResponse.json({ error: "التصنيف مطلوب." }, { status: 400 });
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return NextResponse.json({ error: "السعر يجب أن يكون رقماً موجباً." }, { status: 400 });
    }

    // التحقق من وجود عنصر بنفس الاسم
    const existing = await prisma.menuItem.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json({ error: "عنصر بنفس الاسم موجود بالفعل." }, { status: 409 });
    }

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        price: Math.round(price),
        imageUrl: imageUrl?.trim() || null,
        isAvailable: isAvailable !== false,
      },
    });

    // تسجيل النشاط
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

    return NextResponse.json({ message: "تم إضافة العنصر بنجاح.", item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/menu-items failed:", error);
    return NextResponse.json({ error: "تعذر إضافة العنصر." }, { status: 500 });
  }
}

// PUT - تعديل عنصر موجود
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { id, name, description, category, price, imageUrl, isAvailable } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "معرف العنصر مطلوب." }, { status: 400 });
    }

    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "العنصر غير موجود." }, { status: 404 });
    }

    // التحقق من وجود عنصر آخر بنفس الاسم (إذا تم تغيير الاسم)
    if (name && name !== existing.name) {
      const duplicate = await prisma.menuItem.findFirst({
        where: {
          name: { equals: name.trim(), mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: "عنصر آخر بنفس الاسم موجود بالفعل." }, { status: 409 });
      }
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        category: category ? category.trim() : existing.category,
        price: price !== undefined ? Math.round(price) : existing.price,
        imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : existing.imageUrl,
        isAvailable: isAvailable !== undefined ? isAvailable : existing.isAvailable,
      },
    });

    // تسجيل النشاط
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "MENU_ITEM_UPDATED",
        entity: "MenuItem",
        entityId: id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تعديل العنصر بنجاح.", item: updated });
  } catch (error) {
    console.error("PUT /api/admin/menu-items failed:", error);
    return NextResponse.json({ error: "تعذر تعديل العنصر." }, { status: 500 });
  }
}

// DELETE - حذف عنصر من المنيو
export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرف العنصر مطلوب." }, { status: 400 });
    }

    const existing = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "العنصر غير موجود." }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    // تسجيل النشاط
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

    return NextResponse.json({ message: "تم حذف العنصر بنجاح." });
  } catch (error) {
    console.error("DELETE /api/admin/menu-items failed:", error);
    return NextResponse.json({ error: "تعذر حذف العنصر." }, { status: 500 });
  }
}