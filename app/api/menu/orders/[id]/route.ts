import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const orders = await prisma.$queryRaw<Array<{
      id: string;
      customerName: string;
      status: string;
      totalAmount: number;
      createdAt: Date;
      note: string | null;
    }>>`
      SELECT "id", "customerName", "status"::text AS "status", "totalAmount", "createdAt", "note"
      FROM "MenuOrder"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    const items = await prisma.$queryRaw<Array<{
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>>`
      SELECT "itemName", "quantity", "unitPrice", "totalPrice"
      FROM "MenuOrderItem"
      WHERE "orderId" = ${id}
      ORDER BY "id"
    `;

    return NextResponse.json({ order: { ...orders[0], items } });
  } catch (error) {
    console.error("GET /api/menu/orders/[id] failed:", error);
    const detail = process.env.NODE_ENV !== "production" && error instanceof Error ? ` (${error.message})` : "";
    return NextResponse.json({ error: `تعذر تحميل الطلب.${detail}` }, { status: 500 });
  }
}
