import { useEffect } from 'react';
import { pushBackHandler, type BackHandler } from '../services/backHandler';

export function useAndroidBack(handler: BackHandler, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return pushBackHandler(handler);
  }, [handler, enabled]);
}
