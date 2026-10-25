# AGENTS.md — คล่องตัว (KlongTua) Smart Debt & Cashflow Manager

## 1. Project Overview
- **App Name**: คล่องตัว (KlongTua)
- **Package / App ID**: `com.enterprise.debtflow`
- **Repository**: `https://github.com/okenzo-devbyte/KlongTua.git`
- **Purpose**: ระบบบริหารจัดการหนี้สิน สินเชื่อ และสภาพคล่องทางการเงินรายเดือนแบบ Offline-first สำหรับผู้ใช้งานในประเทศไทย รองรับทั้ง Web App และ Native Android (พร้อม Home Screen AppWidget, ระบบเสียงผู้ช่วยภาษาไทย "น้องต้นหอม", PIN/Biometric Security, และระบบนำเข้า/ส่งออก Excel/PDF/CSV/JSON)

---

## 2. Tech Stack & Commands

### Core Stack
- **Frontend**: React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3
- **Typography**: `@fontsource/sarabun` (Thai UI) & `@fontsource/plus-jakarta-sans` (Tabular numerals)
- **Mobile Runtime**: Capacitor 6 (`@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/splash-screen`)
- **Spreadsheets & Data**: SheetJS (`xlsx`), `date-fns`
- **Testing**: Vitest (`npm test -- --run`)

### Development, Verification & Build Commands
```powershell
# 1. Run Unit & Integration Tests (65 tests across 13 suites)
npm test -- --run

# 2. Typecheck & Build Production Web Bundle
npm run build

# 3. Sync Web Assets to Native Android Project
npx cap sync android

# 4. Compile Android Debug APK & Production Release AAB
cd android && .\gradlew.bat assembleDebug bundleRelease
```

### Output Artifacts (`build-android/`)
- `build-android/klongtua-debug.apk` — Debug APK สำหรับติดตั้งทดสอบบนเครื่องจริง
- `build-android/klongtua-release.aab` — Signed Release Android App Bundle สำหรับ Google Play Console
- `build-android/playstore-icon-512x512.png` — ไอคอนแอปความละเอียด 512x512

---

## 3. System Architecture & Key Directories

```text
todo-loan/
├── src/
│   ├── App.tsx                         # Main application controller, state sync, widget & notification lifecycle
│   ├── types/
│   │   └── loan.ts                     # Core domain types (LoanAccount, MonthlyInstallmentTask, PortfolioDebtSummary, etc.)
│   ├── data/
│   │   └── lenders.ts                  # Thai banks, non-banks, cooperatives, informal lenders & default configs
│   ├── utils/
│   │   └── cashflowCalculator.ts       # Cashflow engine, portfolio debt summary, 6-month rolling projection, Thai Buddhist Era dates
│   ├── services/
│   │   ├── storageService.ts           # LocalStorage persistence, state change pub/sub, demo data, loan & record cleanup
│   │   ├── widgetBridgeService.ts      # Bi-directional sync between web storage and Android Native Widget SharedPreferences
│   │   ├── excelService.ts             # Excel (.xlsx) template generator, fuzzy Thai/English importer, 3-sheet workbook exporter
│   │   ├── gmailBackupService.ts       # JSON full backup/restore and CSV report exporter
│   │   ├── notificationService.ts      # Native LocalNotifications scheduler with sound toggle support
│   │   ├── thaiVoiceService.ts         # Web Speech API + Native Android TTS + Web Audio chime synthesizer ("น้องต้นหอม")
│   │   ├── securityService.ts          # SHA-256 PIN lock, auto-lock timer, and Native Biometric authentication
│   │   └── native/                     # Capacitor native wrappers (biometric, dialog, files, print, shell, tts)
│   └── components/
│       ├── DashboardView.tsx           # Minimalist KPI bento grid, Portfolio Debt card, interactive drill-down sheets
│       ├── TodoListView.tsx            # Monthly installment checklist with inline sub-item amount editing
│       ├── LoanManagerView.tsx         # Loan contract manager with Active/Closed filters, status toggles, and Excel actions
│       ├── LoanFormModal.tsx           # Contract creation/edit modal with custom principal/remaining balance & split sub-items
│       ├── ExcelDataModal.tsx          # 3-tab modal for Excel Import (Merge/Replace), Template download, and Full Export
│       ├── WidgetStudioView.tsx        # Interactive Android Home Widget preview & configuration (2x2, 4x2, 4x4, Light/Dark/Glass)
│       ├── HomeWidgetCard.tsx          # In-app widget renderer matching native widget capabilities
│       ├── PdfReportModal.tsx          # A4 Executive PDF report preview & native print integration
│       ├── NotificationCenterView.tsx  # Notification rules, sound toggle, and mascot voice settings
│       ├── GmailBackupView.tsx         # Backup/restore JSON, CSV export, and sample data management
│       ├── SettingsView.tsx            # Theme, navigation tabs, security PIN/Biometric, voice, and data reset
│       ├── AdaptiveDetailSheet.tsx     # Responsive bottom-sheet (mobile) / centered modal (desktop) for KPI drilldowns
│       └── ThaiMascot.tsx              # Interactive SVG mascot ("น้องต้นหอม") with speech bubble & voice greetings
└── android/
    └── app/src/main/
        ├── java/com/enterprise/debtflow/
        │   ├── MainActivity.java                   # Capacitor BridgeActivity registering custom native plugins
        │   ├── WidgetBridgePlugin.java             # Capacitor plugin syncing snapshots & pending widget toggles
        │   ├── BiometricPlugin.java                # Native AndroidX BiometricPrompt plugin
        │   ├── TtsPlugin.java                      # Native Android TextToSpeech (`th-TH`) plugin
        │   ├── PrintPlugin.java                    # Native Android PrintManager A4 document adapter
        │   ├── SystemBarsPlugin.java               # Edge-to-edge status/navigation bar styling
        │   └── widget/
        │       └── DebtFlowWidgetProvider.java     # Native AppWidgetProvider with 1-tap payment toggle & Thai fallbacks
        └── res/
            ├── layout/widget_debtflow.xml          # RemoteViews-compliant widget layout (no raw <View> tags)
            ├── drawable/widget_background_clean.xml
            ├── drawable/widget_task_row_bg.xml     # RemoteViews-compliant <selector> row background
            └── xml/widget_debtflow_info.xml        # AppWidget metadata with dynamic resize support
```

---

## 4. Critical Engineering Guardrails & Conventions

### 4.1 Android Home Screen AppWidget (`DebtFlowWidgetProvider` & `widget_debtflow.xml`)
1. **`RemoteViews` Strict Tag Whitelist**:
   - **NEVER** use raw `<View .../>` tags in `res/layout/widget_debtflow.xml` (e.g., for dividers). Raw `android.view.View` is not annotated with `@RemoteView` and throws `android.view.InflateException: Class not allowed to be inflated android.view.View`, causing the widget to fail or appear blank on Android launchers. Always use `<ImageView .../>` or `<FrameLayout .../>` for dividers/spacers.
   - **NEVER** use `<ripple>` drawables in widget row backgrounds if targeting broad cross-process launcher compatibility; use `<selector>` with `<shape>` items (`widget_task_row_bg.xml`).
2. **Bi-Directional Synchronization & Cold-Start Safety**:
   - `widgetBridgeService.ts` subscribes to `storageService.addStateChangeListener` so any loan, payment record, or available funds update immediately builds a fresh `WidgetSnapshot` for the **real current calendar month** (`format(new Date(), 'yyyy-MM')`) and pushes it to `WidgetBridgePlugin.updateSnapshot`.
   - On app startup (`App.tsx`), `syncPendingWidgetToggles()` MUST complete (`isWidgetSyncReady = true`) before pushing a new snapshot so toggles performed on the home screen while the app was closed are never overwritten.
   - Each task row in `DebtFlowWidgetProvider.java` uses a unique `requestCode` derived from `taskId.hashCode()` for its `PendingIntent` so dynamic task reordering never causes intent collisions.
3. **Distinct Empty vs. Paid States**:
   - When `totalLoanCount == 0` (or no snapshot exists yet), the widget renders a clear Thai onboarding prompt (`"ยังไม่มีสัญญา"` / `"แตะที่นี่เพื่อเปิดแอปและเริ่มบันทึกข้อมูล"`).
   - When loans exist and all current month installments are paid (`remainingDue <= 0`), the widget renders `"✓ ชำระครบแล้ว"` / `"ยอดเยี่ยม! ชำระครบทุกงวดในเดือนนี้แล้ว 🎉"`.

### 4.2 Calendar Month Browsing vs. Real Current Month
- Users can browse past or future months (`selectedYearMonth`) on the Dashboard and To-Do List.
- **Urgent Due Alerts (`DueAlertModal`)**, **Scheduled Local Notifications**, and the **Native Android Home Widget** must always be driven by `currentRealMonth` (`format(new Date(), 'yyyy-MM')`) and local date `format(new Date(), 'yyyy-MM-dd')` (never UTC `toISOString().slice(0, 10)`), preventing false overdue alerts when browsing historical months.

### 4.3 Portfolio Debt & Principal Tracking
- Every `LoanAccount` tracks both `totalPrincipal` (ยอดหนี้/วงเงินกู้ตั้งต้น) and `remainingPrincipal` (ยอดหนี้คงเหลือปัจจุบัน).
- When a user marks an installment as `PAID` (either in-app or via the Android widget), `remainingPrincipal` and `availableFunds` are automatically deducted; unmarking (`PENDING` / `OVERDUE`) refunds the amount back up to `totalPrincipal`.
- Deleting a loan must always call `deleteLoanAndRecords(loanId)` to remove orphaned `MonthlyPaymentRecord` entries.

### 4.4 Branding & Localization
- Official Thai app name: **คล่องตัว** (English subtitle: **KlongTua**).
- Do not reintroduce legacy `"DebtFlow"` or `"ThaiPencil Edition"` strings in user-facing UI, notifications, PDF headers, or voice announcements. (Note: internal storage keys like `debtflow_loans_v1` and backup filename prefix `debtflow_backup_` are retained for backward compatibility with existing user data and test suites.)
- Dates displayed to users must use Thai Buddhist Era (`พ.ศ. = ค.ศ. + 543`).
