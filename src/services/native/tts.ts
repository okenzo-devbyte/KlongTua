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
  options: {
    rate: number;
    pitch: number;
    volume: number;
    chime: ChimeStyle | 'SUCCESS' | 'NONE';
  }
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
