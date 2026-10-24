import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricAvailability {
  available: boolean;
  reason: 'SUCCESS' | 'NO_HARDWARE' | 'HW_UNAVAILABLE' | 'NONE_ENROLLED' | 'UNSUPPORTED' | 'ERROR';
}

interface BiometricNativePlugin {
  isAvailable(): Promise<BiometricAvailability>;
  authenticate(options: {
    title?: string;
    subtitle?: string;
    cancelTitle?: string;
  }): Promise<{ success: boolean }>;
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
