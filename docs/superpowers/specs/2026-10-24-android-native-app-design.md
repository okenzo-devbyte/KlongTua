# DebtFlow Enterprise — ปรับเป็น Android App จริง (Native Hardening)

วันที่: 2026-10-24
สถานะ: อนุมัติแล้ว (2026-10-24)

## ทำไมต้องทำ

ผู้ใช้รู้สึกว่าแอป "ยังเป็นเว็บที่รันใน Browser" เพราะยังพึ่ง API ที่มีแต่ในเบราว์เซอร์, Biometric ใช้งานไม่ได้จริง, และมีข้อมูลตัวอย่างฝังอยู่ในแอป

เป้าหมายคือคง React + Capacitor ไว้ (ผู้ใช้เลือกทาง A) แต่เปลี่ยนส่วนที่ยังเป็นเว็บให้เป็น native และลบข้อมูลปลอมทั้งหมด เพื่อให้ได้แอป Android ที่ติดตั้งแล้วใช้งานได้จริงแบบออฟไลน์

## ผู้ใช้ตัดสินใจแล้ว

- คง React + Capacitor ไม่เขียนใหม่เป็น Kotlin/Compose
- ต้องมี Biometric ที่ทำงานจริง
- ต้องไม่มี mock data ฝังในแอป

## Goals

1. Native shell: splash, status bar/nav bar ตามธีม, ปุ่ม Back, ปิด zoom/overscroll/context menu, ฟอนต์ในเครื่อง, ไม่มี browser chrome
2. Biometric จริงผ่าน AndroidX `BiometricPrompt`
3. แทนที่ API ที่ WebView ไม่รองรับ: พิมพ์ PDF, ดาวน์โหลด/แชร์ไฟล์, เสียงพูดไทย
4. ลบ seed/demo data และ fake integrations ทั้งหมด
5. ได้ APK/AAB release ที่ลงนามแล้วและติดตั้งได้จริง

## Non-goals

- ไม่เขียน UI ใหม่เป็น Kotlin/Compose
- ไม่ทำ Gmail API/OAuth, LINE Login จริง, หรือ cloud sync (ไม่มี credentials/backend)
- ไม่เข้ารหัส localStorage ด้วย Keystore (Biometric เป็นเพียง app-level gate ไม่ใช่การเข้ารหัสข้อมูล)
- ไม่ทำ Play Store submission และไม่ upgrade targetSdk 35 (งานแยกถ้าต้องขึ้น Store)
- ไม่ทำ multi-language

## Constraints

- Capacitor 6.2, React 18, Vite 5, TypeScript 5.4, Tailwind 3, Vitest 1.6
- Android: AGP 8.2.1, compileSdk/targetSdk 34, JDK 21, SDK ที่ `C:\Android`
- เครื่องนี้ไม่มี adb/emulator → verify ได้ถึงระดับ build เท่านั้น ผู้ใช้ต้องติดตั้งบนเครื่องจริง
- ไม่มี git repo ในโฟลเดอร์นี้ (ไม่มีการ commit)

## Decisions ของผู้สร้าง (marked as builder calls)

- `minSdkVersion` 23 (BiometricPrompt ใช้ได้ตั้งแต่ 23 ขึ้นไป, รองรับเครื่องเก่าได้มากกว่า 24)
- ไม่ลบข้อมูลผู้ใช้เดิมอัตโนมัติ: เพิ่มปุ่ม "ลบข้อมูลตัวอย่าง" สำหรับ seed ที่รู้จัก และ "ลบข้อมูลทั้งหมด"
- ลบ LINE Login ปลอม แต่เก็บปุ่มแชร์ไป LINE (deep link จริง)
- เปลี่ยนชื่อ UI จาก Gmail เป็น "สำรองข้อมูล" และแชร์ไฟล์จริงผ่าน Android Share Sheet
- คงชื่อ type ภายใน `GmailBackupMeta` ไว้ก่อนเพื่อลด churn แต่ตัดฟิลด์ปลอม (`googleEmail`, `isConnected`) ออก
- ฟอนต์ bundle เฉพาะน้ำหนักที่ใช้: Sarabun 400/600/700 และ Plus Jakarta Sans 400/600/700/800
- Splash/icon สร้างจาก `build-android/playstore-icon-512x512.png` ด้วย `@capacitor/assets`
- Release build ใช้ keystore ที่ generate ใหม่ เก็บนอก source (ดูหัวข้อ Release)

### Builder check (อ่าน design แล้วแก้ ambiguity)

- **Print**: จะไม่พิมพ์ WebView ทั้งแอปเพราะจะติด Navbar/พื้นหลังมาด้วย → ย้าย `PdfReportModal` ไป `createPortal(..., document.body)` แล้วเพิ่ม `@media print` ให้ซ่อนทุกอย่างยกเว้น print root ของรายงาน
- **Biometric**: ใช้ `BIOMETRIC_STRONG` เป็นหลัก; ถ้าเครื่องไม่มีให้ผู้ใช้ใช้ PIN (ไม่พึ่ง `DEVICE_CREDENTIAL` เพราะพฤติกรรมต่างกันใน API 23-29)
- **TTS**: เล่น chime ด้วย native `ToneGenerator` และ resolve promise เมื่อ `UtteranceProgressListener.onDone` เพื่อให้ลำดับเสียงถูกต้อง; Web Audio ใช้เฉพาะเว็บ
- **Viewport**: คง `maximum-scale=1.0, user-scalable=no` และปิด zoom ที่ WebView (ไม่เปิด pinch zoom เพราะทำให้รู้สึกเป็นเว็บ)
- **Origin**: `androidScheme` ปัจจุบันเป็น `https` อยู่แล้ว (ค่า default ของ `CapConfig`) → การระบุ `https` ชัดเจนไม่ทำให้ localStorage เดิมหาย
- **Restore**: ใช้ `<input type="file">` ต่อ; Capacitor's `BridgeWebChromeClient` เปิด native file picker ให้อยู่แล้ว ถ้าทดสอบบนเครื่องจริงแล้วไม่เปิด จะเพิ่ม `FilePickerPlugin` เป็น fallback
- **Splash safety**: ตั้ง timeout 3 วินาทีซ่อน splash ถ้า JS mount ไม่สำเร็จ

## สถาปัตยกรรม

### 1) Native shell

**Capacitor plugins ที่เพิ่ม (official):**
- `@capacitor/app` — back button, app state
- `@capacitor/status-bar` — สี status bar ตามธีม
- `@capacitor/splash-screen` — ซ่อน splash หลัง paint แรก
- `@capacitor/filesystem` — เขียนไฟล์ backup/CSV
- `@capacitor/dialog` — native alert/confirm
- ใช้ของเดิม: `@capacitor/local-notifications`, `@capacitor/share`

**capacitor.config.ts**
- `server.androidScheme: 'https'`
- `android.allowMixedContent: false`
- `plugins.SplashScreen`: `launchAutoHide: false`, `backgroundColor: '#0B0F19'`, `showSpinner: false`
- `plugins.StatusBar`: `overlaysWebView: false`, style/backgroundColor เริ่มต้นแบบ light
- `plugins.LocalNotifications`: `smallIcon: 'ic_stat_debtflow'`, `sound: 'beep.wav'`, `iconColor: '#B45309'`

**MainActivity.java**
- `registerPlugin(BiometricPlugin.class)`, `TtsPlugin.class`, `PrintPlugin.class`
- `bridge.getWebView()`: `setOverScrollMode(OVER_SCROLL_NEVER)`, `setSupportZoom(false)`, `setBuiltInZoomControls(false)`, `setDisplayZoomControls(false)`, `setOnLongClickListener(v -> true)`
- ไม่เปิด WebView debugging ใน release ( Capacitor จัดการตาม debuggable )

**AndroidManifest.xml**
- เพิ่ม `USE_BIOMETRIC`
- `android:windowSoftInputMode="adjustResize"` ที่ MainActivity
- `android:enableOnBackInvokedCallback="false"` (ใช้ legacy back ผ่าน Capacitor App)
- คง `SCHEDULE_EXACT_ALARM` และ `POST_NOTIFICATIONS`

**Theme / System bars**
- `AppTheme.NoActionBarLaunch` ใช้ splash ที่ generate ใหม่
- Sync สี status bar และ nav bar ทุกครั้งที่ `pencilConfig.themeMode` เปลี่ยน (LIGHT/DARK/SYSTEM)
- ใช้ status bar แบบไม่ overlay เพื่อเลี่ยงปัญหา `env(safe-area-inset-*)` ที่ Android WebView ไม่รองรับเสถียร

**Splash**
- `App.tsx` เรียก `SplashScreen.hide()` หลัง mount/ paint แรก
- สร้าง assets ด้วย `@capacitor/assets` จากไอคอน 512px

**Back button**
- `src/services/backHandler.ts`: stack ของ handler (`pushBackHandler` / `popBackHandler`)
- `src/hooks/useAndroidBack.ts`: hook สำหรับ modal/sheet
- ลำดับการทำงาน: ปิด modal/sheet ที่เปิดอยู่ → ถ้า tab ไม่ใช่ dashboard กลับ dashboard → กด Back ซ้ำภายใน 2 วินาทีเพื่อออก (`App.exitApp()`), ครั้งแรกแสดง toast

**Native dialogs**
- แทน `window.confirm` / `alert` ใน `LoanManagerView`, `LoanFormModal`, `SettingsView`, `GmailBackupView` ด้วย `Dialog.confirm` / `Dialog.alert` (fallback เป็น web เมื่อรัน `npm run dev`)

**ฟอนต์/CSS**
- ดาวน์โหลด woff2 ไปที่ `public/fonts/`, เพิ่ม `@font-face` ใน `src/index.css`, ลบ `<link>` Google Fonts ใน `index.html`
- `html, body`: `overscroll-behavior: none`, `touch-action: manipulation`
- UI ยัง `select-none`; input/textarea ต้องเลือกข้อความได้
- คง `viewport-fit=cover` และ `maximum-scale=1.0, user-scalable=no`; ปิด zoom ที่ WebView ด้วย

### 2) Native plugins (local, Java)

**BiometricPlugin** — `androidx.biometric:biometric:1.1.0`
- `isAvailable()` → `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)`
- `authenticate({ title, subtitle, cancelTitle })`
- ใช้ `BiometricPrompt` กับ `FragmentActivity` (MainActivity extends BridgeActivity ซึ่งเป็น AppCompatActivity)
- JS wrapper: `src/services/native/biometric.ts`
- `securityService.authenticateBiometric()`: native → plugin; web → WebAuthn เดิม (สำหรับ dev)
- `SecurityLockScreen`: native ไม่ต้องใช้ `credentialId`
- `SettingsView`: กดเปิด Biometric แล้วเรียก `isAvailable()`; ถ้าไม่มี biometric ให้แจ้งและไม่เปิด toggle (ผู้ใช้ยังปลดล็อกด้วย PIN ได้)
- ไม่บังคับ device credential เพราะ `BiometricPrompt` รองรับต่างกันใน API 23-29; PIN คือ fallback ที่ชัดเจนกว่า

**TtsPlugin** — Android `TextToSpeech`
- `isAvailable()`, `speak({ text, rate, pitch, volume, chime })`, `stop()`
- `setLanguage(new Locale("th", "TH"))`; ถ้า `LANG_MISSING_DATA` / `LANG_NOT_SUPPORTED` คืน error ที่อ่านได้
- `thaiVoiceService.speakThaiText()`: native → TtsPlugin (รวม chime) ; web → Web Speech/Google fallback เดิม
- chime เล่นด้วย native `ToneGenerator` เพื่อเลี่ยง autoplay policy ของ WebView; `speak()` resolve เมื่อ `UtteranceProgressListener.onDone`
- ข้อความไทยแต่ละประโยคสั้นกว่าขีดจำกัดของ TTS อยู่แล้ว ไม่ต้อง chunk ฝั่ง native
- ถ้าเครื่องไม่มีเสียงไทย → แสดงข้อความแนะนำติดตั้งเสียงใน Settings

**PrintPlugin** — Android `PrintManager`
- `print({ jobName })` ใช้ `bridge.getWebView().createPrintDocumentAdapter(jobName)` บน UI thread
- `PdfReportModal`: native → plugin, web → `window.print()`
- ย้าย modal ไป `createPortal(..., document.body)` พร้อม class `pdf-print-root`; เพิ่ม `@media print` ซ่อน `body > *:not(.pdf-print-root)` เพื่อไม่ให้ Navbar/พื้นหลังแอปติดไปในเอกสาร

**SystemBarsPlugin** — Android `Window` + `WindowInsetsControllerCompat`
- `setNavigationBar({ color, lightIcons })` ตั้งสี nav bar และไอคอนให้ตรงกับธีม
- เรียกจาก `applySystemBars(isDark)` คู่กับ `@capacitor/status-bar`

**ไฟล์ backup/CSV**
- เขียนด้วย `Filesystem.writeFile` ไป `Directory.Cache` (base64)
- แชร์ด้วย `Share.share({ url: fileUri })` เพื่อให้ผู้ใช้บันทึกไป Drive/Files หรือส่งต่อ
- Restore คง `<input type="file">` (Capacitor เปิด native file picker ให้)
- ลบ `mailto:` และช่องอีเมลผู้รับ

**แจ้งเตือน**
- เพิ่ม `res/raw/beep.wav` (โทนสั้น) และ `res/drawable/ic_stat_debtflow.xml` (vector สีขาว)
- ตรวจ/ขอ exact alarm setting ผ่าน `LocalNotifications.checkExactNotificationSetting()` / `changeExactNotificationSetting()` เมื่อผู้ใช้เปิดแจ้งเตือน
- Sync ตอน app start, ตอนข้อมูลเปลี่ยน, และตอน `appStateChange` เป็น active

### 3) ลบ mock data / fake integrations

- `src/data/lenders.ts`: ลบ `getInitialSeedLoans()` และ `getInitialSeedPaymentRecords()` (คง `LENDERS_CATALOG` ซึ่งเป็นข้อมูลอ้างอิงจริง)
- `storageService.loadAppState()`: ค่าเริ่มต้น `loans: []`, `paymentRecords: []`, `availableFunds: 0`
- แทน `resetToSeedData()` ด้วย `clearAllData()`:
  - ลบ keys ของ loans, records, funds, notification rules, widget config, backup meta, voice, selected month, pencil, nav tabs, security, LINE profile, snooze, collapsible, widget snapshot, scheduled notification ids
  - โหลด default configs ใหม่
- Settings: ปุ่ม "ลบข้อมูลทั้งหมด" + native confirm
- Settings: ปุ่ม "ลบข้อมูลตัวอย่าง" (กรองเฉพาะ loan id ที่รู้จัก: `loan-spaylater-1`, `loan-kbank-split`, `loan-linebk-1`, `loan-tidlor-1` และ payment records ที่เกี่ยวข้อง)
- `GmailBackupView`: ลบการ์ด demo reset, ลบช่องอีเมลผู้รับ, เปลี่ยนข้อความเป็น "สำรองข้อมูล"
- `lineAuthService`: ลบ `connectLineAccount` / `disconnectLineAccount` (โปรไฟล์ปลอม/รูป Unsplash); เก็บ `shareDebtFlowToLine`
- `SettingsView`: section LINE เหลือเฉพาะปุ่มแชร์; ลบโปรไฟล์/ปุ่มเชื่อมต่อ
- `types/loan.ts`: ลบ `LineUserProfile`, ตัด `lineProfile` ออกจาก `AppStateData`, ตัด `googleEmail`/`isConnected` ออกจาก `GmailBackupMeta`
- `App.tsx` / `Navbar.tsx` / `DEFAULT_NAV_TABS`: เปลี่ยน label "Gmail" → "สำรองข้อมูล"

### 4) Empty states (ครั้งแรกที่ไม่มีข้อมูล)

- Dashboard: การ์ดต้อนรับเมื่อ `loans.length === 0` + ปุ่ม "เพิ่มสัญญาแรก" เปิด `LoanFormModal`
- TodoList: ใช้ empty state เดิม
- Widget: แสดง "ไม่มีรายการค้างชำระ"
- คง `LENDERS_CATALOG` เป็นตัวเลือกในฟอร์ม

### 5) ไฟล์ที่เพิ่ม/แก้ (สรุป)

เพิ่ม:
- `src/services/native/biometric.ts`, `tts.ts`, `print.ts`, `files.ts`
- `src/services/backHandler.ts`, `src/hooks/useAndroidBack.ts`
- `android/.../BiometricPlugin.java`, `TtsPlugin.java`, `PrintPlugin.java`, `SystemBarsPlugin.java`
- `res/raw/beep.wav`, `res/drawable/ic_stat_debtflow.xml`
- `public/fonts/*.woff2`
- `assets/` สำหรับ `@capacitor/assets`

แก้:
- `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `MainActivity.java`, `app/build.gradle`, `variables.gradle`, `styles.xml`
- `src/App.tsx`, `src/services/{security,thaiVoice,gmailBackup,storage,widgetBridge,notification}Service.ts`
- `src/components/{SecurityLockScreen,SettingsView,PdfReportModal,GmailBackupView,LoanManagerView,LoanFormModal,DashboardView,Navbar}.tsx`
- `src/types/loan.ts`, `src/data/lenders.ts`, `index.html`, `src/index.css`, `package.json`

### 6) Testing / Verification

- Vitest:
  - `loadAppState()` เริ่มต้นด้วยข้อมูลว่าง
  - `clearAllData()` ล้างครบ
  - `removeDemoData()` ลบเฉพาะ seed ที่รู้จัก
  - Biometric web fallback คืน false เมื่อไม่มี credential
  - Notification schedule ยังคำนวณถูก
  - Backup payload/serialization ยังถูก
- `npm test`
- `npm run build` (tsc + vite)
- `npx cap sync android`
- `android\gradlew.bat -p android assembleDebug bundleRelease`
- Manual checklist (ผู้ใช้ทดสอบบนเครื่องจริง เพราะไม่มี adb/emulator):
  - splash แล้วเข้าแอป, status bar สีถูกทั้ง light/dark
  - ปุ่ม back ปิด modal → กลับ dashboard → ออก
  - ตั้ง PIN + เปิด biometric → ล็อก → สแกนนิ้ว/ใบหน้าสำเร็จ (หรือกรอก PIN)
  - กดทดสอบเสียง → ได้ยินเสียงไทยจาก native TTS (ไม่ใช้เน็ต)
  - เปิด PDF → พิมพ์/บันทึก PDF ผ่านระบบ Android
  - สำรอง JSON/CSV → share sheet เปิดได้, restore จาก file picker ได้
  - แจ้งเตือนมีไอคอน/เสียงถูกต้อง
  - widget ติ๊กจ่ายแล้วกลับเข้าแอปข้อมูลตรงกัน
  - เปิดแอปครั้งแรก (ล้างข้อมูล) → ไม่มีหนี้ตัวอย่าง

### 7) Release build

- Generate keystore: `android/keystore/debtflow-release.jks` (alias `debtflow`) + `android/keystore.properties` (ทั้งคู่ไม่ commit)
- `app/build.gradle`: `signingConfigs.release` อ่านจาก `keystore.properties` ถ้ามี; `versionCode 2`, `versionName "1.1.0"`
- Copy artifacts ไป `build-android/DebtFlow-Enterprise-v1.1.0-debug.apk` และ `...-release.apk` / `.aab`
- หมายเหตุ: เก็บ keystore/password ให้ปลอดภัย; ถ้าอัป Store ต้องเปลี่ยน targetSdk เป็น 35 + upgrade AGP แยกภายหลัง

## ความเสี่ยง / ข้อจำกัด

- Android WebView ไม่รองรับ `env(safe-area-inset-*)` สม่ำเสมอ → ใช้ status bar แบบไม่ overlay
- Print output ขึ้นกับ WebView/OEM; ต้องทดสอบบนเครื่องจริง
- TTS ต้องมี Thai voice data ในเครื่อง; ถ้าไม่มีต้องแนะนำผู้ใช้ติดตั้ง
- Biometric ต้องมีลายนิ้วมือ/ใบหน้า enrolled; toggle จะเปิดได้เฉพาะเมื่อมี (ไม่มีก็ใช้ PIN)
- การลบ seed ไม่ลบข้อมูลเก่าบนเครื่องผู้ใช้โดยอัตโนมัติ (ต้องกดลบเอง)
- ไม่มีการเข้ารหัสข้อมูล; Biometric เป็น UI gate เท่านั้น

## Out of scope (ถ้าต้องการภายหลัง)

- Gmail API/OAuth จริง
- LINE Login จริง (ต้องมี Channel ID + backend)
- Cloud sync/บัญชีผู้ใช้
- เข้ารหัส localStorage/SQLite ด้วย Keystore
- Play Store submission (targetSdk 35)
