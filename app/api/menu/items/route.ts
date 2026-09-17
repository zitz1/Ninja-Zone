import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      price: number;
      imageUrl: string | null;
    }>>`
      SELECT "id", "name", "description", "category", "price", "imageUrl"
      FROM "MenuItem"
      WHERE "isAvailable" = true
      ORDER BY
        CASE "category"
          WHEN 'وجبات' THEN 1
          WHEN 'سناكات' THEN 2
          WHEN 'مشروبات' THEN 3
          WHEN 'عروض' THEN 4
          ELSE 5
        END,
        "name" ASC
    `;

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/menu/items failed:", error);
    const detail = process.env.NODE_ENV !== "production" && error instanceof Error ? ` (${error.message})` : "";
    return NextResponse.json(
      { error: `تعذر تحميل المنيو من قاعدة البيانات.${detail}` },
      { status: 500 },
    );
  }
}
