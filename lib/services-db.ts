import "server-only";

import { prisma } from "@/lib/prisma";
import { SERVICES, type Service } from "@/lib/services";
import type { ResourceType } from "@prisma/client";

/*
 * تقرأ الأقسام من جدول Pricing في قاعدة البيانات.
 * إذا لم يوجد قسم في قاعدة البيانات، تستخدم القيم الثابتة من SERVICES.
 * الأقسام المعطلة (active = false) لا تظهر للعملاء.
 */
export async function getServicesFromDb(): Promise<Service[]> {
  try {
    const pricing = await prisma.pricing.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });

    if (pricing.length === 0) {
      return SERVICES;
    }

    const staticMap = new Map(SERVICES.map((s) => [s.type, s]));

    return pricing.map((row) => {
      const fallback = staticMap.get(row.resourceType as Service["type"]);

      return {
        type: row.resourceType as Service["type"],
        title: fallback?.title ?? row.resourceType,
        arTitle: row.displayName ?? fallback?.arTitle ?? row.resourceType,
        description: row.description ?? fallback?.description ?? "",
        price: row.pricePerHour,
        unit: "ساعة",
        count: fallback?.count ?? 0,
        tone: fallback?.tone ?? "violet",
        icon: fallback?.icon ?? "01",
        image: row.imageUrl ?? fallback?.image ?? "/reference-cards/pc-normal.jpg",
      };
    });
  } catch (error) {
    console.error("getServicesFromDb failed, falling back to static services:", error);
    return SERVICES;
  }
}

export async function getServiceFromDb(type: string): Promise<Service | undefined> {
  const services = await getServicesFromDb();
  return services.find((service) => service.type === type);
}

export type { ResourceType };