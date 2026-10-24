# Android Native Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ DebtFlow Enterprise เป็นแอป Android ที่ใช้งานจริงแบบออฟไลน์: native shell, biometric จริง, พิมพ์/แชร์/เสียงพูดผ่าน native, ไม่มี mock data และมี release build ที่ลงนามแล้ว

**Architecture:** คง React 18 + Capacitor 6 ไว้ แล้วเพิ่ม official Capacitor plugins สำหรับ shell/files/dialog และเขียน local Java plugins 4 ตัว (Biometric, Thai TTS, Print, SystemBars) ที่เรียก Android APIs โดยตรง ฝั่ง JS ทุกตัวมี web fallback เพื่อให้ `npm run dev` ยังทำงานได้

**Tech Stack:** React 18, TypeScript 5.4, Vite 5, Tailwind 3, Vitest 1.6, Capacitor 6.2, Android Gradle Plugin 8.2.1, compileSdk/targetSdk 34, JDK 21, AndroidX Biometric 1.1.0

**Spec:** `docs/superpowers/specs/2026-10-24-android-native-app-design.md`

## Global Constraints

- คง React + Capacitor; ห้ามเขียน UI ใหม่เป็น Kotlin/Compose
- Capacitor 6.2; Android `minSdkVersion 23`, `compileSdkVersion 34`, `targetSdkVersion 34`, AGP 8.2.1
- เพิ่ม dependency ได้เฉพาะ: official Capacitor 6 plugins, `androidx.biometric:biometric:1.1.0`, `@fontsource/sarabun`, `@fontsource/plus-jakarta-sans`, dev `@capacitor/assets`
- ห้ามมี seed/demo loans, payment records, fake LINE profile หรือ fake Gmail connection ใน runtime code
- ทุก native wrapper ต้องมี web fallback และห้าม throw ใน `npm run dev`
- ไม่มี git repo: ห้าม `git init`; ทุก task จบด้วย verification checkpoint แทน commit
- ต้องผ่าน: `npm test`, `npm run build`, `npx cap sync android`, `android\gradlew.bat -p android assembleDebug`
- เครื่องนี้ไม่มี adb/emulator: การทดสอบบนเครื่องจริงเป็น manual checklist ของผู้ใช้
- เวอร์ชันแอปเป้าหมาย: `versionCode 2`, `versionName "1.1.0"`

## Review Focus

1. เปิดแอปครั้งแรกหรือหลังลบข้อมูลทั้งหมด: Dashboard/TodoList/Widget ต้องแสดง empty state ที่ใช้งานได้ ไม่มี `NaN`/`Infinity` และไม่ค้างที่ splash
2. เครื่องที่ยังไม่ enrol ลายนิ้วมือ/ใบหน้า หรือไม่มีเสียงไทยในเครื่อง: การเปิด biometric ต้องแจ้งชัดและไม่ล็อกผู้ใช้ออก; TTS ต้องคืน `false` แล้ว UI ทำงานต่อได้
3. Android 10+ scoped storage: backup/CSV ต้องแชร์ผ่าน FileProvider ได้โดยไม่ต้องขอ `WRITE_EXTERNAL_STORAGE`; เอกสารพิมพ์ต้องมีเฉพาะรายงาน ไม่มี Navbar/พื้นหลังแอป
4. ปุ่ม Back ขณะเปิด modal / อยู่แท็บอื่น / อยู่ dashboard: ต้องปิด modal ก่อน, ไม่ออกแอปกลางทาง, กดซ้ำภายใน 2 วินาทีจึงออก
5. Restore จาก backup เก่าหรือไฟล์เสีย (มี `lineProfile`, `googleEmail`, ชนิดข้อมูลผิด): ต้องไม่ crash, ไม่ reintroduce fake integration, และ reject JSON ที่ไม่ถูกต้อง

---

### Task 1: Dependencies และ Android build config

**Files:**
- Modify: `package.json`
- Modify: `capacitor.config.ts`
- Modify: `android/variables.gradle`
- Modify: `android/app/build.gradle`

**Interfaces:**
- Produces: plugins `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/filesystem`, `@capacitor/dialog` พร้อมใช้ใน Task 3-9
- Produces: `androidx.biometric:biometric:1.1.0` พร้อมใช้ใน Task 6

- [ ] **Step 1: ติดตั้ง Capacitor plugins และฟอนต์**

Run:
```bash
npm install @capacitor/app@^6 @capacitor/status-bar@^6 @capacitor/splash-screen@^6 @capacitor/filesystem@^6 @capacitor/dialog@^6 @fontsource/sarabun@^5 @fontsource/plus-jakarta-sans@^5
npm install -D @capacitor/assets@^3
```

- [ ] **Step 2: อัปเดต `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.enterprise.debtflow',
  appName: 'DebtFlow Enterprise',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B0F19',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#FAF8F5',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_debtflow',
      iconColor: '#B45309',
      sound: 'beep.wav',
    },
  },
};

export default config;
```

- [ ] **Step 3: เปลี่ยน `minSdkVersion` เป็น 23 ใน `android/variables.gradle`**

```gradle
minSdkVersion = 23
```

- [ ] **Step 4: เพิ่ม biometric dependency ใน `android/app/build.gradle`**

ในบล็อก `dependencies` เพิ่ม:
```gradle
implementation "androidx.biometric:biometric:1.1.0"
```

- [ ] **Step 5: Verify**

Run:
```bash
npm run build
npx cap sync android
android\gradlew.bat -p android :app:processDebugResources
```
Expected: ทุกคำสั่ง exit 0

---

### Task 2: ข้อมูลเริ่มต้นว่าง + clear/remove demo data

**Files:**
- Modify: `src/data/lenders.ts`
- Modify: `src/services/storageService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsView.tsx`
- Modify: `src/components/GmailBackupView.tsx`
- Test: `src/services/storageService.test.ts` (create)

**Interfaces:**
- Produces: `export function clearAllData(): void`
- Produces: `export function removeDemoData(): number` — คืนจำนวน loan ที่ลบ
- Produces: `export const DEMO_LOAN_IDS: readonly string[]` = `['loan-spaylater-1', 'loan-kbank-split', 'loan-linebk-1', 'loan-tidlor-1']`
- Produces: `loadAppState()` คืน `loans: []`, `paymentRecords: []`, `availableFunds: 0` เมื่อยังไม่มีข้อมูล
- Removes: `resetToSeedData`, `getInitialSeedLoans`, `getInitialSeedPaymentRecords`

- [ ] **Step 1: เขียน failing test `src/services/storageService.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllData,
  loadAppState,
  removeDemoData,
  saveAvailableFunds,
  saveLoans,
  savePaymentRecords,
  snoozeTaskAlert,
} from './storageService';
import { calculateMonthlySummary } from '../utils/cashflowCalculator';
import { LoanAccount, MonthlyPaymentRecord } from '../types/loan';

function makeLoan(id: string, title: string): LoanAccount {
  return {
    id,
    lenderId: 'kbank',
    title,
    loanType: 'MULTI_DAY_SPLIT',
    totalPrincipal: 1000,
    remainingPrincipal: 1000,
    interestRateAnnual: 0,
    startDate: '2026-10-01',
    subItems: [{
      id: `${id}-sub`,
      loanId: id,
      title: 'งวดเดียว',
      dueDayOfMonth: 5,
      dueTime: '18:00',
      amount: 100,
      subType: 'SPLIT_DAY',
    }],
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function makeRecord(loanId: string): MonthlyPaymentRecord {
  return {
    id: `${loanId}_${loanId}-sub_2026-10`,
    loanId,
    subItemId: `${loanId}-sub`,
    yearMonth: '2026-10',
    dueDate: '2026-10-05',
    amountDue: 100,
    amountPaid: 100,
    status: 'PAID',
  };
}

beforeEach(() => {
  clearAllData();
});

describe('storageService defaults', () => {
  it('starts with empty loans, records, and funds', () => {
    const state = loadAppState();
    expect(state.loans).toEqual([]);
    expect(state.paymentRecords).toEqual([]);
    expect(state.availableFunds).toBe(0);
  });

  it('produces a safe zero summary without data', () => {
    const summary = calculateMonthlySummary([], 0, '2026-10');
    expect(summary.totalDue).toBe(0);
    expect(summary.totalRemaining).toBe(0);
    expect(summary.completionRate).toBe(100);
    expect(Number.isNaN(summary.shortfallAmount)).toBe(false);
  });
});

describe('clearAllData', () => {
  it('removes loans, records, funds, and snoozes', () => {
    saveLoans([makeLoan('loan-user-1', 'ของฉัน')]);
    savePaymentRecords([makeRecord('loan-user-1')]);
    saveAvailableFunds(5000);
    snoozeTaskAlert('task-1', 60, false);

    clearAllData();

    const state = loadAppState();
    expect(state.loans).toEqual([]);
    expect(state.paymentRecords).toEqual([]);
    expect(state.availableFunds).toBe(0);
    expect(state.availableFunds).not.toBeNaN();
  });
});

describe('removeDemoData', () => {
  it('removes only known demo loans and their records', () => {
    saveLoans([
      makeLoan('loan-kbank-split', 'Demo KBank'),
      makeLoan('loan-user-1', 'ของฉัน'),
    ]);
    savePaymentRecords([
      makeRecord('loan-kbank-split'),
      makeRecord('loan-user-1'),
    ]);

    expect(removeDemoData()).toBe(1);

    const state = loadAppState();
    expect(state.loans.map(l => l.id)).toEqual(['loan-user-1']);
    expect(state.paymentRecords.map(r => r.loanId)).toEqual(['loan-user-1']);
  });
});
```

- [ ] **Step 2: Run test ให้เห็น fail**

Run: `npx vitest run src/services/storageService.test.ts`
Expected: FAIL เพราะยังไม่มี `clearAllData` / `removeDemoData` และค่าเริ่มต้นยังเป็น seed

- [ ] **Step 3: ลบ seed functions ใน `src/data/lenders.ts`**

ลบ `getInitialSeedLoans` และ `getInitialSeedPaymentRecords` ทั้งฟังก์ชัน พร้อม import ที่ไม่ใช้แล้ว (`LoanAccount`, `MonthlyPaymentRecord` ถ้าไม่ถูกใช้ที่อื่น) คง `LENDERS_CATALOG` และ `DEFAULT_*` ไว้

- [ ] **Step 4: แก้ `src/services/storageService.ts`**

- ลบ import `getInitialSeedLoans`, `getInitialSeedPaymentRecords`, `LineUserProfile` (ถ้ายังอยู่)
- เพิ่มค่าคงที่:
```ts
export const DEMO_LOAN_IDS = [
  'loan-spaylater-1',
  'loan-kbank-split',
  'loan-linebk-1',
  'loan-tidlor-1',
] as const;

const EXTRA_CLEAR_KEYS = [
  'debtflow_widget_snapshot_v1',
  'debtflow_scheduled_notification_ids_v1',
];
```
- ใน `loadAppState()` เปลี่ยนค่าเริ่มต้นเป็น `loans = []`, `paymentRecords = []`, `availableFunds = 0` และใน catch block ใช้ค่าเดียวกัน
  - กัน NaN: `const parsedFunds = rawFunds !== null ? parseFloat(rawFunds) : 0; const availableFunds = Number.isFinite(parsedFunds) ? parsedFunds : 0;`
- เพิ่ม:
```ts
export function clearAllData(): void {
  for (const key of Object.values(STORAGE_KEYS)) safeStorage.removeItem(key);
  for (const key of EXTRA_CLEAR_KEYS) safeStorage.removeItem(key);
  broadcastStateChange();
}

export function removeDemoData(): number {
  const demoIds = new Set<string>(DEMO_LOAN_IDS);
  const loans: LoanAccount[] = JSON.parse(safeStorage.getItem(STORAGE_KEYS.LOANS) || '[]');
  const keptLoans = loans.filter(loan => !demoIds.has(loan.id));
  const removedCount = loans.length - keptLoans.length;

  const records: MonthlyPaymentRecord[] = JSON.parse(safeStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
  const keptRecords = records.filter(record => !demoIds.has(record.loanId));

  saveLoans(keptLoans, false);
  savePaymentRecords(keptRecords, false);
  broadcastStateChange();
  return removedCount;
}
```
- ลบ `resetToSeedData` ทั้งฟังก์ชัน

- [ ] **Step 5: อัปเดต `App.tsx` และ `SettingsView.tsx`**

- ใน `App.tsx` เปลี่ยน import `resetToSeedData` → `clearAllData`; ส่ง `onClearAllData={clearAllData}` ให้ `SettingsView`
- ใน `SettingsView.tsx` เปลี่ยน prop `onResetAllData` → `onClearAllData`; ปุ่มใน `RESET` เรียก `onClearAllData()`; เปลี่ยนข้อความเป็น "ลบข้อมูลทั้งหมดออกจากเครื่อง" (ลบข้อมูลสัญญา ประวัติชำระ และการตั้งค่า)
- เพิ่มปุ่ม "ลบข้อมูลตัวอย่างที่ฝังมากับแอป" เรียก `removeDemoData()` (import จาก `../services/storageService`); วางเหนือปุ่มลบทั้งหมด พร้อมคำอธิบายว่าลบเฉพาะสัญญาตัวอย่าง 4 รายการ (`DEMO_LOAN_IDS`) และประวัติชำระที่เกี่ยวข้อง
- ลบ `handleResetDemo` และการ์ด demo reset ใน `GmailBackupView.tsx` พร้อม import `resetToSeedData`

- [ ] **Step 6: Run test ให้ผ่าน**

Run: `npx vitest run src/services/storageService.test.ts`
Expected: PASS ทุกเคส

- [ ] **Step 7: Checkpoint**

Run: `npm run build`
Expected: exit 0

---

### Task 3: แทน fake LINE/Gmail ด้วย backup ไฟล์จริง

**Files:**
- Modify: `src/types/loan.ts`
- Modify: `src/services/storageService.ts`
- Modify: `src/services/lineAuthService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsView.tsx`
- Modify: `src/components/GmailBackupView.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/data/lenders.ts` (`DEFAULT_NAV_TABS` label)
- Modify: `src/services/gmailBackupService.ts`
- Create: `src/services/native/files.ts`
- Test: `src/services/gmailBackupService.test.ts` (create)
- Test: `src/services/notificationAndBackup.test.ts`

**Interfaces:**
- Produces: `export async function shareFile(options: { fileName: string; contents: string; mimeType: string; title: string }): Promise<boolean>` ใน `native/files.ts`
- Produces: `export function buildBackupFileName(now?: Date): string` → `debtflow_backup_YYYYMMDD_HHmm.json`
- Produces: `export async function shareBackupFile(): Promise<boolean>`
- Produces: `export async function shareCsvReport(tasks: MonthlyInstallmentTask[], summary: CashflowSummary): Promise<boolean>`
- Removes: `LineUserProfile`, `lineProfile` จาก `AppStateData`, `connectLineAccount`, `disconnectLineAccount`, `sendBackupViaGmail`, `downloadBackupFile`
- Changes: `GmailBackupMeta` เหลือ `{ lastBackupAt?: string; backupFileVersion: string; autoBackupOnPaid: boolean }`

- [ ] **Step 1: เขียน failing tests**

`src/services/gmailBackupService.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildBackupFileName, generateBackupPayload, restoreBackupFile } from './gmailBackupService';
import { loadAppState } from './storageService';

describe('backup payload', () => {
  it('builds a stable backup filename', () => {
    expect(buildBackupFileName(new Date(2026, 9, 24, 10, 30))).toBe('debtflow_backup_20261024_1030.json');
  });

  it('does not include fake LINE or Gmail account fields', () => {
    const state = loadAppState();
    expect('lineProfile' in state).toBe(false);
    expect('googleEmail' in state.backupMeta).toBe(false);
    expect('isConnected' in state.backupMeta).toBe(false);
  });

  it('restores an older payload while ignoring unknown fields', () => {
    const payload = generateBackupPayload() as any;
    payload.data.lineProfile = { isLinked: true };
    payload.data.backupMeta = { ...payload.data.backupMeta, googleEmail: 'old@example.com', isConnected: true };

    expect(restoreBackupFile(JSON.stringify(payload)).success).toBe(true);
    const restored = loadAppState();
    expect('lineProfile' in restored).toBe(false);
    expect(restored.backupMeta).not.toHaveProperty('googleEmail');
    expect(restored.backupMeta).not.toHaveProperty('isConnected');
  });
});
```

ใน `notificationAndBackup.test.ts` ลบ assertion ที่อ้าง `restored.lineProfile` และเพิ่ม:
```ts
expect('lineProfile' in restored).toBe(false);
expect(restored.backupMeta).not.toHaveProperty('googleEmail');
```

- [ ] **Step 2: Run tests ให้เห็น fail**

Run: `npx vitest run src/services/gmailBackupService.test.ts src/services/notificationAndBackup.test.ts`
Expected: FAIL เพราะยังไม่มี `buildBackupFileName` และยังมี `lineProfile` / `googleEmail`

- [ ] **Step 3: ตัด LINE ออกจาก types/storage/UI**

- `src/types/loan.ts`: ลบ `LineUserProfile`; ลบ `lineProfile` จาก `AppStateData`; แก้ `GmailBackupMeta` ตาม Interfaces
- `src/data/lenders.ts`: ลบ `DEFAULT_LINE_PROFILE` และ import `LineUserProfile`
- `src/services/storageService.ts`: ลบ `LINE_PROFILE` key, import/`saveLineProfile`, การอ่าน `rawLine`, และ `lineProfile` ใน return/catch; เปลี่ยน backup meta default ทั้งใน `loadAppState()` และ catch เป็น `{ backupFileVersion: '1.0.0', autoBackupOnPaid: true }`
- `src/services/lineAuthService.ts`: เหลือเฉพาะ `shareDebtFlowToLine(textSummary: string): void`
- `src/App.tsx`: ลบ import `saveLineProfile`, `LineUserProfile`, `lineProfile` destructure, props `lineProfile`/`onUpdateLineProfile`
- `src/components/SettingsView.tsx`:
  - ลบ `LineUserProfile` import และ props `lineProfile`/`onUpdateLineProfile`
  - ลบ `connectLineAccount`/`disconnectLineAccount` import และ `handleToggleLine`
  - section `LINE` เหลือเฉพาะปุ่ม "แชร์สรุปไปยัง LINE" ที่เรียก `handleShareLine` (แสดงตลอด ไม่ต้องผูกกับ profile)
- `src/components/Navbar.tsx`: label ของ `backup` เป็น `สำรองข้อมูล`
- `src/data/lenders.ts`: `DEFAULT_NAV_TABS` label `สำรองข้อมูล`

- [ ] **Step 4: เขียน `src/services/native/files.ts`**

```ts
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function shareFile(options: {
  fileName: string;
  contents: string;
  mimeType: string;
  title: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([options.contents], { type: options.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = options.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  }

  await Filesystem.writeFile({
    path: options.fileName,
    data: options.contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  const { uri } = await Filesystem.getUri({ path: options.fileName, directory: Directory.Cache });
  await Share.share({ title: options.title, url: uri, dialogTitle: options.title });
  return true;
}
```

- [ ] **Step 5: เขียน `gmailBackupService.ts` ใหม่**

- คง `ExportBackupPayload`, `generateBackupPayload`, `restoreBackupFile`
- ลบ `saveLineProfile`/`DEFAULT_LINE_PROFILE` และ `data.lineProfile` ใน restore
- ใน `restoreBackupFile` อย่า spread `data.backupMeta` (จะทำให้ฟิลด์เก่าเช่น `googleEmail` กลับมา) ให้เขียนเฉพาะ:
```ts
saveBackupMeta({
  lastBackupAt: new Date().toISOString(),
  backupFileVersion: data.backupMeta?.backupFileVersion || '1.0.0',
  autoBackupOnPaid: data.backupMeta?.autoBackupOnPaid ?? true,
}, true);
```
- ลบ `sendBackupViaGmail` และ `downloadBackupFile`- เพิ่ม:
```ts
export function buildBackupFileName(now = new Date()): string {
  return `debtflow_backup_${format(now, 'yyyyMMdd_HHmm')}.json`;
}

export async function shareBackupFile(): Promise<boolean> {
  const payload = generateBackupPayload();
  const ok = await shareFile({
    fileName: buildBackupFileName(),
    contents: JSON.stringify(payload, null, 2),
    mimeType: 'application/json',
    title: 'แชร์ไฟล์สำรอง DebtFlow',
  });
  if (ok) updateLastBackupTime();
  return ok;
}
```
- เปลี่ยน `exportCsvReport` เป็น `export async function shareCsvReport(tasks, summary): Promise<boolean>` โดยสร้าง `csvContent` เดิม แล้วเรียก `shareFile({ fileName: 'debtflow_report_${summary.yearMonth}.csv', contents: csvContent, mimeType: 'text/csv', title: 'แชร์รายงาน CSV' })`

- [ ] **Step 6: แก้ `GmailBackupView.tsx`**

- ลบ state `recipientEmail`, การ์ด Gmail ทั้งบล็อก, `handleSendGmail`
- Header เปลี่ยนเป็น "สำรองและกู้คืนข้อมูล" และไอคอน `Cloud`
- การ์ดแรกเปลี่ยนเป็นปุ่ม "แชร์ไฟล์สำรอง (.json)" เรียก `shareBackupFile()` แล้ว `onRefreshState()`
- ปุ่ม CSV เรียก `shareCsvReport(tasks, summary)` และเป็น `async`
- การ์ด "ดาวน์โหลด JSON" เปลี่ยนเป็น "แชร์ไฟล์สำรอง" (ใช้ `handleShareBackup`)
- ห่อการเรียก `shareBackupFile()` / `shareCsvReport()` ด้วย `try/catch` แล้ว `setStatusMessage({ type: 'error', text: 'แชร์ไฟล์ไม่สำเร็จ กรุณาลองใหม่' })`
- ลบ import ที่ไม่ใช้ (`Mail`, `Send`, `resetToSeedData`, `recipientEmail`)

- [ ] **Step 7: Run tests และ build**

Run:
```bash
npx vitest run src/services/gmailBackupService.test.ts src/services/notificationAndBackup.test.ts
npm run build
```
Expected: PASS และ exit 0

- [ ] **Step 8: Checkpoint**

Run: `npx cap sync android`
Expected: exit 0

---

### Task 4: Native shell — back button, status bar, splash, dialogs, WebView

**Files:**
- Create: `src/services/backHandler.ts`
- Create: `src/hooks/useAndroidBack.ts`
- Create: `src/services/native/shell.ts`
- Create: `src/services/native/dialog.ts`
- Create: `android/app/src/main/java/com/enterprise/debtflow/SystemBarsPlugin.java`
- Modify: `src/App.tsx`
- Modify: `src/components/LoanFormModal.tsx`
- Modify: `src/components/LoanManagerView.tsx`
- Modify: `src/components/DueAlertModal.tsx`
- Modify: `src/components/PdfReportModal.tsx`
- Modify: `src/components/AdaptiveDetailSheet.tsx`
- Modify: `src/components/TabManagerModal.tsx`
- Modify: `src/components/SettingsView.tsx`
- Modify: `android/app/src/main/java/com/enterprise/debtflow/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Test: `src/services/backHandler.test.ts` (create)

**Interfaces:**
- Produces: `export type BackHandler = () => boolean`
- Produces: `export function pushBackHandler(handler: BackHandler): () => void`
- Produces: `export function runBackHandlers(): boolean`
- Produces: `export function resetBackHandlers(): void`
- Produces: `export function useAndroidBack(handler: BackHandler, enabled?: boolean): void`
- Produces: `export async function applySystemBars(isDark: boolean): Promise<void>`
- Produces: `export async function hideSplash(): Promise<void>`
- Produces: `export function addAppStateListener(cb: (isActive: boolean) => void): () => void`
- Produces: `export function addBackButtonListener(cb: () => void): () => void`
- Produces: `export async function confirmAction(message: string, title?: string): Promise<boolean>`
- Produces: `export async function alertMessage(message: string, title?: string): Promise<void>`

- [ ] **Step 1: เขียน failing test `src/services/backHandler.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { pushBackHandler, resetBackHandlers, runBackHandlers } from './backHandler';

beforeEach(() => resetBackHandlers());

describe('backHandler stack', () => {
  it('runs the most recently pushed handler first', () => {
    const order: string[] = [];
    pushBackHandler(() => { order.push('first'); return true; });
    pushBackHandler(() => { order.push('second'); return true; });

    expect(runBackHandlers()).toBe(true);
    expect(order).toEqual(['second']);
  });

  it('falls through handlers that return false', () => {
    const order: string[] = [];
    pushBackHandler(() => { order.push('first'); return true; });
    pushBackHandler(() => { order.push('second'); return false; });

    expect(runBackHandlers()).toBe(true);
    expect(order).toEqual(['second', 'first']);
  });

  it('returns false when no handler handles the event', () => {
    pushBackHandler(() => false);
    expect(runBackHandlers()).toBe(false);
  });

  it('unregisters a handler when its disposer runs', () => {
    const dispose = pushBackHandler(() => true);
    dispose();
    expect(runBackHandlers()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test ให้เห็น fail**

Run: `npx vitest run src/services/backHandler.test.ts`
Expected: FAIL เพราะยังไม่มี module

- [ ] **Step 3: Implement `backHandler.ts` และ `useAndroidBack.ts`**

```ts
// backHandler.ts
export type BackHandler = () => boolean;
const handlers: BackHandler[] = [];

export function pushBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function runBackHandlers(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true;
  }
  return false;
}

export function resetBackHandlers(): void {
  handlers.length = 0;
}
```

```ts
// useAndroidBack.ts
import { useEffect } from 'react';
import { pushBackHandler, type BackHandler } from '../services/backHandler';

export function useAndroidBack(handler: BackHandler, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return pushBackHandler(handler);
  }, [handler, enabled]);
}
```
หมายเหตุ: ผู้เรียกต้องห่อ `handler` ด้วย `useCallback` เพื่อกัน re-register ทุก render

- [ ] **Step 4: Implement `shell.ts` และ `dialog.ts`**

`shell.ts`:
```ts
import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SystemBarsNativePlugin {
  setNavigationBar(options: { color: string; lightIcons: boolean }): Promise<void>;
}

const NativeSystemBars = registerPlugin<SystemBarsNativePlugin>('SystemBars');

export async function applySystemBars(isDark: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const backgroundColor = isDark ? '#121212' : '#FAF8F5';
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  await StatusBar.setBackgroundColor({ color: backgroundColor });
  try {
    await NativeSystemBars.setNavigationBar({ color: backgroundColor, lightIcons: !isDark });
  } catch {}
}

export async function hideSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await SplashScreen.hide();
}

export function addAppStateListener(cb: (isActive: boolean) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let disposed = false;
  let remove: (() => void) | undefined;

  void App.addListener('appStateChange', ({ isActive }) => cb(isActive)).then(handle => {
    if (disposed) void handle.remove();
    else remove = () => void handle.remove();
  });

  return () => {
    disposed = true;
    remove?.();
  };
}

export function addBackButtonListener(cb: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let disposed = false;
  let remove: (() => void) | undefined;

  void App.addListener('backButton', cb).then(handle => {
    if (disposed) void handle.remove();
    else remove = () => void handle.remove();
  });

  return () => {
    disposed = true;
    remove?.();
  };
}
```
`dialog.ts`:
```ts
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

export async function confirmAction(message: string, title = 'ยืนยัน'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return window.confirm(message);
  const { value } = await Dialog.confirm({
    title,
    message,
    okButtonTitle: 'ยืนยัน',
    cancelButtonTitle: 'ยกเลิก',
  });
  return value;
}

export async function alertMessage(message: string, title = 'แจ้งเตือน'): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.alert(message);
    return;
  }
  await Dialog.alert({ title, message, buttonTitle: 'ตกลง' });
}
```

- [ ] **Step 5: Integrate ใน `App.tsx`**

- import `{ App as CapacitorApp }` จาก `@capacitor/app` (หลีกเลี่ยงชนชื่อกับ component `App`) และ import `applySystemBars`, `hideSplash`, `addAppStateListener`, `addBackButtonListener`, `runBackHandlers`
- เพิ่ม `const lastBackRef = useRef(0);` ใกล้ state อื่น
- `useEffect(() => { void applySystemBars(isDark); }, [isDark]);`
- `useEffect(() => { const timer = setTimeout(() => { void hideSplash(); }, 3000); void hideSplash(); return () => clearTimeout(timer); }, []);`
- back button effect: ใช้ `currentTab` และ `lastBackRef`
```ts
useEffect(() => addBackButtonListener(() => {
  if (runBackHandlers()) return;
  if (currentTab !== 'dashboard') {
    setCurrentTab('dashboard');
    return;
  }
  const now = Date.now();
  if (now - lastBackRef.current < 2000) {
    void CapacitorApp.exitApp();
    return;
  }
  lastBackRef.current = now;
  addToast('INFO', 'กดอีกครั้งเพื่อออก', 'กดปุ่ม Back อีกครั้งภายใน 2 วินาทีเพื่อปิดแอป');
}), [currentTab]);
```
- app state effect: เมื่อ `isActive` ให้ `syncPendingWidgetToggles()` แล้ว `reloadState()`; เก็บ logic เดิมของ `visibilitychange` ไว้เป็น web fallback

- [ ] **Step 6: เพิ่ม back handler ให้ modal ทุกตัว**

ใน modal ที่มี `isOpen` หรือถูก render แบบมีเงื่อนไข ให้เพิ่ม **ก่อน early return ทุกตัว** (เพื่อไม่ให้ผิด rules of hooks):
```ts
const handleBack = useCallback(() => {
  onClose();
  return true;
}, [onClose]);
useAndroidBack(handleBack, isOpen);
```
ใช้กับ `LoanFormModal` (ไม่มี `isOpen` → ใช้ `true`), `DueAlertModal`, `PdfReportModal`, `AdaptiveDetailSheet`, `TabManagerModal`, และ `SecurityLockScreen` (handler คืน `true` เฉยๆ เพื่อไม่ให้ออกแอประหว่างล็อก)

- [ ] **Step 7: แทน browser dialogs**

- `LoanFormModal`: เปลี่ยน `alert(...)` 3 จุดเป็น `await alertMessage(...)` และทำ `handleSubmit` เป็น `async`
- `LoanManagerView`: เปลี่ยน `confirm(...)` เป็น `await confirmAction(...)` และ `onClick` เป็น `async`
- `SettingsView`: เปลี่ยน `window.confirm(...)` เป็น `await confirmAction(...)`
- `GmailBackupView` ไม่มี confirm แล้วจาก Task 2

- [ ] **Step 8: แก้ `MainActivity.java`, `SystemBarsPlugin.java`, และ manifest**

`SystemBarsPlugin.java`:
```java
package com.enterprise.debtflow;

import android.graphics.Color;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setNavigationBar(PluginCall call) {
        String color = call.getString("color", "#000000");
        boolean lightIcons = Boolean.TRUE.equals(call.getBoolean("lightIcons", false));
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().setNavigationBarColor(Color.parseColor(color));
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            controller.setAppearanceLightNavigationBars(lightIcons);
            call.resolve(new JSObject());
        });
    }
}
```

`MainActivity.java`:
```java
import android.view.View;
import android.webkit.WebView;

// ใน onCreate หลัง super.onCreate(savedInstanceState);
WebView webView = getBridge().getWebView();
webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
webView.getSettings().setSupportZoom(false);
webView.getSettings().setBuiltInZoomControls(false);
webView.getSettings().setDisplayZoomControls(false);
webView.setOnLongClickListener(v -> true);
```
และเพิ่ม `registerPlugin(SystemBarsPlugin.class);` ก่อน `super.onCreate`

Manifest:
- ที่ `<application>` เพิ่ม `android:enableOnBackInvokedCallback="false"`
- ที่ activity เพิ่ม `android:windowSoftInputMode="adjustResize"`

- [ ] **Step 9: Run test + build**

Run:
```bash
npx vitest run src/services/backHandler.test.ts
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug
```
Expected: PASS และ build สำเร็จ

---

### Task 5: ฟอนต์ในเครื่อง + ไอคอน/Splash แบรนด์จริง

**Files:**
- Modify: `src/main.tsx`
- Modify: `index.html`
- Modify: `src/index.css`
- Create: `assets/icon-only.png`
- Create: `assets/splash.png`
- Generated: `android/app/src/main/res/mipmap-*`, `android/app/src/main/res/drawable*`

**Interfaces:**
- Produces: ฟอนต์ Sarabun/Plus Jakarta Sans ถูก bundle ใน `dist` และโหลดได้แบบออฟไลน์

- [ ] **Step 1: เพิ่ม font imports ใน `src/main.tsx`**

```ts
import '@fontsource/sarabun/400.css';
import '@fontsource/sarabun/600.css';
import '@fontsource/sarabun/700.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
```

- [ ] **Step 2: ลบ Google Fonts จาก `index.html`**

ลบ `<link rel="preconnect" ...>` 2 บรรทัดและ `<link href="https://fonts.googleapis.com/...">` ออก คง `font-family` เดิมไว้

- [ ] **Step 3: เพิ่ม CSS กัน behavior แบบเว็บ**

ใน `src/index.css` หลัง `@tailwind`:
```css
html,
body {
  overscroll-behavior: none;
}

input,
textarea {
  -webkit-user-select: text;
  user-select: text;
}
```

- [ ] **Step 4: สร้าง source assets**

Run:
```bash
mkdir assets 2>nul
copy build-android\playstore-icon-512x512.png assets\icon-only.png
copy build-android\playstore-icon-512x512.png assets\splash.png
```

- [ ] **Step 5: Generate Android icons/splash**

Run:
```bash
npx capacitor-assets generate --android --iconBackgroundColor "#0B0F19" --splashBackgroundColor "#0B0F19"
```
Expected: มีการอัปเดต `android/app/src/main/res/mipmap-*` และ `drawable*/splash.png`

- [ ] **Step 6: Verify**

Run:
```bash
npm run build
npx cap sync android
android\gradlew.bat -p android :app:processDebugResources
```
Expected: exit 0 และ `dist/assets` มี `.woff2`

---

### Task 6: Biometric จริงผ่าน BiometricPrompt

**Files:**
- Create: `android/app/src/main/java/com/enterprise/debtflow/BiometricPlugin.java`
- Create: `src/services/native/biometric.ts`
- Modify: `android/app/src/main/java/com/enterprise/debtflow/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `src/services/securityService.ts`
- Modify: `src/components/SettingsView.tsx`
- Create: `src/services/securityService.native.test.ts`

**Interfaces:**
- Produces: `export interface BiometricAvailability { available: boolean; reason: 'SUCCESS' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'NONE_ENROLLED' | 'UNSUPPORTED' | 'ERROR' }`
- Produces: `export async function getBiometricAvailability(): Promise<BiometricAvailability>`
- Produces: `export async function authenticateWithBiometric(options?: { title?: string; subtitle?: string; cancelTitle?: string }): Promise<boolean>`
- Produces: `export async function getBiometricAvailability(): Promise<BiometricAvailability>` ใน `securityService.ts` (re-export/wrapper)
- Changes: `SecurityConfig.biometricCredentialId` ยังคง optional เพื่อรองรับ web dev

- [ ] **Step 1: เขียน failing test `src/services/securityService.native.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('./native/biometric', () => ({
  isNativeBiometricPlatform: () => true,
  authenticateWithBiometric: vi.fn(async () => true),
  getBiometricAvailability: vi.fn(async () => ({ available: true, reason: 'SUCCESS' })),
}));

import { authenticateBiometric } from './securityService';

describe('securityService native biometric', () => {
  it('uses the native biometric prompt on Android', async () => {
    expect(await authenticateBiometric()).toBe(true);
  });
});
```
คง `securityService.test.ts` เดิมไว้สำหรับ web fallback โดยไม่ต้อง mock

- [ ] **Step 2: Run test ให้เห็น fail**

Run: `npx vitest run src/services/securityService.native.test.ts`
Expected: FAIL เพราะ `securityService` ยังไม่เรียก native wrapper

- [ ] **Step 3: เขียน `BiometricPlugin.java`**

```java
@CapacitorPlugin(name = "Biometric")
public class BiometricPlugin extends Plugin {
    private boolean isAuthenticating = false;

    @PluginMethod
    public void isAvailable(PluginCall call) { /* BiometricManager.canAuthenticate(BIOMETRIC_STRONG) */ }

    @PluginMethod
    public void authenticate(PluginCall call) { /* BiometricPrompt + callback */ }
}
```
รายละเอียดที่ต้องทำ:
- `BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)`
- map ผลเป็น `SUCCESS`, `NO_HARDWARE`, `HW_UNAVAILABLE`, `NONE_ENROLLED`, `ERROR`
- `BiometricPrompt` ใช้ `new BiometricPrompt((FragmentActivity) getActivity(), ContextCompat.getMainExecutor(getContext()), callback)`
- `PromptInfo` ใช้ title/subtitle/cancelTitle จาก call หรือค่า default ภาษาไทย
- `onAuthenticationSucceeded` → `call.resolve(new JSObject().put("success", true))`
- `onAuthenticationError` → resolve `{ success: false }` (ไม่ reject เพื่อไม่ให้ log แดงเมื่อผู้ใช้กดยกเลิก)
- กันเรียกซ้ำด้วย `isAuthenticating`

- [ ] **Step 4: ลงทะเบียน plugin และ permission**

- เพิ่ม `<uses-permission android:name="android.permission.USE_BIOMETRIC" />` ใน `AndroidManifest.xml`
- ใน `MainActivity.onCreate` เพิ่ม `registerPlugin(BiometricPlugin.class);` ก่อน `super.onCreate` (ตาม pattern เดิมของ `WidgetBridgePlugin`)

- [ ] **Step 5: เขียน `src/services/native/biometric.ts`**

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricAvailability {
  available: boolean;
  reason: 'SUCCESS' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'NONE_ENROLLED' | 'UNSUPPORTED' | 'ERROR';
}

interface BiometricNativePlugin {
  isAvailable(): Promise<BiometricAvailability>;
  authenticate(options: { title?: string; subtitle?: string; cancelTitle?: string }): Promise<{ success: boolean }>;
}

const NativeBiometric = registerPlugin<BiometricNativePlugin>('Biometric');

export function isNativeBiometricPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'UNSUPPORTED' };
  }
  try {
    return await NativeBiometric.isAvailable();
  } catch {
    return { available: false, reason: 'ERROR' };
  }
}

export async function authenticateWithBiometric(options: {
  title?: string;
  subtitle?: string;
  cancelTitle?: string;
} = {}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await NativeBiometric.authenticate(options);
    return result.success;
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: แก้ `securityService.ts`**

เพิ่ม:
```ts
import { authenticateWithBiometric, getBiometricAvailability, isNativeBiometricPlatform } from './native/biometric';
export { getBiometricAvailability };

export async function authenticateBiometric(credentialId?: string): Promise<boolean> {
  if (isNativeBiometricPlatform()) {
    return authenticateWithBiometric({
      title: 'ปลดล็อก DebtFlow',
      subtitle: 'สแกนลายนิ้วมือหรือใบหน้าเพื่อเข้าใช้งาน',
      cancelTitle: 'ใช้รหัส PIN',
    });
  }
  // คง WebAuthn เดิมสำหรับ web dev
  ...
}
```

- [ ] **Step 7: แก้ `SettingsView.tsx`**

ใน `handleToggleBiometric(true)`:
```ts
if (isNativeBiometricPlatform()) {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    setBiometricError(
      availability.reason === 'NONE_ENROLLED'
        ? 'ยังไม่ได้ลงทะเบียนลายนิ้วมือ/ใบหน้าในเครื่อง กรุณาตั้งค่าที่ระบบ Android ก่อน'
        : 'อุปกรณ์นี้ไม่รองรับ Biometric ที่ปลอดภัย'
    );
    return;
  }
  onUpdateSecurityConfig({ ...securityConfig, biometricEnabled: true, biometricCredentialId: undefined });
  return;
}
// web dev: คง registerBiometricCredential เดิม
```
เพิ่ม import `getBiometricAvailability`, `isNativeBiometricPlatform` จาก `../services/native/biometric`; เปลี่ยนข้อความ busy เป็น "กำลังตรวจสอบ Biometric ของอุปกรณ์..."

- [ ] **Step 8: Verify**

Run:
```bash
npx vitest run src/services/securityService.test.ts src/services/securityService.native.test.ts
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug
```
Expected: PASS และ build สำเร็จ

---

### Task 7: Thai TTS ผ่าน Android TextToSpeech

**Files:**
- Create: `android/app/src/main/java/com/enterprise/debtflow/TtsPlugin.java`
- Create: `src/services/native/tts.ts`
- Modify: `android/app/src/main/java/com/enterprise/debtflow/MainActivity.java`
- Modify: `src/services/thaiVoiceService.ts`
- Modify: `src/components/SettingsView.tsx`
- Create: `src/services/thaiVoiceService.native.test.ts`

**Interfaces:**
- Produces: `export async function isNativeThaiTtsAvailable(): Promise<boolean>`
- Produces: `export async function speakNativeThai(text: string, options: { rate: number; pitch: number; volume: number; chime: ChimeStyle | 'SUCCESS' | 'NONE' }): Promise<boolean>`
- Produces: `export async function stopNativeThai(): Promise<void>`

- [ ] **Step 1: เขียน failing test `src/services/thaiVoiceService.native.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('./native/tts', () => ({
  speakNativeThai: vi.fn(async () => true),
  stopNativeThai: vi.fn(async () => {}),
}));

import { speakThaiText } from './thaiVoiceService';
import { speakNativeThai } from './native/tts';

describe('thaiVoiceService native TTS', () => {
  it('routes speech through native TTS on Android', async () => {
    const ok = await speakThaiText('สวัสดีค่ะ', { forceSpeak: true });
    expect(ok).toBe(true);
    expect(speakNativeThai).toHaveBeenCalledWith(
      'สวัสดีค่ะ',
      expect.objectContaining({ chime: 'ENTERPRISE' })
    );
  });

  it('returns false when native TTS is unavailable', async () => {
    vi.mocked(speakNativeThai).mockResolvedValueOnce(false);
    expect(await speakThaiText('ทดสอบ', { forceSpeak: true })).toBe(false);
  });
});
```
คง `thaiVoiceService.test.ts` เดิมไว้สำหรับ speech-building tests โดยไม่ต้อง mock

- [ ] **Step 2: Run test ให้เห็น fail**

Run: `npx vitest run src/services/thaiVoiceService.native.test.ts`
Expected: FAIL เพราะยังไม่เรียก native

- [ ] **Step 3: เขียน `TtsPlugin.java`**

```java
@CapacitorPlugin(name = "ThaiTts")
public class TtsPlugin extends Plugin {
    private TextToSpeech tts;
    private boolean ready = false;
    private PluginCall pendingSpeak;

    @Override public void load() { /* new TextToSpeech(getContext(), status -> ...) */ }
    @Override protected void handleOnDestroy() { /* tts.shutdown() */ }

    @PluginMethod public void isAvailable(PluginCall call) { /* ready + setLanguage(Locale("th","TH")) */ }
    @PluginMethod public void speak(PluginCall call) { /* chime + tts.speak + UtteranceProgressListener */ }
    @PluginMethod public void stop(PluginCall call) { /* tts.stop(); call.resolve() */ }
}
```
รายละเอียด:
- `onInit`: ถ้า `status == TextToSpeech.SUCCESS` ให้ `setLanguage(new Locale("th", "TH"))`; ถ้า `LANG_MISSING_DATA`/`LANG_NOT_SUPPORTED` ให้ `ready = false`
- `speak`: อ่าน `text`, `rate` (clamp 0.5-1.5), `pitch` (0.5-2.0), `volume` (0.1-1.0), `chime` (string)
- chime: `ToneGenerator(AudioManager.STREAM_MUSIC, (int)(volume*100))` แล้ว `startTone(...)` ตาม style; ใช้ `Handler().postDelayed` เพื่อ release
- ใช้ `tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)` และ `setOnUtteranceProgressListener` resolve `{ spoken: true }` ที่ `onDone`, `{ spoken: false }` ที่ `onError`
- ถ้า `!ready` ให้ resolve `{ spoken: false }` หรือ reject ด้วยข้อความ `TTS_NOT_AVAILABLE`
- ต้อง resolve call เพียงครั้งเดียว; เก็บ `pendingSpeak` ไว้ถ้าถูกเรียกก่อน init เสร็จ

- [ ] **Step 4: ลงทะเบียน `TtsPlugin` ใน `MainActivity`**

เพิ่ม `registerPlugin(TtsPlugin.class);`

- [ ] **Step 5: เขียน `src/services/native/tts.ts`**

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { ChimeStyle } from '../../types/loan';

interface ThaiTtsNativePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  speak(options: {
    text: string;
    rate: number;
    pitch: number;
    volume: number;
    chime: ChimeStyle | 'SUCCESS' | 'NONE';
  }): Promise<{ spoken: boolean }>;
  stop(): Promise<void>;
}

const NativeTts = registerPlugin<ThaiTtsNativePlugin>('ThaiTts');

export async function isNativeThaiTtsAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await NativeTts.isAvailable()).available;
  } catch {
    return false;
  }
}

export async function speakNativeThai(
  text: string,
  options: { rate: number; pitch: number; volume: number; chime: ChimeStyle | 'SUCCESS' | 'NONE' }
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await NativeTts.speak({ text, ...options })).spoken;
  } catch {
    return false;
  }
}

export async function stopNativeThai(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeTts.stop();
  } catch {}
}
```

- [ ] **Step 6: แก้ `thaiVoiceService.ts`**

- import `speakNativeThai`, `stopNativeThai`, `isNativeThaiTtsAvailable` และ `Capacitor`
- ใน `stopThaiSpeech()` เพิ่ม `void stopNativeThai();`
- ใน `speakThaiText()` หลังคำนวณ config/chime และก่อน web fallback:
```ts
if (Capacitor.isNativePlatform()) {
  return speakNativeThai(text, {
    rate: Math.min(1.5, Math.max(0.6, options?.rate ?? config.speechRate)),
    pitch: Math.min(2.0, Math.max(0.5, options?.pitch ?? 1.0)),
    volume: Math.min(1.0, Math.max(0.1, config.volume)),
    chime: chimeToPlay,
  });
}
```
- ลบ `playNotificationChime` call สำหรับ native path (native plugin เล่น chime เอง) แต่คงไว้สำหรับ web
- `announceTaskReminder` / `announcePaymentToggle` / `announceMonthlySummary` ไม่ต้องเปลี่ยน signature

- [ ] **Step 7: เพิ่มข้อความใน Settings**

เพิ่ม `import { Capacitor } from '@capacitor/core';` และใน section VOICE เพิ่มข้อความใต้ Master Switch:
```tsx
{Capacitor.isNativePlatform() && !nativeTtsAvailable && (
  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
    เครื่องนี้ยังไม่มีเสียงภาษาไทยสำหรับ TTS กรุณาติดตั้งเสียงภาษาไทยใน Settings → Text-to-speech
  </p>
)}
```
เก็บสถานะด้วย `useEffect` + `isNativeThaiTtsAvailable()` (import จาก `services/native/tts`)

- [ ] **Step 8: Verify**

Run:
```bash
npx vitest run src/services/thaiVoiceService.test.ts src/services/thaiVoiceService.native.test.ts
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug
```
Expected: PASS และ build สำเร็จ

---

### Task 8: Print ผ่าน Android PrintManager + portal

**Files:**
- Create: `android/app/src/main/java/com/enterprise/debtflow/PrintPlugin.java`
- Create: `src/services/native/print.ts`
- Modify: `android/app/src/main/java/com/enterprise/debtflow/MainActivity.java`
- Modify: `src/components/PdfReportModal.tsx`

**Interfaces:**
- Produces: `export async function printCurrentPage(jobName: string): Promise<boolean>`

- [ ] **Step 1: เขียน `PrintPlugin.java`**

```java
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        String jobName = call.getString("jobName", "DebtFlow Report");
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter adapter = getBridge().getWebView().createPrintDocumentAdapter(jobName);
            manager.print(jobName, adapter, new PrintAttributes.Builder().build());
            call.resolve(new JSObject().put("started", true));
        });
    }
}
```

- [ ] **Step 2: ลงทะเบียน `PrintPlugin` ใน `MainActivity`**

เพิ่ม `registerPlugin(PrintPlugin.class);`

- [ ] **Step 3: เขียน `src/services/native/print.ts`**

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';

interface PrintNativePlugin {
  print(options: { jobName: string }): Promise<{ started: boolean }>;
}

const NativePrint = registerPlugin<PrintNativePlugin>('Print');

export async function printCurrentPage(jobName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    window.print();
    return true;
  }
  try {
    return (await NativePrint.print({ jobName })).started;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: แก้ `PdfReportModal.tsx`**

- import `createPortal` จาก `react-dom` และ `printCurrentPage`
- เปลี่ยน `handlePrint` เป็น `async () => { await printCurrentPage('DebtFlow Report'); }`
- เปลี่ยน `return (` ของ component เป็น:
```tsx
return createPortal(
  <div className="pdf-print-root fixed inset-0 z-50 ...">
    ...
  </div>,
  document.body
);
```
- ใน `<style>` ที่มีอยู่ เพิ่ม:
```css
@media print {
  body > *:not(.pdf-print-root) {
    display: none !important;
  }
  html, body {
    background: #ffffff !important;
  }
}
```
- ตรวจว่า closing tag ของ portal ตรงกับ `, document.body);`

- [ ] **Step 5: Verify**

Run:
```bash
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug
```
Expected: exit 0

---

### Task 9: ซ่อมไอคอน/เสียงแจ้งเตือน + exact alarm + app state sync

**Files:**
- Create: `android/app/src/main/res/raw/beep.wav`
- Create: `android/app/src/main/res/drawable/ic_stat_debtflow.xml`
- Modify: `src/services/notificationService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/NotificationCenterView.tsx`
- Test: `src/services/notificationAndBackup.test.ts`

**Interfaces:**
- Produces: `export async function ensureExactAlarmPermission(): Promise<boolean>` ใน `notificationService.ts`

- [ ] **Step 1: สร้าง `beep.wav`**

Run (Node script):
```bash
node -e "const fs=require('fs');const sr=22050,d=0.25,f=880,n=Math.floor(sr*d);const b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const e=Math.min(1,i/500)*Math.max(0,1-i/n);b.writeInt16LE(Math.round(Math.sin(2*Math.PI*f*i/sr)*0.4*32767*e),44+i*2);}fs.mkdirSync('android/app/src/main/res/raw',{recursive:true});fs.writeFileSync('android/app/src/main/res/raw/beep.wav',b);"
```
Expected: มีไฟล์ `beep.wav` ขนาด > 10KB

- [ ] **Step 2: สร้าง `ic_stat_debtflow.xml`**

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32L13.5,4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z" />
</vector>
```

- [ ] **Step 3: เพิ่ม exact-alarm helpers**

เพิ่ม `import { Capacitor } from '@capacitor/core';` ที่หัวไฟล์ แล้วเพิ่ม:
```ts
export async function hasExactAlarmPermission(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return true;
  try {
    const status = await LocalNotifications.checkExactNotificationSetting();
    return status.exact_alarm === 'granted';
  } catch {
    return false;
  }
}

export async function ensureExactAlarmPermission(): Promise<boolean> {
  if (await hasExactAlarmPermission()) return true;
  try {
    await LocalNotifications.changeExactNotificationSetting();
    return await hasExactAlarmPermission();
  } catch {
    return false;
  }
}
```
เรียก `ensureExactAlarmPermission()` **เฉพาะจาก user gesture** ใน `NotificationCenterView.handleTestNotification()` หลัง `requestNotificationPermission()`
ใน `syncScheduledNotifications()` ใช้ `hasExactAlarmPermission()` แบบ read-only; ถ้าไม่ granted ให้ return `{ scheduled: 0, cancelled: 0 }` (ห้ามเปิด Settings เองตอน app launch)

- [ ] **Step 4: เพิ่ม app state sync ใน `App.tsx`**

ใช้ `addAppStateListener` จาก Task 4:
```ts
useEffect(() => addAppStateListener(isActive => {
  if (!isActive) return;
  void syncScheduledNotifications(tasks, notificationRules);
  void syncPendingWidgetToggles().then(applied => {
    if (applied > 0) reloadState();
  });
}), [tasks, notificationRules]);
```
คง `visibilitychange` เดิมไว้สำหรับ web

- [ ] **Step 5: เพิ่ม test การกรอง schedule**

ใน `notificationAndBackup.test.ts` เพิ่ม:
```ts
it('caps the notification schedule and keeps only future triggers', () => {
  const now = new Date('2026-10-23T10:00:00.000Z');
  const tasks = Array.from({ length: 100 }, (_, i) => ({ ...futureTask, id: `task-${i}` }));
  const schedule = computeNotificationSchedule(tasks, rules, now);
  expect(schedule.length).toBeLessThanOrEqual(64);
  expect(schedule.every(item => item.scheduleAt.getTime() > now.getTime())).toBe(true);
});
```
เพิ่ม import `computeNotificationSchedule`

- [ ] **Step 6: Verify**

Run:
```bash
npx vitest run src/services/notificationAndBackup.test.ts
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug
```
Expected: PASS และ build สำเร็จ

---

### Task 10: Empty state ครั้งแรก (ไม่มีข้อมูล)

**Files:**
- Modify: `src/components/DashboardView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/TodoListView.tsx` (ข้อความ empty state)

**Interfaces:**
- Produces: `DashboardViewProps.onAddFirstLoan: () => void`
- Consumes: `Loans` ว่างจาก Task 2

- [ ] **Step 1: เพิ่ม prop `onAddFirstLoan`**

ใน `DashboardViewProps` และ destructure:
```ts
onAddFirstLoan: () => void;
```

- [ ] **Step 2: เพิ่ม welcome card และซ่อน section สรุปเมื่อไม่มีข้อมูล**

ก่อน section "Available Funds" เพิ่ม:
```tsx
{loans.length === 0 && (
  <div className="bg-white/95 dark:bg-stone-900/90 border border-amber-300/80 dark:border-stone-800 p-6 rounded-3xl shadow-sm text-center space-y-3">
    <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
      <PlusCircle size={24} />
    </div>
    <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">เริ่มต้นวางแผนการเงินของคุณ</h2>
    <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
      ยังไม่มีสัญญาเงินกู้ในระบบ เพิ่มสัญญาแรกเพื่อให้ระบบคำนวณยอดชำระ สภาพคล่อง และสร้างวิดเจ็ตให้อัตโนมัติ
    </p>
    <button
      onClick={onAddFirstLoan}
      className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
    >
      + เพิ่มสัญญาแรก
    </button>
  </div>
)}
```
เมื่อ `loans.length === 0` ให้ห่อ section 3-6 (Available Funds, Sufficiency, Metric Cards, Projection, Category) ด้วย `{loans.length > 0 && (<> ... </>)}` และซ่อนปุ่ม "รายงาน PDF" ใน header เพื่อไม่ให้ผู้ใช้พิมพ์รายงานว่าง

- [ ] **Step 3: ส่ง prop จาก `App.tsx`**

```tsx
onAddFirstLoan={() => setEditingLoan(null)}
```

- [ ] **Step 4: ปรับข้อความ TodoList empty state**

เปลี่ยนข้อความเป็น:
```
ยังไม่มีรายการต้องชำระในเดือนนี้
เพิ่มสัญญาเงินกู้หรือเลือกเดือนอื่นเพื่อดูรายการ
```

- [ ] **Step 5: Verify**

Run:
```bash
npm run build
```
Expected: exit 0

---

### Task 11: Release signing + APK/AAB

**Files:**
- Modify: `android/app/build.gradle`
- Modify: `android/.gitignore`
- Create (local only): `android/keystore.properties`
- Create (local only): `android/keystore/debtflow-release.jks`
- Output: `build-android/DebtFlow-Enterprise-v1.1.0-debug.apk`
- Output: `build-android/DebtFlow-Enterprise-v1.1.0-release.apk`
- Output: `build-android/DebtFlow-Enterprise-v1.1.0-release.aab`

**Interfaces:**
- Produces: signed release build ที่ติดตั้งได้

- [ ] **Step 1: Generate keystore และ properties**

Run (PowerShell):
```powershell
$pass = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
New-Item -ItemType Directory -Force android\keystore | Out-Null
keytool -genkeypair -v -keystore android\keystore\debtflow-release.jks -alias debtflow -keyalg RSA -keysize 2048 -validity 10000 -storepass $pass -keypass $pass -dname "CN=DebtFlow Enterprise, OU=Mobile, O=DebtFlow, L=Bangkok, ST=Bangkok, C=TH"
@"
storeFile=keystore/debtflow-release.jks
storePassword=$pass
keyAlias=debtflow
keyPassword=$pass
"@ | Set-Content -Encoding ASCII android\keystore.properties
Write-Output "Keystore password saved in android/keystore.properties"
```

- [ ] **Step 2: เพิ่ม `.gitignore`**

ใน `android/.gitignore` เพิ่ม:
```
keystore.properties
keystore/
```

- [ ] **Step 3: แก้ `android/app/build.gradle`**

At top:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```
In `android { ... }`:
```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile rootProject.file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        if (keystorePropertiesFile.exists()) {
            signingConfig signingConfigs.release
        }
    }
}
```
In `defaultConfig`: `versionCode 2`, `versionName "1.1.0"`

- [ ] **Step 4: Build**

Run:
```bash
npm run build
npx cap sync android
android\gradlew.bat -p android clean assembleDebug assembleRelease bundleRelease
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: คัดลอก artifacts**

Run (PowerShell):
```powershell
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk build-android\DebtFlow-Enterprise-v1.1.0-debug.apk -Force
Copy-Item android\app\build\outputs\apk\release\app-release.apk build-android\DebtFlow-Enterprise-v1.1.0-release.apk -Force
Copy-Item android\app\build\outputs\bundle\release\app-release.aab build-android\DebtFlow-Enterprise-v1.1.0-release.aab -Force
```

- [ ] **Step 6: Verify signature**

Run:
```powershell
& "C:\Android\build-tools\34.0.0\apksigner.bat" verify --print-certs build-android\DebtFlow-Enterprise-v1.1.0-release.apk
```
Expected: `Verified using v1/v2 scheme` และมี certificate DN ของ DebtFlow

- [ ] **Step 7: Final verification**

Run:
```bash
npm test
npm run build
```
Expected: PASS ทั้งหมด

---

## Manual Device Checklist (ผู้ใช้ทำบนเครื่องจริง)

- [ ] ติดตั้ง `build-android/DebtFlow-Enterprise-v1.1.0-release.apk` ได้
- [ ] เปิดแอป: splash หาย, status bar สีตรงธีม light/dark
- [ ] กด Back: ปิด modal ก่อน → กลับ dashboard → กดซ้ำ 2 วิเพื่อออก
- [ ] ตั้ง PIN → เปิด Biometric → ล็อก → สแกนนิ้ว/ใบหน้าปลดล็อกได้; ยกเลิกแล้วใช้ PIN ได้
- [ ] กด "ทดสอบเสียงน้องกนก" ได้ยินเสียงไทยแบบออฟไลน์; เครื่องไม่มีเสียงไทยขึ้นข้อความแนะนำ
- [ ] เปิดรายงาน PDF → พิมพ์/บันทึก PDF: เอกสารมีเฉพาะรายงาน ไม่มี Navbar
- [ ] แชร์ไฟล์สำรอง JSON/CSV → share sheet เปิด; restore จาก file picker ได้
- [ ] แจ้งเตือนมีไอคอนขาวและเสียง beep; exact alarm เปิดได้
- [ ] Widget ติ๊กจ่าย → กลับเข้าแอป → สถานะ/เงินสดตรงกัน
- [ ] ล้างข้อมูลทั้งหมด → เปิดแอปใหม่ไม่มีหนี้ตัวอย่าง; Dashboard แสดงปุ่ม "เพิ่มสัญญาแรก"
