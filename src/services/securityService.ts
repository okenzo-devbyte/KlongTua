import { SecurityConfig } from '../types/loan';
import { safeStorage } from './storageService';
import {
  authenticateWithBiometric,
  getBiometricAvailability,
  isNativeBiometricPlatform,
} from './native/biometric';

export { getBiometricAvailability };

let lastActivityTimestamp = Date.now();
let isCurrentlyLocked = false;

const PIN_LOCKOUT_KEY = 'klongtua_pin_lockout_v1';
const PBKDF2_PREFIX = 'pbkdf2_v1:';
const PBKDF2_ITERATIONS = 100000;

export interface PinLockoutState {
  failedAttempts: number;
  lockedUntil: number; // epoch ms
}

function getCryptoSubtle(): SubtleCrypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function derivePbkdf2Hash(pin: string, salt: Uint8Array): Promise<string> {
  const subtle = getCryptoSubtle();
  if (!subtle) {
    throw new Error('Web Crypto PBKDF2 unavailable');
  }
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

async function legacyHashPin(pin: string): Promise<string> {
  const subtle = getCryptoSubtle();
  if (subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(`debtflow_salt_${pin}`);
      const hashBuffer = await subtle.digest('SHA-256', msgBuffer);
      return bytesToHex(new Uint8Array(hashBuffer));
    } catch {}
  }
  let hash = 0;
  const str = `salt_${pin}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

/**
 * Hash PIN using PBKDF2-SHA256 with random 16-byte salt (falls back only in non-crypto test runtimes)
 */
export async function hashPin(pin: string): Promise<string> {
  const subtle = getCryptoSubtle();
  if (subtle && typeof globalThis.crypto?.getRandomValues === 'function') {
    try {
      const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
      const derivedHex = await derivePbkdf2Hash(pin, salt);
      return `${PBKDF2_PREFIX}${bytesToHex(salt)}:${derivedHex}`;
    } catch {}
  }
  return legacyHashPin(pin);
}

export function needsPinHashUpgrade(storedHash?: string): boolean {
  return Boolean(storedHash && !storedHash.startsWith(PBKDF2_PREFIX));
}

export async function verifyPin(enteredPin: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    const parts = storedHash.slice(PBKDF2_PREFIX.length).split(':');
    if (parts.length !== 2) return false;
    const [saltHex, expectedHex] = parts;
    try {
      const derivedHex = await derivePbkdf2Hash(enteredPin, hexToBytes(saltHex));
      return derivedHex === expectedHex;
    } catch {
      return false;
    }
  }
  const enteredLegacy = await legacyHashPin(enteredPin);
  return enteredLegacy === storedHash;
}

export function getPinLockoutState(): PinLockoutState {
  try {
    const raw = safeStorage.getItem(PIN_LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<PinLockoutState>;
    return {
      failedAttempts: typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
    };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}

export function recordFailedPinAttempt(now: number = Date.now()): PinLockoutState {
  const current = getPinLockoutState();
  const failedAttempts = current.failedAttempts + 1;
  let lockedUntil = current.lockedUntil;
  if (failedAttempts >= 10) {
    lockedUntil = now + 5 * 60 * 1000; // 5 minutes
  } else if (failedAttempts >= 5) {
    lockedUntil = now + 30 * 1000; // 30 seconds
  }
  const next: PinLockoutState = { failedAttempts, lockedUntil };
  safeStorage.setItem(PIN_LOCKOUT_KEY, JSON.stringify(next));
  return next;
}

export function resetPinAttempts(): void {
  safeStorage.removeItem(PIN_LOCKOUT_KEY);
}

export function generateScrambledKeypad(): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto?.getRandomValues === 'function';
  for (let i = digits.length - 1; i > 0; i--) {
    let j: number;
    if (hasCrypto) {
      const buf = new Uint32Array(1);
      globalThis.crypto.getRandomValues(buf);
      j = buf[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

export function recordUserActivity(): void {
  lastActivityTimestamp = Date.now();
}

export function checkShouldAutoLock(config: SecurityConfig, isResume: boolean = false): boolean {
  if (!config.pinEnabled || !config.pinHash) return false;
  if (config.autoLockTimeoutMinutes === -1) return false; // Never
  if (config.autoLockTimeoutMinutes === 0) return isResume; // Lock immediately on background resume

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
      title: 'ปลดล็อก คล่องตัว',
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
        rp: { name: 'คล่องตัว (KlongTua)' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'klongtua-local-user',
          displayName: displayName || 'ผู้ใช้งานคล่องตัว',
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
