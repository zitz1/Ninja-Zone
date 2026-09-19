import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const allowedLocationTypes = [
  "جهاز",
  "طاولة",
  "سينما",
  "بليارد",
] as const;

const allowedStatuses = [
  "PENDING",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function unauthorized() {
  return NextResponse.json(
    { error: "غير مصرح لك بالوصول." },
    { status: 403 },
  );
}

// دالة لتوليد رقم طلب مميز وقصير
function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'NZ-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* =========================================================
   GET — Cashier/Admin only
   ========================================================= */
export async function GET() {
  try {
    const user = await getSession();

    if (
      !user ||
      (user.role !== "CASHIER" && user.role !== "ADMIN")
    ) {
      return unauthorized();
    }

    const orders = await prisma.$queryRaw<
      Array<{
        id: string;
        orderNumber: string;
        customerName: string;
        phone: string;
        note: string | null;
        locationType: string | null;
        locationLabel: string | null;
        status: string;
        totalAmount: number;
        createdAt: Date;
        updatedAt: Date;
        items: unknown;
      }>
    >`
      SELECT
        o."id",
        o."orderNumber",
        o."customerName",
        o."phone",
        o."note",
        o."locationType",
        o."locationLabel",
        o."status",
        o."totalAmount",
        o."createdAt",
        o."updatedAt",

        COALESCE(
          json_agg(
            json_build_object(
              'id', oi."id",
              'menuItemId', oi."menuItemId",
              'itemName', oi."itemName",
              'unitPrice', oi."unitPrice",
              'quantity', oi."quantity",
              'totalPrice', oi."totalPrice"
            )
            ORDER BY oi."itemName"
          ) FILTER (WHERE oi."id" IS NOT NULL),
          '[]'::json
        ) AS "items"

      FROM "MenuOrder" o

      LEFT JOIN "MenuOrderItem" oi
        ON oi."orderId" = o."id"

      GROUP BY
        o."id",
        o."orderNumber",
        o."customerName",
        o."phone",
        o."note",
        o."locationType",
        o."locationLabel",
        o."status",
        o."totalAmount",
        o."createdAt",
        o."updatedAt"

      ORDER BY
        CASE o."status"
          WHEN 'PENDING' THEN 1
          WHEN 'PREPARING' THEN 2
          WHEN 'READY' THEN 3
          WHEN 'COMPLETED' THEN 4
          WHEN 'CANCELLED' THEN 5
          ELSE 6
        END,
        o."createdAt" DESC
    `;

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error(
      "GET /api/menu/orders failed:",
      error,
    );

    return NextResponse.json(
      { error: "تعذر تحميل الطلبات." },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST — Customer order
   ========================================================= */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = cleanText(
      body?.customerName,
      80,
    );

    const phone = cleanText(
      body?.phone,
      20,
    );

    const note =
      cleanText(body?.note, 500) || null;

    const locationType = cleanText(
      body?.locationType,
      30,
    );

    const locationLabel = cleanText(
      body?.locationLabel,
      100,
    );

    const rawItems = body?.items;

    /* =====================================================
       VALIDATION
       ===================================================== */

    if (customerName.length < 2) {
      return NextResponse.json(
        { error: "اكتب اسمك بشكل صحيح." },
        { status: 400 },
      );
    }

    if (!/^07\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 07.",
        },
        { status: 400 },
      );
    }

    if (
      !allowedLocationTypes.includes(
        locationType as (typeof allowedLocationTypes)[number],
      )
    ) {
      return NextResponse.json(
        { error: "حدد نوع مكان الطلب." },
        { status: 400 },
      );
    }

    if (!locationLabel) {
      return NextResponse.json(
        { error: "حدد رقم الجهاز أو الطاولة." },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(rawItems) ||
      rawItems.length < 1 ||
      rawItems.length > 30
    ) {
      return NextResponse.json(
        {
          error:
            "السلة فارغة أو تحتوي على عدد كبير من الأصناف.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       NORMALIZE REQUESTED ITEMS
       ===================================================== */

    const requested = new Map<string, number>();

    for (const row of rawItems) {
      const id = cleanText(
        row?.id,
        100,
      );

      const quantity = Number(
        row?.quantity,
      );

      if (
        !id ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 50
      ) {
        return NextResponse.json(
          {
            error:
              "بيانات أحد أصناف الطلب غير صحيحة.",
          },
          { status: 400 },
        );
      }

      requested.set(
        id,
        (requested.get(id) ?? 0) + quantity,
      );
    }

    const ids = [
      ...requested.keys(),
    ];

    /* =====================================================
       LOAD AVAILABLE MENU ITEMS
       ===================================================== */

    const menuItems =
      await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          price: number;
        }>
      >`
        SELECT
          "id",
          "name",
          "price"
        FROM "MenuItem"
        WHERE "id" IN (${Prisma.join(ids)})
          AND "isAvailable" = true
      `;

    if (
      menuItems.length !== ids.length
    ) {
      return NextResponse.json(
        {
          error:
            "أحد الأصناف لم يعد متاحاً. حدّث المنيو وحاول مرة ثانية.",
        },
        { status: 409 },
      );
    }

    const byId = new Map(
      menuItems.map((item) => [
        item.id,
        item,
      ]),
    );

    /* =====================================================
       BUILD ORDER ITEMS
       ===================================================== */

    const orderItems = ids.map(
      (id) => {
        const item =
          byId.get(id)!;

        const quantity =
          requested.get(id)!;

        return {
          menuItemId:
            item.id,

          itemName:
            item.name,

          unitPrice:
            item.price,

          quantity,

          totalPrice:
            item.price * quantity,
        };
      },
    );

    /* =====================================================
       TOTAL
       ===================================================== */

    const totalAmount =
      orderItems.reduce(
        (sum, item) =>
          sum + item.totalPrice,
        0,
      );

    /* =====================================================
       CREATE ORDER
       ===================================================== */

    const orderId =
      randomUUID();

    // توليد رقم الطلب هنا بدلاً من انتظار قاعدة البيانات
    const orderNumber = generateOrderNumber();

    await prisma.$transaction(
      async (tx) => {
        const inserted =
          await tx.$queryRaw<
            Array<{
              orderNumber: string;
            }>
          >`
            INSERT INTO "MenuOrder"
            (
              "id",
              "orderNumber", /* أضفنا الحقل هنا */
              "customerName",
              "phone",
              "note",
              "locationType",
              "locationLabel",
              "status",
              "totalAmount",
              "createdAt",
              "updatedAt"
            )
            VALUES
            (
              ${orderId},
              ${orderNumber}, /* أضفنا القيمة هنا */
              ${customerName},
              ${phone},
              ${note},
              ${locationType},
              ${locationLabel},
              'PENDING',
              ${totalAmount},
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            RETURNING
              "orderNumber"
          `;

        if (
          !inserted[0]?.orderNumber
        ) {
          throw new Error(
            "تعذر إنشاء رقم الطلب.",
          );
        }

        /* =================================================
           CREATE ORDER ITEMS
           ================================================= */

        for (const item of orderItems) {
          await tx.$executeRaw`
            INSERT INTO "MenuOrderItem"
            (
              "id",
              "orderId",
              "menuItemId",
              "itemName",
              "unitPrice",
              "quantity",
              "totalPrice"
            )
            VALUES
            (
              ${randomUUID()},
              ${orderId},
              ${item.menuItemId},
              ${item.itemName},
              ${item.unitPrice},
              ${item.quantity},
              ${item.totalPrice}
            )
          `;
        }
      },
    );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        order: {
          id: orderId,
          orderNumber,
          totalAmount,
          status: "PENDING",
          locationType,
          locationLabel,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/menu/orders failed:",
      error,
    );

    const detail =
      process.env.NODE_ENV !== "production" &&
      error instanceof Error
        ? ` (${error.message})`
        : "";

    return NextResponse.json(
      {
        error:
          `تعذر إرسال الطلب من قاعدة البيانات.${detail}`,
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   PATCH — Cashier/Admin only
   ========================================================= */
export async function PATCH(
  request: Request,
) {
  try {
    const user = await getSession();

    if (
      !user ||
      (user.role !== "CASHIER" &&
        user.role !== "ADMIN")
    ) {
      return unauthorized();
    }

    const body =
      await request.json();

    const orderId = cleanText(
      body?.orderId,
      100,
    );

    const status = cleanText(
      body?.status,
      30,
    );

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "رقم الطلب غير صحيح.",
        },
        { status: 400 },
      );
    }

    if (
      !allowedStatuses.includes(
        status as (typeof allowedStatuses)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "حالة الطلب غير صحيحة.",
        },
        { status: 400 },
      );
    }

    const updated =
      await prisma.$queryRaw<
        Array<{
          id: string;
          status: string;
          updatedAt: Date;
        }>
      >`
        UPDATE "MenuOrder"
        SET
          "status" =
            ${status}::"MenuOrderStatus",
          "updatedAt" =
            CURRENT_TIMESTAMP

        WHERE "id" = ${orderId}

        RETURNING
          "id",
          "status",
          "updatedAt"
      `;

    if (
      updated.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "الطلب غير موجود.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      order: updated[0],
    });
  } catch (error) {
    console.error(
      "PATCH /api/menu/orders failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "تعذر تحديث حالة الطلب.",
      },
      { status: 500 },
    );
  }
}