import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, generateScrambledKeypad, checkShouldAutoLock, authenticateBiometric, applyPinLengthChange, isBiometricSupported } from './securityService';
import { SecurityConfig } from '../types/loan';

describe('securityService', () => {
  it('correctly hashes and verifies identical PINs', async () => {
    const pin = '1234';
    const hash = await hashPin(pin);
    expect(hash).toBeTruthy();
    expect(await verifyPin('1234', hash)).toBe(true);
    expect(await verifyPin('9999', hash)).toBe(false);
  });

  it('scrambles keypad containing digits 0-9 exactly once', () => {
    const keypad = generateScrambledKeypad();
    expect(keypad.length).toBe(10);
    const sorted = [...keypad].sort();
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('checks auto lock when pinEnabled is false', () => {
    const config: SecurityConfig = {
      pinEnabled: false,
      pinLength: 4,
      biometricEnabled: false,
      scrambledKeypad: true,
      autoLockTimeoutMinutes: 5,
    };
    expect(checkShouldAutoLock(config)).toBe(false);
  });

  it('does not auto-lock when PIN is enabled but no PIN hash exists', () => {
    const config: SecurityConfig = {
      pinEnabled: true,
      pinLength: 6,
      biometricEnabled: true,
      scrambledKeypad: true,
      autoLockTimeoutMinutes: 0,
    };
    expect(checkShouldAutoLock(config)).toBe(false);
  });

  it('never grants biometric unlock without a registered platform credential', async () => {
    expect(isBiometricSupported()).toBe(false);
    expect(await authenticateBiometric()).toBe(false);
  });

  it('invalidates the stored PIN hash when the PIN length changes', () => {
    const config: SecurityConfig = {
      pinEnabled: true,
      pinLength: 4,
      pinHash: 'existing-hash',
      biometricEnabled: false,
      scrambledKeypad: true,
      autoLockTimeoutMinutes: 5,
    };

    const unchanged = applyPinLengthChange(config, 4);
    expect(unchanged.pinLength).toBe(4);
    expect(unchanged.pinHash).toBe('existing-hash');

    const changed = applyPinLengthChange(config, 6);
    expect(changed.pinLength).toBe(6);
    expect(changed.pinHash).toBeUndefined();
    expect(changed.pinEnabled).toBe(false);
  });
});
