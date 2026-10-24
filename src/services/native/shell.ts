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

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: backgroundColor });
  } catch {
    // Status bar styling can be ignored on OEMs that reject it.
  }

  try {
    await NativeSystemBars.setNavigationBar({
      color: backgroundColor,
      lightIcons: !isDark,
    });
  } catch {
    // Navigation bar styling is optional on devices that ignore it.
  }
}

export async function hideSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide();
  } catch {}
}

export function addAppStateListener(cb: (isActive: boolean) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let disposed = false;
  let remove: (() => void) | undefined;

  void App.addListener('appStateChange', ({ isActive }) => cb(isActive)).then(handle => {
    if (disposed) {
      void handle.remove();
    } else {
      remove = () => void handle.remove();
    }
  }).catch(() => {});

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
    if (disposed) {
      void handle.remove();
    } else {
      remove = () => void handle.remove();
    }
  }).catch(() => {});

  return () => {
    disposed = true;
    remove?.();
  };
}
