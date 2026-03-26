# 🚀 SMS Automation Bot Dashboard

![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)
![Express.js](https://img.shields.io/badge/Express.js-4.x-blue?style=for-the-badge&logo=express)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)

لوحة تحكم ذكية ومحمية مبنية بـ Node.js و Tailwind CSS، مصممة لأتمتة إرسال الرسائل النصية (SMS) بشكل متكرر إلى رقم محدد باستخدام أي بوابة إرسال (HTTP Gateway). 

تتميز اللوحة بنظام توليد رسائل عشوائي من كلمات مفتاحية لتجنب الحظر، مع مراقبة حية لعملية الإرسال.

---

## ✨ ميزات النظام (Features)

* **🔐 حماية عبر الـ OTP:** لا يمكن الدخول للوحة التحكم إلا بطلب رمز تحقق (OTP) يتم إرساله إلى رقم المطور وتخزينه في الجلسة (Session).
* **⚙️ أتمتة الإرسال (Bot):** إمكانية تحديد (رقم المستلم، عدد الرسائل المطلوبة، والفاصل الزمني بالثواني بين كل رسالة).
* **🔀 خلط الكلمات (Randomizer):** نظام ذكي يقوم باختيار وخلط كلمات مفتاحية محددة مسبقاً لتوليد رسالة فريدة في كل عملية إرسال، مع إمكانية إضافة "توقيع" ثابت في النهاية.
* **📊 مراقبة حية (Live Dashboard):** شريط تقدم (Progress Bar) وسجل نشاطات (Logs) يوضح حالة كل رسالة (تم الإرسال / فشل) يتم تحديثه لحظياً.
* **🛑 تحكم كامل:** إمكانية إيقاف عملية الإرسال في أي وقت بضغطة زر.
* **💾 قاعدة بيانات خفيفة:** استخدام `fs-extra` لتخزين الإعدادات، الكلمات المفتاحية، والسجلات في ملف `database.json` محلي بدون تعقيدات.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

* **Backend:** Node.js, Express.js, Axios, Express-Session, uuid
* **Frontend:** HTML5, Tailwind CSS (Standalone), FontAwesome 6
* **Database:** Local JSON File (`database.json`)

---

## 📂 إعداد المسارات والمكتبات (Manual Setup)

تم استبعاد بعض الملفات من المستودع لتخفيف الحجم. لتعمل الواجهة بشكل صحيح، يرجى تجهيز مجلد `public` كالتالي:

1. **Tailwind CSS:** ضع ملف `tailwind.js` مباشرة داخل مجلد `public` (`public/tailwind.js`).
2. **Font Awesome:**
   قم بوضع ملفات الأيقونات بحيث يكون مسار ملف الـ CSS الأساسي هو:
   `public/fontawesome/fontawesome/css/all.min.css`

---

## 🚀 طريقة التشغيل (How to Run)

### 1. تثبيت الحزم (Install Dependencies)
في مسار المشروع، قم بتنفيذ الأمر التالي لتثبيت مكتبات (express, axios, cors, fs-extra...):
```bash
npm install
