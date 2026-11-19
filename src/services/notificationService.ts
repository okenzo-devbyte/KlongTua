import { MonthlyInstallmentTask, NotificationRule } from '../types/loan';
import { subDays, subWeeks, subHours, setHours, setMinutes, format } from 'date-fns';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { formatCurrency, formatThaiDateLong } from '../utils/cashflowCalculator';
import { safeStorage } from './storageService';

const CHANNEL_ID_SOUND = 'klongtua_alerts_sound';
const CHANNEL_ID_SILENT = 'klongtua_alerts_silent';
let channelsInitialized = false;

function formatThaiDateTimeBE(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const thaiYear = date.getFullYear() + 543;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${thaiYear} ${hh}:${mm}`;
}

export interface ScheduledAlert {
  id: number;
  taskId: string;
  loanTitle: string;
  subTitle: string;
  triggerTime: Date;
  triggerTimeFormatted: string;
  message: string;
  unit: string;
  ruleLabel: string;
}

export function computeTaskDueDateTime(dueDateStr: string, dueTimeStr: string): Date {
  const [year, month, day] = (dueDateStr || '').split('-').map(Number);
  const [hours, minutes] = (dueTimeStr || '18:00').split(':').map(Number);
  const safeH = Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 18;
  const safeM = Number.isFinite(minutes) ? Math.min(59, Math.max(0, minutes)) : 0;
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, safeH, safeM, 0);
}

export function computeNotificationTriggerTimes(
  task: MonthlyInstallmentTask,
  rules: NotificationRule[],
  now: Date = new Date(),
  privacyMode: boolean = false
): ScheduledAlert[] {
  if (task.status === 'PAID') return [];

  const dueDateTime = computeTaskDueDateTime(task.dueDate, task.dueTime);
  const alerts: ScheduledAlert[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    let triggerDate: Date;

    if (rule.unit === 'HOURS') {
      triggerDate = subHours(dueDateTime, rule.amount);
    } else if (rule.unit === 'DAYS') {
      const baseDay = subDays(dueDateTime, rule.amount);
      const [thHours, thMinutes] = (rule.timeOfDay || '09:00').split(':').map(Number);
      triggerDate = setMinutes(setHours(baseDay, thHours || 9), thMinutes || 0);
    } else {
      // WEEKS
      const baseDay = subWeeks(dueDateTime, rule.amount);
      const [thHours, thMinutes] = (rule.timeOfDay || '09:00').split(':').map(Number);
      triggerDate = setMinutes(setHours(baseDay, thHours || 9), thMinutes || 0);
    }

    if (triggerDate.getTime() > now.getTime() && triggerDate.getTime() <= dueDateTime.getTime()) {
      // Unique non-zero numeric ID for Capacitor LocalNotifications (10000 - 899999)
      const hash = Math.abs(
        (task.id + '|' + rule.id).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 7)
      );
      const numericId = (hash % 890000) + 10000;

      const msg = privacyMode
        ? `เตือนชำระ: คุณมีรายการครบกำหนดชำระวันที่ ${formatThaiDateLong(task.dueDate)} เวลา ${task.dueTime} น.`
        : `เตือนชำระ: ${task.loanTitle} - ${task.subTitle} ยอด ฿${formatCurrency(task.amount)} ครบกำหนด ${formatThaiDateLong(task.dueDate)} เวลา ${task.dueTime} น.`;

      alerts.push({
        id: numericId,
        taskId: task.id,
        loanTitle: task.loanTitle,
        subTitle: task.subTitle,
        triggerTime: triggerDate,
        triggerTimeFormatted: formatThaiDateTimeBE(triggerDate),
        message: msg,
        unit: rule.unit,
        ruleLabel: rule.labelTh,
      });
    }
  }

  return alerts;
}

export interface NativeNotificationPayload {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  taskId: string;
}

const SCHEDULED_NOTIFICATION_IDS_KEY = 'debtflow_scheduled_notification_ids_v1';

export function buildNotificationSchedule(alerts: ScheduledAlert[]): NativeNotificationPayload[] {
  return alerts.map(alert => ({
    id: alert.id,
    title: '🔔 คล่องตัว: เตือนชำระหนี้',
    body: alert.message,
    scheduleAt: alert.triggerTime,
    taskId: alert.taskId,
  }));
}

export function computeNotificationSchedule(
  tasks: MonthlyInstallmentTask[],
  rules: NotificationRule[],
  now: Date = new Date(),
  privacyMode: boolean = false
): NativeNotificationPayload[] {
  const alerts = tasks.flatMap(task => computeNotificationTriggerTimes(task, rules, now, privacyMode));
  return buildNotificationSchedule(alerts)
    .filter(payload => payload.scheduleAt.getTime() > now.getTime())
    .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime())
    .slice(0, 64);
}

async function ensureNotificationChannels(): Promise<void> {
  if (channelsInitialized || Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID_SOUND,
      name: 'แจ้งเตือนกำหนดชำระ (มีเสียง)',
      description: 'แจ้งเตือนงวดชำระหนี้พร้อมเสียงกระดิ่ง',
      importance: 4,
      sound: 'beep.wav',
      vibration: true,
    });
    await LocalNotifications.createChannel({
      id: CHANNEL_ID_SILENT,
      name: 'แจ้งเตือนกำหนดชำระ (ปิดเสียง)',
      description: 'แจ้งเตือนงวดชำระหนี้แบบไม่มีเสียง',
      importance: 3,
      vibration: false,
    });
    channelsInitialized = true;
  } catch {
    // Channel creation not supported on non-Android platforms
  }
}

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

export async function syncScheduledNotifications(
  tasks: MonthlyInstallmentTask[],
  rules: NotificationRule[],
  now: Date = new Date(),
  soundEnabled: boolean = true,
  privacyMode: boolean = false
): Promise<{ scheduled: number; cancelled: number }> {
  const payloads = computeNotificationSchedule(tasks, rules, now, privacyMode);

  let previousIds: number[] = [];
  try {
    const raw = safeStorage.getItem(SCHEDULED_NOTIFICATION_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    previousIds = Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    previousIds = [];
  }

  let permissionGranted = false;
  try {
    const status = await LocalNotifications.checkPermissions();
    permissionGranted = status.display === 'granted';
  } catch {
    permissionGranted = false;
  }

  if (!permissionGranted) {
    return { scheduled: 0, cancelled: 0 };
  }

  await ensureNotificationChannels();

  try {
    if (previousIds.length > 0) {
      await LocalNotifications.cancel({
        notifications: previousIds.map(id => ({ id })),
      });
    }

    if (payloads.length > 0) {
      await LocalNotifications.schedule({
        notifications: payloads.map(payload => ({
          id: payload.id,
          title: payload.title,
          body: payload.body,
          schedule: { at: payload.scheduleAt, allowWhileIdle: true },
          channelId: soundEnabled ? CHANNEL_ID_SOUND : CHANNEL_ID_SILENT,
          sound: soundEnabled ? 'beep.wav' : undefined,
          actionTypeId: '',
          extra: { taskId: payload.taskId },
        })),
      });
    }

    safeStorage.setItem(
      SCHEDULED_NOTIFICATION_IDS_KEY,
      JSON.stringify(payloads.map(payload => payload.id))
    );

    return { scheduled: payloads.length, cancelled: previousIds.length };
  } catch (e) {
    console.warn('Failed to sync scheduled notifications', e);
    return { scheduled: 0, cancelled: 0 };
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const webPerm = await Notification.requestPermission();
      if (webPerm === 'granted') return true;
    }

    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch (e) {
    console.warn('Notification permission request failed', e);
    return false;
  }
}

export async function sendTestNotification(soundEnabled: boolean = true): Promise<boolean> {
  const title = '🔔 คล่องตัว: ทดสอบการแจ้งเตือน';
  const body = 'ระบบแจ้งเตือนภาระหนี้สินและงวดซับแยกทำงานได้อย่างสมบูรณ์!';

  try {
    const canNative = await LocalNotifications.checkPermissions();
    if (canNative.display === 'granted') {
      await ensureNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: 900001,
            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
            channelId: soundEnabled ? CHANNEL_ID_SOUND : CHANNEL_ID_SILENT,
            sound: soundEnabled ? 'beep.wav' : undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      return true;
    }
  } catch {
    // Fall back to Web Notification
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.svg',
      });
      return true;
    } else {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/logo.svg' });
        return true;
      }
    }
  }

  return false;
}
