import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ResourceType, ResourceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. تسعيرات الأقسام
    const defaultPricings = [
      { resourceType: ResourceType.PC_NORMAL, pricePerHour: 3000, displayName: "PC Normal" },
      { resourceType: ResourceType.PC_MASTER, pricePerHour: 5000, displayName: "PC Master VIP" },
      { resourceType: ResourceType.PS5, pricePerHour: 5000, displayName: "PlayStation 5" },
      { resourceType: ResourceType.CINEMA, pricePerHour: 15000, displayName: "غرفة السينما" },
      { resourceType: ResourceType.BILLIARD, pricePerHour: 6000, displayName: "طاولة بليارد" },
      { resourceType: ResourceType.TABLE, pricePerHour: 2000, displayName: "طاولة عادية" },
    ];

    for (const p of defaultPricings) {
      await prisma.pricing.upsert({
        where: { resourceType: p.resourceType },
        update: { active: true, pricePerHour: p.pricePerHour },
        create: {
          resourceType: p.resourceType,
          pricePerHour: p.pricePerHour,
          displayName: p.displayName,
          minMinutes: 30,
          active: true,
        },
      });
    }

    // 2. إدخال وتفعيل الأجهزة
    const resources = [
      // PC Normal (1 to 8)
      ...Array.from({ length: 8 }, (_, i) => ({
        code: `PC-NORMAL-0${i + 1}`,
        name: `PC Normal 0${i + 1}`,
        type: ResourceType.PC_NORMAL,
      })),
      // PC Master (1 to 8)
      ...Array.from({ length: 8 }, (_, i) => ({
        code: `PC-MASTER-0${i + 1}`,
        name: `PC Master 0${i + 1}`,
        type: ResourceType.PC_MASTER,
      })),
      // PS5 (1 to 10)
      ...Array.from({ length: 10 }, (_, i) => ({
        code: `PS5-${i + 1 < 10 ? `0${i + 1}` : "10"}`,
        name: `PS5 ${i + 1 < 10 ? `0${i + 1}` : "10"}`,
        type: ResourceType.PS5,
      })),
      // Cinema (1 to 4)
      ...Array.from({ length: 4 }, (_, i) => ({
        code: `CINEMA-0${i + 1}`,
        name: `Cinema 0${i + 1}`,
        type: ResourceType.CINEMA,
      })),
      // Billiard (1 to 2)
      ...Array.from({ length: 2 }, (_, i) => ({
        code: `BILLIARD-0${i + 1}`,
        name: `Billiard 0${i + 1}`,
        type: ResourceType.BILLIARD,
      })),
      // Tables (1 to 8)
      ...Array.from({ length: 8 }, (_, i) => ({
        code: `TABLE-0${i + 1}`,
        name: `طاولة 0${i + 1}`,
        type: ResourceType.TABLE,
      })),
    ];

    for (const r of resources) {
      await prisma.resource.upsert({
        where: { code: r.code },
        update: { isActive: true, status: ResourceStatus.AVAILABLE },
        create: {
          code: r.code,
          name: r.name,
          type: r.type,
          status: ResourceStatus.AVAILABLE,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      message: "تم تفعيل وتسجيل جميع أجهزة البي سي والسينما والبليارد بنجاح!",
      total: resources.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}