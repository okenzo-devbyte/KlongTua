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
