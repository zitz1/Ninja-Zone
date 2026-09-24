import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. مسح جميع الحسابات والفواتير
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    
    // 2. مسح جميع الحجوزات والأجهزة المرتبطة بها
    await prisma.bookingItem.deleteMany();
    await prisma.booking.deleteMany();
    
    // 3. مسح جميع طلبات المنيو وتفاصيلها
    await prisma.menuOrderItem.deleteMany();
    await prisma.menuOrder.deleteMany();

    // 4. إرجاع جميع الأجهزة إلى حالة "متاح" (AVAILABLE)
    await prisma.resource.updateMany({
      data: { status: "AVAILABLE" }
    });

    return NextResponse.json({ 
      success: true, 
      message: "✅ تم تنظيف قاعدة البيانات وتصفير النظام بنجاح! الترقيم الآن سيبدأ من #1." 
    });
  } catch (error) {
    console.error("Reset Error:", error);
    return NextResponse.json({ error: "تعذر تصفير النظام." }, { status: 500 });
  }
}