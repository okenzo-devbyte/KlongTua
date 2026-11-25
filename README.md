# คล่องตัว (KlongTua) — Smart Debt & Cashflow Manager

**คล่องตัว (KlongTua)** คือระบบบริหารจัดการหนี้สิน สินเชื่อ และสภาพคล่องทางการเงินรายเดือนแบบ **Offline-First 100%** ออกแบบมาเพื่อผู้ใช้งานในประเทศไทยโดยเฉพาะ รองรับทั้ง **Web App (PWA)** และ **Native Android App** (พร้อม Home Screen AppWidget, เสียงผู้ช่วยภาษาไทย "น้องต้นหอม", ระบบล็อก PIN/Biometric และนำเข้า/ส่งออก Excel/PDF/CSV/JSON)

---

## ฟีเจอร์หลัก (Key Features)

- **Dashboard & Cashflow Engine**: สรุปภาพรวมพอร์ตหนี้สิน ยอดต้องชำระประจำเดือน ยอดคงเหลือ และพยากรณ์กระแสเงินสดล่วงหน้า 6 เดือน
- **รายการต้องชำระ (Monthly To-Do)**: แบ่งงวดชำระหลายวัน/บิลย่อยในสัญญาเดียว ติ๊กชำระพร้อมตัดเงินต้นและยอดเงินสดคงเหลืออัตโนมัติ
- **จัดการบัญชีหนี้ & หมุนเงินใช้วงเงินเดิม (Credit Redraw & Cash Rotation)**: ติดตามหนี้คงเหลือเทียบวงเงินตั้งต้น พร้อมปุ่ม **"หมุนเงิน / กดใช้ต่อ"** เพื่อกดเงินที่จ่ายคืนแล้วกลับมาใช้เต็มวงเงินเดิมหรือบางส่วน พร้อมบวกเข้าเงินสดพร้อมใช้อัตโนมัติ
- **วางแผนปลดหนี้ & จำลองรวมหนี้ (Debt Planner)**: เปรียบเทียบกลยุทธ์ **Avalanche (ปิดดอกเบี้ยสูงก่อน)** vs **Snowball (ปิดยอดเล็กก่อน)** พร้อม Slider เพิ่มเงินโปะต่อเดือน และตัวจำลองการรวมหนี้ (Refinance)
- **ประวัติการชำระ & ประวัติหมุนเงิน (Ledger)**: บันทึกประวัติการชำระย้อนหลังและประวัติการหมุนเงินทั้งหมด พร้อมค้นหา กรองตามเดือน แสดงวัน-เวลา พ.ศ. และกดยกเลิก (Undo) ได้
- **Flexible Native Android Home Widget**: วิดเจ็ตหน้าจอหลักสไตล์ NotePlus เลื่อนดูได้ไม่จำกัดรายการ ปรับสีหัวข้อ สีพื้นหลัง ความโปร่งใส ขนาดตัวอักษร แตะขีดฆ่า (Strikethrough) และซิงก์ 2 ทางทันที
- **นำเข้า/ส่งออกข้อมูลครบวงจร**: รองรับ Excel (`.xlsx`), PDF รายงาน A4, CSV (ป้องกัน Formula Injection) และ JSON Backup/Restore
- **ความปลอดภัยและความเป็นส่วนตัว (Zero-Trust Offline-First)**:
  - ข้อมูลทั้งหมดจัดเก็บบนอุปกรณ์เท่านั้น (100% On-Device)
  - รหัส PIN เข้ารหัสด้วย **PBKDF2-SHA256 + Random Salt** พร้อม Brute-Force Lockout, Auto-Lock และ Native Biometric
  - Lock-Screen Isolation ไม่แสดง Modal แจ้งเตือนหรืออ่านยอดหนี้ออกเสียงขณะล็อกหน้าจอ
  - คู่มือ FAQ, นโยบายความเป็นส่วนตัว (PDPA) และเครื่องมือตรวจสุขภาพข้อมูล (Data Diagnostics)

---

## เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS 3, Lucide Icons
- **Typography**: `@fontsource/sarabun` & `@fontsource/plus-jakarta-sans` (Tabular numerals)
- **Mobile Runtime**: Capacitor 6 (`@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/splash-screen`)
- **Testing**: Vitest (73 tests across 14 test suites)

---

## คำสั่งพัฒนาและสร้างไฟล์ (Development & Build)

```powershell
# ติดตั้ง dependencies
npm install

# รันโหมดพัฒนา (Web)
npm run dev

# รันชุดทดสอบทั้งหมด (73 tests / 14 suites)
npm test -- --run

# ตรวจสอบ TypeScript และสร้าง Production Web Bundle
npm run build

# ซิงก์ไปยังโปรเจกต์ Android และคอมไพล์ Debug APK
npx cap sync android
cd android && .\gradlew.bat assembleDebug

# คอมไพล์ Signed Release AAB สำหรับ Google Play Console
cd android && .\gradlew.bat bundleRelease
```

---

## โครงสร้างไฟล์ผลลัพธ์ Android (`build-android/`)

- `build-android/klongtua-debug.apk` — Debug APK สำหรับติดตั้งทดสอบบนเครื่อง Android
- `build-android/klongtua-release.aab` — Signed Release AAB สำหรับ Google Play Console
