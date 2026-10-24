import { MonthlyInstallmentTask, NotificationRule } from '../types/loan';
import { parseISO, subDays, subWeeks, subHours, setHours, setMinutes, isFuture, format } from 'date-fns';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { formatCurrency, formatThaiDateLong } from '../utils/cashflowCalculator';
import { safeStorage } from './storageService';

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
  const [year, month, day] = dueDateStr.split('-').map(Number);
  const [hours, minutes] = (dueTimeStr || '18:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

export function computeNotificationTriggerTimes(
  task: MonthlyInstallmentTask,
  rules: NotificationRule[],
  now: Date = new Date()
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
      triggerDate = setMinutes(setHours(baseDay, thHours), thMinutes);
    } else {
      // WEEKS
      const baseDay = subWeeks(dueDateTime, rule.amount);
      const [thHours, thMinutes] = (rule.timeOfDay || '09:00').split(':').map(Number);
      triggerDate = setMinutes(setHours(baseDay, thHours), thMinutes);
    }

    if (isFuture(triggerDate) && triggerDate < dueDateTime) {
      // Unique numeric ID for Capacitor LocalNotifications
      const numericId = Math.abs(
        (task.id + rule.id).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
      ) % 1000000;

      let msg = `เตือนชำระ: ${task.loanTitle} - ${task.subTitle} ยอด ฿${formatCurrency(task.amount)} ครบกำหนด ${formatThaiDateLong(task.dueDate)} เวลา ${task.dueTime} น.`;

      alerts.push({
        id: numericId,
        taskId: task.id,
        loanTitle: task.loanTitle,
        subTitle: task.subTitle,
        triggerTime: triggerDate,
        triggerTimeFormatted: format(triggerDate, 'dd/MM/yyyy HH:mm'),
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
    title: '🔔 DebtFlow: เตือนชำระหนี้',
    body: alert.message,
    scheduleAt: alert.triggerTime,
    taskId: alert.taskId,
  }));
}

export function computeNotificationSchedule(
  tasks: MonthlyInstallmentTask[],
  rules: NotificationRule[],
  now: Date = new Date()
): NativeNotificationPayload[] {
  const alerts = tasks.flatMap(task => computeNotificationTriggerTimes(task, rules, now));
  return buildNotificationSchedule(alerts)
    .filter(payload => payload.scheduleAt.getTime() > now.getTime())
    .sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime())
    .slice(0, 64);
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
  now: Date = new Date()
): Promise<{ scheduled: number; cancelled: number }> {
  const payloads = computeNotificationSchedule(tasks, rules, now);

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

  if (!(await hasExactAlarmPermission())) {
    return { scheduled: 0, cancelled: 0 };
  }

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
          schedule: { at: payload.scheduleAt },
          sound: 'beep.wav',
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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const webPerm = await Notification.requestPermission();
      if (webPerm === 'granted') return true;
    }

    // Try Capacitor
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch (e) {
    console.warn('Notification permission request failed', e);
    return false;
  }
}

export async function sendTestNotification(): Promise<boolean> {
  const title = '🔔 DebtFlow Enterprise: ทดสอบการแจ้งเตือน';
  const body = 'ระบบแจ้งเตือนภาระหนี้สินและงวดซับแยกทำงานได้อย่างสมบูรณ์!';

  try {
    // 1. Try Capacitor LocalNotifications
    const canNative = await LocalNotifications.checkPermissions();
    if (canNative.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 10000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      return true;
    }
  } catch (e) {
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
