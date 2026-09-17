NINJA ZONE - MENU ORDERS

هذه النسخة تصلح مشكلة:
Cannot read properties of undefined (reading 'findMany')

السبب كان اعتماد API المنيو على delegate prisma.menuItem في Prisma Client محلي قديم.
النسخة الحالية تستخدم SQL المباشر في API والـseed للمنيو، بينما تبقي Prisma ORM لباقي النظام.

التشغيل:
1) تأكد أن PostgreSQL service شغال.
2) شغل RUN-NINJA-ZONE.cmd أو setup-local.cmd.
3) بعد نجاح الإعداد: npm run dev
4) افتح http://localhost:3000/menu

فحص قاعدة البيانات:
http://localhost:3000/api/health/db

يجب أن يعرض database=true وأن تظهر جداول MenuItem وMenuOrder وMenuOrderItem.

تصنيف المنيو:
وجبات: البطاطا، البرغر، الزنجر، البيتزا.
سناكات: الكريب، الكيك، الوافل، الدونات.
مشروبات: البيبسي، الماء، مشروبات الطاقة، القهوة.
عروض: عرض الجيمر.
