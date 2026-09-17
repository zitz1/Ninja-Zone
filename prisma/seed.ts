import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  ResourceStatus,
  ResourceType,
  UserRole,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const services = [
  [ResourceType.PC_NORMAL, "PC-N", "PC Normal", 8, 2500, "PC عادي", "جلسات مريحة وسريعة وممتعة", "/reference-cards/pc-normal.jpg", 3],
  [ResourceType.PC_MASTER, "PC-M", "PC Master", 8, 4000, "PC ماستر", "أعلى مواصفات لأفضل أداء", "/reference-cards/pc-master.jpg", 2],
  [ResourceType.PS5, "PS5-", "PlayStation 5", 10, 5000, "PlayStation 5", "تجربة لعب حصرية على بلايستيشن 5", "/reference-cards/ps5.jpg", 1],
  [ResourceType.CINEMA, "CIN-", "Cinema", 4, 12000, "غرف السينما", "شاشة كبيرة وصوت محيطي لتجربة سينمائية", "/reference-cards/cinema.jpg", 4],
  [ResourceType.BILLIARD, "BIL-", "Billiard", 2, 1000, "بليارد", "طاولات بليارد احترافية وأجواء ممتعة", "/reference-cards/billiard.jpg", 5],
  [ResourceType.TABLE, "TAB-", "Tables", 8, 5000, "الطاولات", "مساحة مريحة للألعاب والطعام والاسترخاء", "/reference-cards/tables.jpg", 6],
] as const;

const menu = [
  ["مشروبات", "بيبسي", "مشروب غازي بارد", 1000, "🥤"],
  ["مشروبات", "ماء معدني", "ماء بارد", 500, "💧"],
  ["مشروبات", "ريد بول", "مشروب طاقة", 2000, "⚡"],
  ["مشروبات", "قهوة", "قهوة ساخنة", 2000, "☕"],
  ["وجبات", "بطاطا مقلية", "بطاطا مقرمشة مع صوص", 2000, "🍟"],
  ["وجبات", "برغر لحم", "برغر لحم مع بطاطا", 6000, "🍔"],
  ["وجبات", "زنجر", "ساندويچ زنجر حار", 6500, "🌯"],
  ["وجبات", "بيتزا", "بيتزا مشكلة", 7000, "🍕"],
  ["سناكات", "كريب شوكولاتة", "كريب طازج مع شوكولاتة", 4000, "🥞"],
  ["سناكات", "كيك شوكولاتة", "قطعة كيك غنية بالشوكولاتة", 3000, "🍰"],
  ["سناكات", "وافل", "وافل مع صوص وحشوة", 4000, "🧇"],
  ["سناكات", "دونات", "دونات مشكلة", 2500, "🍩"],
  ["عروض", "عرض الجيمر", "بطاطا + مشروب + سناك", 7000, "🎁"],
] as const;

async function main() {
  // =========================
  // Seed resources + pricing
  // =========================
  for (const [type, prefix, name, count, price, displayName, description, imageUrl, sortOrder] of services) {
    for (let i = 1; i <= count; i++) {
      const code = `${prefix}${String(i).padStart(2, "0")}`;

      await prisma.resource.upsert({
        where: { code },
        update: {
          name: `${name} ${i}`,
          type,
          isActive: true,
        },
        create: {
          code,
          name: `${name} ${i}`,
          type,
          status: ResourceStatus.AVAILABLE,
        },
      });
    }

    await prisma.pricing.upsert({
      where: { resourceType: type },
      update: {
        pricePerHour: price,
        active: true,
        displayName: displayName,
        description: description,
        imageUrl: imageUrl,
        sortOrder: sortOrder,
      },
      create: {
        resourceType: type,
        pricePerHour: price,
        active: true,
        displayName: displayName,
        description: description,
        imageUrl: imageUrl,
        sortOrder: sortOrder,
      },
    });
  }

  // =========================
  // Seed demo customer
  // =========================
  const demoPasswordHash = await bcrypt.hash("NinjaZone@2026", 12);

  await prisma.user.upsert({
    where: {
      phone: "+9647700000000",
    },
    update: {
      name: "Ninja Zone Demo",
      role: UserRole.CUSTOMER,
      isActive: true,
      passwordHash: demoPasswordHash,
    },
    create: {
      phone: "+9647700000000",
      name: "Ninja Zone Demo",
      passwordHash: demoPasswordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  // =========================
  // Seed admin user
  // =========================
  const adminPasswordHash = await bcrypt.hash("Admin@2026", 12);

  await prisma.user.upsert({
    where: {
      phone: "07851011864",
    },
    update: {
      name: "مدير النظام",
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      phone: "07851011864",
      name: "مدير النظام",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // =========================
  // Seed menu
  // =========================
  // Use SQL for menu seeding so a stale local Prisma client cannot make
  // prisma.menuItem undefined. The database remains the single source of truth.

  for (const [category, name, description, price, emoji] of menu) {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "MenuItem"
      WHERE "name" = ${name}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE "MenuItem"
        SET
          "category" = ${category},
          "description" = ${description},
          "price" = ${price},
          "imageUrl" = ${emoji},
          "isAvailable" = true,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${existing[0].id}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "MenuItem"
          (
            "id",
            "name",
            "description",
            "category",
            "price",
            "imageUrl",
            "isAvailable",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            ${randomUUID()},
            ${name},
            ${description},
            ${price},
            ${emoji},
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
      `;
    }
  }

  const deviceCount = services.reduce((n, service) => n + service[3], 0);

  console.log(
    `Ninja Zone seeded: ${deviceCount} devices + ${menu.length} menu items`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });