import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROLES = new Set<string>(Object.values(UserRole));

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: errorResponse("غير مصرح لك بالوصول.", 401) };
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لإدارة المستخدمين.", 403) };
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const roleParam = text(searchParams.get("role"));
    const search = text(searchParams.get("search"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? "20")));

    const role = roleParam && ROLES.has(roleParam) ? (roleParam as UserRole) : undefined;

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: true,
              menuOrders: true,
              Payment: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const roleCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });

    return NextResponse.json({
      users,
      total,
      page,
      pageSize,
      roleCounts: roleCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.role] = item._count._all;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("GET /api/admin/users failed:", error);
    return errorResponse("تعذر تحميل المستخدمين.", 500);
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
    const phone = text(payload.phone);
    const password = typeof payload.password === "string" ? payload.password : "";
    const role = text(payload.role) || UserRole.CUSTOMER;

    if (name.length < 2) return errorResponse("اكتب اسم المستخدم بشكل صحيح.");
    if (!/^07\d{9}$/.test(phone)) return errorResponse("رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 07.");
    if (password.length < 8) return errorResponse("كلمة المرور يجب أن تكون 8 أحرف أو أكثر.");
    if (!ROLES.has(role)) return errorResponse("دور المستخدم غير صالح.");

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return errorResponse("رقم الهاتف مستخدم مسبقاً.", 409);

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: role as UserRole,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        afterJson: user,
      },
    });

    return NextResponse.json({ message: "تم إنشاء المستخدم بنجاح.", user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users failed:", error);
    return errorResponse("تعذر إنشاء المستخدم.", 500);
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
    if (!id) return errorResponse("معرّف المستخدم مطلوب.");

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    });

    if (!existing) return errorResponse("المستخدم غير موجود.", 404);

    const nextName = payload.name !== undefined ? text(payload.name) : (existing.name ?? "");
    const nextRole = payload.role !== undefined ? text(payload.role) : existing.role;
    const nextIsActive = payload.isActive !== undefined ? Boolean(payload.isActive) : existing.isActive;
    const nextPassword = typeof payload.password === "string" && payload.password.length > 0 ? payload.password : null;

    if (nextName.length < 2) return errorResponse("اسم المستخدم يجب أن يحتوي على حرفين على الأقل.");
    if (!ROLES.has(nextRole)) return errorResponse("دور المستخدم غير صالح.");

    if (existing.id === auth.session.id && nextIsActive === false) {
      return errorResponse("لا يمكنك تعطيل حسابك الحالي.");
    }

    if (existing.id === auth.session.id && nextRole !== "ADMIN") {
      return errorResponse("لا يمكنك تغيير دور حسابك الحالي.");
    }

    const passwordHash = nextPassword ? await hashPassword(nextPassword) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: nextName,
        role: nextRole as UserRole,
        isActive: nextIsActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: auth.session.id,
        action: "USER_UPDATED",
        entity: "User",
        entityId: updated.id,
        beforeJson: existing,
        afterJson: updated,
      },
    });

    return NextResponse.json({ message: "تم تحديث المستخدم بنجاح.", user: updated });
  } catch (error) {
    console.error("PATCH /api/admin/users failed:", error);
    return errorResponse("تعذر تحديث المستخدم.", 500);
  }
}