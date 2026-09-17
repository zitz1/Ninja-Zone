import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار أي ملف." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // [Security Fix] استخراج الاسم الأساسي فقط وتجريده من أي رموز خبيثة أو مسارات
    const originalName = path.basename(file.name);
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const filename = `${crypto.randomUUID()}-${safeName}`;
    
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    // [Security Fix] تحقق إضافي صارم لضمان أن المسار النهائي يقع حصراً داخل مجلد الرفع
    if (!filepath.startsWith(uploadDir)) {
      return NextResponse.json({ error: "مسار ملف غير صالح." }, { status: 403 });
    }

    await writeFile(filepath, buffer);

    return NextResponse.json({ success: true, imageUrl: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "حدث خطأ في السيرفر أثناء حفظ الصورة." }, { status: 500 });
  }
}