import { SecurityConfig } from '../types/loan';
import { loadAppState, saveSecurityConfig } from './storageService';
import {
  authenticateWithBiometric,
  getBiometricAvailability,
  isNativeBiometricPlatform,
} from './native/biometric';

export { getBiometricAvailability };

let lastActivityTimestamp = Date.now();
let isCurrentlyLocked = false;

/**
 * Hash PIN using Web Crypto SHA-256 with fallback
 */
export async function hashPin(pin: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(`debtflow_salt_${pin}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  // Simple fallback hash for test environment
  let hash = 0;
  const str = `salt_${pin}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

export async function verifyPin(enteredPin: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

export function generateScrambledKeypad(): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

export function recordUserActivity(): void {
  lastActivityTimestamp = Date.now();
}

export function checkShouldAutoLock(config: SecurityConfig): boolean {
  if (!config.pinEnabled || !config.pinHash) return false;
  if (config.autoLockTimeoutMinutes === -1) return false; // Never
  if (config.autoLockTimeoutMinutes === 0) return true; // Immediately

  const elapsedMs = Date.now() - lastActivityTimestamp;
  const timeoutMs = config.autoLockTimeoutMinutes * 60 * 1000;
  return elapsedMs >= timeoutMs;
}

export function getIsLocked(): boolean {
  return isCurrentlyLocked;
}

export function setIsLocked(locked: boolean): void {
  isCurrentlyLocked = locked;
  if (!locked) {
    recordUserActivity();
  }
}

export async function authenticateBiometric(credentialId?: string): Promise<boolean> {
  if (isNativeBiometricPlatform()) {
    return authenticateWithBiometric({
      title: 'ปลดล็อก DebtFlow',
      subtitle: 'สแกนลายนิ้วมือหรือใบหน้าเพื่อเข้าใช้งาน',
      cancelTitle: 'ใช้รหัส PIN',
    });
  }

  if (!isBiometricSupported() || !credentialId) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64UrlToBytes(credentialId).buffer as ArrayBuffer,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}

export function isBiometricSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.PublicKeyCredential !== 'undefined'
    && !!navigator.credentials
    && typeof navigator.credentials.create === 'function'
    && typeof crypto !== 'undefined'
    && typeof crypto.getRandomValues === 'function';
}

export async function registerBiometricCredential(displayName: string): Promise<string | null> {
  if (!isBiometricSupported()) return null;

  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) return null;
    }

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'DebtFlow Enterprise' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'debtflow-local-user',
          displayName: displayName || 'DebtFlow User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (!credential) return null;
    return bytesToBase64Url(new Uint8Array(credential.rawId));
  } catch {
    return null;
  }
}

export function applyPinLengthChange(config: SecurityConfig, pinLength: 4 | 6): SecurityConfig {
  if (config.pinLength === pinLength) return config;
  return {
    ...config,
    pinLength,
    pinEnabled: false,
    pinHash: undefined,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
