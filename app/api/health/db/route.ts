import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('MenuItem', 'MenuOrder', 'MenuOrderItem')
      ORDER BY table_name
    `;
    return NextResponse.json({ database: true, ping: result[0]?.ok === 1, tables: tables.map((x) => x.table_name) });
  } catch (error) {
    return NextResponse.json({ database: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
