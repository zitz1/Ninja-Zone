import {
  Prisma,
  ResourceType,
  BookingStatus,
  ResourceStatus,
} from "@prisma/client";
import { prisma } from "./prisma";

export const MIN_BOOKING_MINUTES = 30;
export const SLOT_MINUTES = 30;
export const MAX_BOOKING_DAYS = 7;
export const PENDING_TTL_MINUTES = 30;
export const GRACE_PERIOD_MINUTES = 15;

export const BUSINESS_OPEN_HOUR = 10;
export const BUSINESS_CLOSE_HOUR = 3;

export const IRAQ_OFFSET = "+03:00";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.ACTIVE,
];

export type BookingRequestItem = {
  resourceType: ResourceType;
  startAt: string;
  durationMinutes: number;
  quantity?: number;
  resourceIds?: string[];
};

export type NormalizedBookingItem = {
  resourceType: ResourceType;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  quantity: number;
  resourceIds?: string[];
};

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

/* =========================================================
   DATE
========================================================= */

function assertDate(value: string, label: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BookingValidationError(
      `${label} يحتوي على تاريخ أو وقت غير صالح.`,
    );
  }

  return date;
}

/* =========================================================
   IRAQ CLOCK
========================================================= */

function iraqClockMinutes(date: Date): number {
  const shifted = new Date(
    date.getTime() + 3 * 60 * 60_000,
  );

  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();

  const total = hours * 60 + minutes;

  return total < BUSINESS_OPEN_HOUR * 60
    ? total + 24 * 60
    : total;
}

/* =========================================================
   BUSINESS HOURS
========================================================= */

function assertBusinessHours(
  startAt: Date,
  endAt: Date,
) {
  const start = iraqClockMinutes(startAt);
  const end = iraqClockMinutes(endAt);

  const open = BUSINESS_OPEN_HOUR * 60;
  const close =
    24 * 60 + BUSINESS_CLOSE_HOUR * 60;

  if (
    start < open ||
    end > close ||
    end <= start
  ) {
    throw new BookingValidationError(
      "عذرًا، وقت الحجز يجب أن يكون ضمن ساعات عمل نينجا زون من 10:00 صباحًا إلى 3:00 فجرًا.",
    );
  }
}

/* =========================================================
   NORMALIZE BOOKING
========================================================= */

export function normalizeBookingItems(
  items: BookingRequestItem[],
): NormalizedBookingItem[] {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new BookingValidationError(
      "يجب إضافة حجز واحد على الأقل.",
    );
  }

  return items.map((item) => {
    const quantity = item.quantity ?? 1;

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 50
    ) {
      throw new BookingValidationError(
        "الكمية يجب أن تكون رقماً صحيحاً من 1 إلى 50.",
      );
    }

    const durationMinutes =
      item.durationMinutes;

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <
        MIN_BOOKING_MINUTES ||
      durationMinutes %
        SLOT_MINUTES !==
        0
    ) {
      throw new BookingValidationError(
        "مدة الحجز يجب أن تكون 30 دقيقة على الأقل وبزيادات 30 دقيقة.",
      );
    }

    let startAt = assertDate(
      item.startAt,
      "وقت بداية الحجز",
    );

    const now = new Date();

    const shiftedStart = new Date(startAt.getTime() + 3 * 60 * 60_000);
    const iraqHour = shiftedStart.getUTCHours();
    if (iraqHour < BUSINESS_OPEN_HOUR && startAt < now) {
      const candidate = new Date(startAt.getTime() + 24 * 60 * 60_000);
      if (candidate.getTime() - now.getTime() > -15 * 60_000) {
        startAt = candidate;
      }
    }

    const endAt = new Date(
      startAt.getTime() +
        durationMinutes * 60_000,
    );

    const thresholdNow = new Date(
      now.getTime() - 15 * 60_000,
    );

    const latestAllowed = new Date(
      now.getTime() +
        MAX_BOOKING_DAYS *
          24 *
          60 *
          60_000,
    );

    if (startAt <= thresholdNow) {
      throw new BookingValidationError(
        "وقت بداية الحجز يجب أن يكون في المستقبل.",
      );
    }

    if (startAt > latestAllowed) {
      throw new BookingValidationError(
        `يمكن الحجز لمدة تصل إلى ${MAX_BOOKING_DAYS} أيام من الآن فقط.`,
      );
    }

    assertBusinessHours(
      startAt,
      endAt,
    );

    const resourceIds =
      Array.isArray(item.resourceIds)
        ? [
            ...new Set(
              item.resourceIds.filter(
                (id): id is string =>
                  typeof id ===
                    "string" &&
                  id.trim().length > 0,
              ),
            ),
          ]
        : undefined;

    if (
      resourceIds &&
      resourceIds.length > 0 &&
      resourceIds.length !==
        quantity
    ) {
      throw new BookingValidationError(
        "عدد الأجهزة المحددة يجب أن يطابق الكمية المطلوبة.",
      );
    }

    return {
      resourceType: item.resourceType,
      startAt,
      endAt,
      durationMinutes,
      quantity,
      resourceIds,
    };
  });
}

/* =========================================================
   EXPIRE PENDING BOOKINGS
========================================================= */

async function expirePendingBookings(
  tx: Prisma.TransactionClient,
  now: Date,
) {
  await tx.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      expiresAt: {
        lt: new Date(now.getTime() - 60 * 60_000),
      },
    },
    data: {
      status:
        BookingStatus.EXPIRED,
    },
  });
}

/* =========================================================
   OVERLAP
========================================================= */

function overlaps(
  startAt: Date,
  endAt: Date,
  otherStart: Date,
  otherEnd: Date,
) {
  return (
    startAt < otherEnd &&
    endAt > otherStart
  );
}

/* =========================================================
   CANONICAL RESOURCE CODES
========================================================= */

function isCanonicalResourceCode(
  type: ResourceType,
  code: string,
) {
  const normalized =
    code.trim().toUpperCase();

  switch (type) {
    case ResourceType.BILLIARD:
      return /^BILLIARD-(0?[1-2])$/.test(normalized);

    case ResourceType.PC_NORMAL:
      return /^PC-NORMAL-(0?[1-8])$/.test(normalized);

    case ResourceType.PC_MASTER:
      return /^PC-MASTER-(0?[1-8])$/.test(normalized);

    case ResourceType.PS5:
      return /^PS5-(0?[1-9]|10)$/.test(normalized);

    case ResourceType.CINEMA:
      return /^CINEMA-(0?[1-4])$/.test(normalized);

    case ResourceType.TABLE:
      return /^TABLE-(0?[1-8])$/.test(normalized);

    default:
      return true;
  }
}

/* =========================================================
   RESOURCE ALLOCATION
========================================================= */

async function allocateResources(
  tx: Prisma.TransactionClient,
  item: NormalizedBookingItem,
  requestedResourceIds?: string[],
) {
  const requestedIds = [
    ...new Set(
      requestedResourceIds ?? [],
    ),
  ];

  if (
    requestedIds.length > 0 &&
    requestedIds.length !==
      item.quantity
  ) {
    throw new BookingValidationError(
      "عدد الأجهزة المحددة يجب أن يطابق الكمية المطلوبة.",
    );
  }

  const rawResources =
    await tx.resource.findMany({
      where: {
        id:
          requestedIds.length > 0
            ? {
                in: requestedIds,
              }
            : undefined,

        type: item.resourceType,

        isActive: true,

        status: {
          in: [
            ResourceStatus.AVAILABLE,
            ResourceStatus.RESERVED,
            ResourceStatus.PLAYING,
          ],
        },
      },

      orderBy: {
        code: "asc",
      },

      select: {
        id: true,
        code: true,
        status: true,
        type: true,
      },
    });

  const resources =
    rawResources.filter(
      (resource) =>
        isCanonicalResourceCode(
          resource.type,
          resource.code,
        ),
    );

  if (
    resources.length <
    item.quantity
  ) {
    if (
      requestedIds.length > 0
    ) {
      throw new BookingValidationError(
        "جهاز واحد أو أكثر من الأجهزة المحددة لم يعد متاحاً.",
      );
    }

    throw new BookingValidationError(
      `لا توجد أجهزة كافية من نوع ${item.resourceType}.`,
    );
  }

  const resourceIds =
    resources.map(
      (resource) => resource.id,
    );

  const conflicts =
    await tx.bookingItem.findMany({
      where: {
        resourceId: {
          in: resourceIds,
        },

        startAt: {
          lt: item.endAt,
        },

        endAt: {
          gt: item.startAt,
        },

        booking: {
          status: {
            in:
              ACTIVE_BOOKING_STATUSES,
          },

          OR: [
            {
              status: {
                not:
                  BookingStatus.PENDING,
              },
            },

            {
              status:
                BookingStatus.PENDING,

              expiresAt: {
                gt: new Date(),
              },
            },
          ],
        },
      },

      select: {
        resourceId: true,
        startAt: true,
        endAt: true,
      },
    });

  const blocked = new Set(
    conflicts
      .filter(
        (conflict) =>
          conflict.resourceId &&
          overlaps(
            item.startAt,
            item.endAt,
            conflict.startAt,
            conflict.endAt,
          ),
      )
      .map(
        (conflict) =>
          conflict.resourceId as string,
      ),
  );

  const available =
    resources.filter(
      (resource) =>
        !blocked.has(resource.id),
    );

  if (
    available.length <
    item.quantity
  ) {
    throw new BookingValidationError(
      `المتاح من ${item.resourceType} في الوقت المحدد هو ${available.length} فقط.`,
    );
  }

  if (
    requestedIds.length > 0 &&
    available.length !==
      requestedIds.length
  ) {
    throw new BookingValidationError(
      "جهاز واحد أو أكثر من الأجهزة المحددة لم يعد متاحاً.",
    );
  }

  return requestedIds.length > 0
    ? available
    : available.slice(
        0,
        item.quantity,
      );
}

/* =========================================================
   BOOKING NUMBER (SEQUENTIAL & CONCURRENCY SAFE)
========================================================= */

async function generateBookingNumber(
  tx: Prisma.TransactionClient,
) {
  const now = new Date();
  const iraqTime = new Date(now.getTime() + 3 * 60 * 60_000);
  iraqTime.setUTCHours(0, 0, 0, 0);
  const startOfDayUtc = new Date(iraqTime.getTime() - 3 * 60 * 60_000);

  const countToday = await tx.booking.count({
    where: {
      createdAt: {
        gte: startOfDayUtc,
      },
    },
  });

  let seq = countToday + 1;
  let bookingNumber = `#${seq}`;

  // منع حدوث تضارب في أرقام الحجوزات عند ازدحام الطلبات
  while (true) {
    const existing = await tx.booking.findUnique({
      where: { bookingNumber },
      select: { id: true },
    });
    if (!existing) break;
    seq++;
    bookingNumber = `#${seq}`;
  }

  return bookingNumber;
}

/* =========================================================
   CREATE PENDING BOOKING
========================================================= */

export async function createPendingBooking(
  userId: string,
  items: BookingRequestItem[],
  customerNote?: string,
) {
  const normalized =
    normalizeBookingItems(items);

  let lastError: unknown;

  for (
    let attempt = 0;
    attempt < 3;
    attempt++
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const now =
            new Date();

          await expirePendingBookings(
            tx,
            now,
          );

          const user =
            await tx.user.findUnique({
              where: {
                id: userId,
              },

              select: {
                id: true,
                isActive: true,
                name: true,
              },
            });

          if (!user) {
            throw new BookingValidationError(
              "حساب المستخدم غير موجود.",
            );
          }

          if (!user.isActive) {
            throw new BookingValidationError(
              "حساب المستخدم غير فعال.",
            );
          }

          const pricing =
            await tx.pricing.findMany({
              where: {
                resourceType: {
                  in: normalized.map(
                    (item) =>
                      item.resourceType,
                  ),
                },

                active: true,
              },
            });

          const priceMap =
            new Map<
              ResourceType,
              number
            >(
              pricing.map(
                (price) => [
                  price.resourceType,
                  price.pricePerHour,
                ],
              ),
            );

          const allocated: Array<{
            resourceId: string;
            resourceType: ResourceType;
            startAt: Date;
            endAt: Date;
            durationMinutes: number;
            unitPrice: number;
            totalPrice: number;
          }> = [];

          for (
            const item of normalized
          ) {
            const unitPrice =
              priceMap.get(
                item.resourceType,
              );

            if (
              unitPrice ===
              undefined
            ) {
              throw new BookingValidationError(
                `لا يوجد سعر فعال لنوع ${item.resourceType}.`,
              );
            }

            const resources =
              await allocateResources(
                tx,
                item,
                item.resourceIds,
              );

            for (
              const resource of resources
            ) {
              const totalPrice =
                Math.round(
                  (unitPrice *
                    item.durationMinutes) /
                    60,
                );

              allocated.push({
                resourceId:
                  resource.id,

                resourceType:
                  item.resourceType,

                startAt:
                  item.startAt,

                endAt:
                  item.endAt,

                durationMinutes:
                  item.durationMinutes,

                unitPrice,

                totalPrice,
              });
            }
          }

          const totalAmount =
            allocated.reduce(
              (sum, item) =>
                sum +
                item.totalPrice,
              0,
            );

          const expiresAt =
            new Date(
              now.getTime() +
                PENDING_TTL_MINUTES *
                  60_000,
            );

          const bookingNumber =
            await generateBookingNumber(
              tx,
            );

          return tx.booking.create({
            data: {
              userId,

              bookingNumber,

              status:
                BookingStatus.PENDING,

              startAt:
                normalized.reduce(
                  (min, item) =>
                    item.startAt <
                    min
                      ? item.startAt
                      : min,

                  normalized[0]
                    .startAt,
                ),

              endAt:
                normalized.reduce(
                  (max, item) =>
                    item.endAt >
                    max
                      ? item.endAt
                      : max,

                  normalized[0]
                    .endAt,
                ),

              totalAmount,

              customerNote:
                customerNote
                  ?.trim() ||
                undefined,

              expiresAt,

              items: {
                create:
                  allocated,
              },
            },

            include: {
              items: {
                include: {
                  resource: true,
                },
              },
            },
          });
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      lastError = error;

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/* =========================================================
   AVAILABILITY
========================================================= */

export async function getAvailability(
  resourceType: ResourceType,
  startAtInput: Date,
  endAtInput: Date,
) {
  if (
    !(startAtInput instanceof Date) ||
    Number.isNaN(startAtInput.getTime())
  ) {
    throw new BookingValidationError(
      "وقت بداية الحجز غير صالح.",
    );
  }

  if (
    !(endAtInput instanceof Date) ||
    Number.isNaN(endAtInput.getTime())
  ) {
    throw new BookingValidationError(
      "وقت نهاية الحجز غير صالح.",
    );
  }

  let startAt = startAtInput;
  let endAt = endAtInput;

  const now = new Date();

  const shiftedStart = new Date(startAt.getTime() + 3 * 60 * 60_000);
  const iraqHour = shiftedStart.getUTCHours();
  if (iraqHour < BUSINESS_OPEN_HOUR && startAt < now) {
    const candidateStart = new Date(startAt.getTime() + 24 * 60 * 60_000);
    const candidateEnd = new Date(endAt.getTime() + 24 * 60 * 60_000);
    if (candidateStart.getTime() - now.getTime() > -15 * 60_000) {
      startAt = candidateStart;
      endAt = candidateEnd;
    }
  }

  if (endAt <= startAt) {
    throw new BookingValidationError(
      "وقت نهاية الحجز يجب أن يكون بعد وقت البداية.",
    );
  }

  const thresholdNow = new Date(now.getTime() - 15 * 60_000);
  if (startAt <= thresholdNow) {
    throw new BookingValidationError(
      "وقت بداية الحجز يجب أن يكون في المستقبل.",
    );
  }

  assertBusinessHours(
    startAt,
    endAt,
  );

  const rawResources =
    await prisma.resource.findMany({
      where: {
        type: resourceType,
        isActive: true,
      },

      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        type: true,
      },

      orderBy: {
        code: "asc",
      },
    });

  const resources =
    rawResources.filter(
      (resource) =>
        isCanonicalResourceCode(
          resource.type,
          resource.code,
        ),
    );

  const conflicts =
    resources.length > 0
      ? await prisma.bookingItem.findMany(
          {
            where: {
              resourceId: {
                in: resources.map(
                  (resource) =>
                    resource.id,
                ),
              },

              startAt: {
                lt: endAt,
              },

              endAt: {
                gt: startAt,
              },

              booking: {
                status: {
                  in:
                    ACTIVE_BOOKING_STATUSES,
                },

                OR: [
                  {
                    status: {
                      not:
                        BookingStatus.PENDING,
                    },
                  },

                  {
                    status:
                      BookingStatus.PENDING,

                    expiresAt: {
                      gt: new Date(),
                    },
                  },
                ],
              },
            },

            select: {
              resourceId: true,
              startAt: true,
              endAt: true,
            },
          },
        )
      : [];

  const blocked =
    new Set<string>();

  for (
    const conflict of conflicts
  ) {
    if (
      !conflict.resourceId
    ) {
      continue;
    }

    if (
      overlaps(
        startAt,
        endAt,
        conflict.startAt,
        conflict.endAt,
      )
    ) {
      blocked.add(
        conflict.resourceId,
      );
    }
  }

  const availableResources =
    resources.filter(
      (resource) => {
        const blockedByBooking =
          blocked.has(
            resource.id,
          );

        const permanentlyUnavailable =
          resource.status ===
            ResourceStatus.MAINTENANCE ||
          resource.status ===
            ResourceStatus.DISABLED;

        return (
          !blockedByBooking &&
          !permanentlyUnavailable
        );
      },
    );

  return {
    total:
      resources.length,

    available:
      availableResources.length,

    canBook:
      availableResources.length > 0,

    resources:
      resources.map(
        (resource) => {
          const booked =
            blocked.has(
              resource.id,
            );

          const permanentlyUnavailable =
            resource.status ===
              ResourceStatus.MAINTENANCE ||
              resource.status ===
              ResourceStatus.DISABLED;

          const available =
            !booked &&
            !permanentlyUnavailable;

          return {
            id: resource.id,

            code:
              resource.code,

            name:
              resource.name?.trim() ||
              resource.code,

            status:
              resource.status,

            available,

            booked,
          };
        },
      ),
  };
}

/* =========================================================
   IRAQ DATE
========================================================= */

export function makeIraqDate(
  date: string,
  time: string,
): Date {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date,
    ) ||
    !/^\d{2}:\d{2}$/.test(
      time,
    )
  ) {
    throw new BookingValidationError(
      "التاريخ يجب أن يكون YYYY-MM-DD والوقت HH:mm.",
    );
  }

  let parsed = assertDate(
    `${date}T${time}:00${IRAQ_OFFSET}`,
    "التاريخ والوقت",
  );

  const [hours] = time.split(":").map(Number);
  const now = new Date();

  if (hours < BUSINESS_OPEN_HOUR) {
    if (parsed.getTime() <= now.getTime() - 10 * 60_000) {
      parsed = new Date(parsed.getTime() + 24 * 60 * 60_000);
    }
  }

  return parsed;
}

/* =========================================================
   BUSINESS DAY SLOTS
========================================================= */

export function generateBusinessDaySlots(
  businessDate: string,
): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      businessDate,
    )
  ) {
    throw new BookingValidationError(
      "التاريخ يجب أن يكون بالصيغة YYYY-MM-DD.",
    );
  }

  const [
    year,
    month,
    day,
  ] =
    businessDate
      .split("-")
      .map(Number);

  const start = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      BUSINESS_OPEN_HOUR - 3,
      0,
      0,
    ),
  );

  const slots: string[] = [];

  for (
    let minutes = 0;
    minutes <=
      17 * 60 + 30;
    minutes += SLOT_MINUTES
  ) {
    const date =
      new Date(
        start.getTime() +
          minutes * 60_000,
      );

    slots.push(
      date.toISOString(),
    );
  }

  return slots;
}