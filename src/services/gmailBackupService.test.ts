import { describe, expect, it } from 'vitest';
import { buildBackupFileName, generateBackupPayload, restoreBackupFile } from './gmailBackupService';
import { loadAppState } from './storageService';

describe('backup payload', () => {
  it('builds a stable backup filename', () => {
    expect(buildBackupFileName(new Date(2026, 9, 24, 10, 30))).toBe('debtflow_backup_20261024_1030.json');
  });

  it('does not include fake LINE or Gmail account fields', () => {
    const state = loadAppState();
    expect('lineProfile' in state).toBe(false);
    expect('googleEmail' in state.backupMeta).toBe(false);
    expect('isConnected' in state.backupMeta).toBe(false);
  });

  it('restores an older payload while ignoring unknown fields', () => {
    const payload = generateBackupPayload() as any;
    payload.data.lineProfile = { isLinked: true };
    payload.data.backupMeta = { ...payload.data.backupMeta, googleEmail: 'old@example.com', isConnected: true };

    expect(restoreBackupFile(JSON.stringify(payload)).success).toBe(true);
    const restored = loadAppState();
    expect('lineProfile' in restored).toBe(false);
    expect(restored.backupMeta).not.toHaveProperty('googleEmail');
    expect(restored.backupMeta).not.toHaveProperty('isConnected');
  });

  it('rejects a payload whose loans are malformed', () => {
    const payload = {
      app: 'DebtFlow Enterprise',
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: { loans: [{}] },
    };

    expect(restoreBackupFile(JSON.stringify(payload)).success).toBe(false);
  });
});
