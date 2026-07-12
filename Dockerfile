# استخدام إصدار مستقر من Node.js
FROM node:18-alpine

# تحديد مجلد العمل داخل الحاوية
WORKDIR /app

# نسخ ملفات الحزم وتثبيتها
COPY package*.json ./
RUN npm install

# نسخ باقي ملفات المشروع
COPY . .

# بناء المشروع (اختياري، قم بتفعيله فقط إذا كان مشروعك يحتاج بناء مثل Next.js أو React)
# RUN npm run build

# تحديد المنفذ الافتراضي الذي تطلبه منصة Cloud Run
EXPOSE 8080

# أمر تشغيل التطبيق
CMD ["npm", "start"]
