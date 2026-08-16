# 🌉 منصة جسر | Jisr Jordan Enterprise Platform

منصة حجز خدمات الصيانة المنزلية والخدمات اللوجستية في المملكة الأردنية الهاشمية، مبنية بتشييد معماري عالي الأمان ومطابق لمعايير الحماية والتزامن المؤسسي.

---

## 🛠️ المعمارية التقنية (Tech Stack)

* **Framework:** Next.js 16 (App Router & Server Actions)
* **Language:** TypeScript 5
* **Backend & Auth:** Supabase (PostgreSQL + RLS + Custom RPCs)
* **Security:** HMAC-SHA256 Webhook Verification, Timing Safe Checks, RBAC
* **Testing:** Vitest (Unit & Integration) & Playwright (E2E)
* **CI/CD:** GitHub Actions & Vercel
* **Styling:** Tailwind CSS & Lucide Icons

---

## 🚀 التشغيل المحلي (Local Development)

### 1. المتطلبات
* Node.js v20+
* npm v10+

### 2. التثبيت
```bash
git clone [https://github.com/your-org/jisr-jordan.git](https://github.com/your-org/jisr-jordan.git)
cd jisr-jordan
npm install