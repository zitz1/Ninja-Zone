import { NextRequest, NextResponse } from "next/server";
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
  if (session.role !== "ADMIN") return { error: errorResponse("ليس لديك صلاحية لعرض سجل النشاطات.", 403) };
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const entity = text(searchParams.get("entity"));
    const action = text(searchParams.get("action"));
    const search = text(searchParams.get("search"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? "30")));

    const where = {
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(search
        ? {
            OR: [
              { entityId: { contains: search, mode: "insensitive" as const } },
              { action: { contains: search, mode: "insensitive" as const } },
              { User: { is: { name: { contains: search, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const entityCounts = await prisma.auditLog.groupBy({
      by: ["entity"],
      _count: { _all: true },
    });

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      entityCounts: entityCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.entity] = item._count._all;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("GET /api/admin/logs failed:", error);
    return errorResponse("تعذر تحميل سجل النشاطات.", 500);
  }
}