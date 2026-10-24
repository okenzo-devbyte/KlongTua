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
