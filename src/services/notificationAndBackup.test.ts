import { describe, it, expect } from 'vitest';
import { computeNotificationTriggerTimes, buildNotificationSchedule, computeNotificationSchedule } from './notificationService';
import { generateBackupPayload, restoreBackupFile } from './gmailBackupService';
import { snoozeTaskAlert, isTaskSnoozed, clearTaskSnooze, getSnoozeMap, loadAppState } from './storageService';
import { MonthlyInstallmentTask, NotificationRule } from '../types/loan';

describe('Notification Scheduling Engine', () => {
  const rules: NotificationRule[] = [
    {
      id: 'rule-hours',
      enabled: true,
      unit: 'HOURS',
      amount: 3,
      timeOfDay: '15:00',
      labelTh: '3 ชั่วโมงก่อนครบกำหนด',
    },
    {
      id: 'rule-days',
      enabled: true,
      unit: 'DAYS',
      amount: 1,
      timeOfDay: '18:00',
      labelTh: '1 วันก่อนครบกำหนด',
    },
    {
      id: 'rule-disabled',
      enabled: false,
      unit: 'DAYS',
      amount: 5,
      timeOfDay: '09:00',
      labelTh: 'ปิดใช้งาน',
    },
  ];

  const futureTask: MonthlyInstallmentTask = {
    id: 'future-task-1',
    loanId: 'l1',
    subItemId: 's1',
    lender: {
      id: 'kbank',
      code: 'KBANK',
      nameTh: 'ธนาคารกสิกรไทย',
      nameEn: 'Kasikornbank',
      category: 'BANK',
      primaryColor: '#138F2D',
      secondaryColor: '#E8F5E9',
      textColor: '#FFFFFF',
      badgeText: 'KBank',
    },
    loanTitle: 'สินเชื่อเงินด่วน',
    subTitle: 'งวดวันที่ 28',
    loanType: 'MULTI_DAY_SPLIT',
    dueDate: '2026-10-28',
    dueDayOfMonth: 28,
    dueTime: '20:00',
    amount: 2500,
    status: 'PENDING',
    isOverdue: false,
    daysRemaining: 5,
    subType: 'SPLIT_DAY',
    totalPrincipal: 25000,
    remainingPrincipal: 20000,
  };

  it('computes notification alerts for active rules and ignores disabled ones', () => {
    // Reference now = 2026-10-23 10:00
    const now = new Date('2026-10-23T10:00:00.000Z');
    const alerts = computeNotificationTriggerTimes(futureTask, rules, now);

    // Rule 1: 3 hours before 2026-10-28 20:00 => 2026-10-28 17:00
    // Rule 2: 1 day before 2026-10-28 => 2026-10-27 18:00
    // Rule 3: disabled => ignored
    expect(alerts).toHaveLength(2);
    expect(alerts.some(a => a.unit === 'HOURS')).toBe(true);
    expect(alerts.some(a => a.unit === 'DAYS')).toBe(true);
  });

  it('does not schedule alerts for already PAID tasks', () => {
    const paidTask = { ...futureTask, status: 'PAID' as const };
    const alerts = computeNotificationTriggerTimes(paidTask, rules);
    expect(alerts).toHaveLength(0);
  });

  it('builds native notification payloads with stable ids and trigger dates', () => {
    const now = new Date('2026-10-23T10:00:00.000Z');
    const alerts = computeNotificationTriggerTimes(futureTask, rules, now);
    const entries = buildNotificationSchedule(alerts);

    expect(entries).toHaveLength(alerts.length);
    expect(entries[0].id).toBe(alerts[0].id);
    expect(entries[0].taskId).toBe(futureTask.id);
    expect(entries[0].scheduleAt.getTime()).toBe(alerts[0].triggerTime.getTime());
    expect(entries[0].title).toContain('คล่องตัว');
    expect(entries[0].body).toContain(futureTask.loanTitle);
  });

  it('caps the notification schedule and keeps only future triggers', () => {
    const now = new Date('2026-10-23T10:00:00.000Z');
    const tasks = Array.from({ length: 100 }, (_, i) => ({ ...futureTask, id: `task-${i}` }));
    const schedule = computeNotificationSchedule(tasks, rules, now);

    expect(schedule.length).toBeLessThanOrEqual(64);
    expect(schedule.every(item => item.scheduleAt.getTime() > now.getTime())).toBe(true);
  });
});

describe('Gmail & File Backup Service', () => {
  it('generates a valid backup payload with schemaVersion and app identifier', () => {
    const payload = generateBackupPayload();
    expect(payload.app).toBe('DebtFlow Enterprise');
    expect(payload.schemaVersion).toBe('1.0.0');
    expect(payload.data).toBeDefined();
    expect(Array.isArray(payload.data.loans)).toBe(true);
  });

  it('rejects invalid backup JSON data gracefully', () => {
    const res = restoreBackupFile('{"invalid": true}');
    expect(res.success).toBe(false);
  });

  it('successfully restores a valid backup JSON payload', () => {
    const payload = generateBackupPayload();
    const jsonStr = JSON.stringify(payload);
    const res = restoreBackupFile(jsonStr);

    expect(res.success).toBe(true);
    expect(res.message).toContain('กู้คืนข้อมูลสำเร็จ');
  });

  it('restores every persisted config and selected month from a backup', () => {
    const payload = generateBackupPayload();
    payload.data.voiceConfig = {
      ...payload.data.voiceConfig,
      politeParticle: 'KRUB',
      volume: 0.45,
    };
    payload.data.pencilConfig = {
      ...payload.data.pencilConfig,
      themeMode: 'SYSTEM',
      pencilIntensity: 12,
    };
    payload.data.navTabs = [
      { id: 'tab_custom_backup', label: 'หนี้ธนาคาร', iconName: 'Filter', isVisible: true, isCustom: true, customFilter: 'BANK' },
    ];
    payload.data.securityConfig = {
      ...payload.data.securityConfig,
      pinEnabled: true,
      pinLength: 6,
      pinHash: 'restored-hash',
      biometricEnabled: true,
    };
    payload.data.selectedYearMonth = '2027-02';
    const res = restoreBackupFile(JSON.stringify(payload));
    expect(res.success).toBe(true);

    const restored = loadAppState();
    expect(restored.voiceConfig.politeParticle).toBe('KRUB');
    expect(restored.voiceConfig.volume).toBe(0.45);
    expect(restored.pencilConfig.themeMode).toBe('SYSTEM');
    expect(restored.pencilConfig.pencilIntensity).toBe(12);
    expect(restored.navTabs).toEqual(payload.data.navTabs);
    expect(restored.securityConfig.pinLength).toBe(6);
    expect(restored.securityConfig.pinHash).toBe('restored-hash');
    expect(restored.securityConfig.biometricEnabled).toBe(true);
    expect('lineProfile' in restored).toBe(false);
    expect(restored.backupMeta).not.toHaveProperty('googleEmail');
    expect(restored.selectedYearMonth).toBe('2027-02');
  });
});

describe('Snooze Engine & Alert Suppression', () => {
  it('correctly snoozes a task for 60 minutes and suppresses alert', () => {
    const taskId = 'test-snooze-task-1';
    expect(isTaskSnoozed(taskId)).toBe(false);

    snoozeTaskAlert(taskId, 60, false);
    expect(isTaskSnoozed(taskId)).toBe(true);

    const map = getSnoozeMap();
    expect(map[taskId]).toBeGreaterThan(Date.now() + 50 * 60 * 1000);
  });

  it('clears snooze when task is cleared or marked paid', () => {
    const taskId = 'test-snooze-task-2';
    snoozeTaskAlert(taskId, 60, false);
    expect(isTaskSnoozed(taskId)).toBe(true);

    clearTaskSnooze(taskId, false);
    expect(isTaskSnoozed(taskId)).toBe(false);
  });
});
