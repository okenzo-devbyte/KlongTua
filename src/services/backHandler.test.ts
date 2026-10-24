import { beforeEach, describe, expect, it } from 'vitest';
import { pushBackHandler, resetBackHandlers, runBackHandlers } from './backHandler';

beforeEach(() => resetBackHandlers());

describe('backHandler stack', () => {
  it('runs the most recently pushed handler first', () => {
    const order: string[] = [];
    pushBackHandler(() => { order.push('first'); return true; });
    pushBackHandler(() => { order.push('second'); return true; });

    expect(runBackHandlers()).toBe(true);
    expect(order).toEqual(['second']);
  });

  it('falls through handlers that return false', () => {
    const order: string[] = [];
    pushBackHandler(() => { order.push('first'); return true; });
    pushBackHandler(() => { order.push('second'); return false; });

    expect(runBackHandlers()).toBe(true);
    expect(order).toEqual(['second', 'first']);
  });

  it('returns false when no handler handles the event', () => {
    pushBackHandler(() => false);
    expect(runBackHandlers()).toBe(false);
  });

  it('unregisters a handler when its disposer runs', () => {
    const dispose = pushBackHandler(() => true);
    dispose();
    expect(runBackHandlers()).toBe(false);
  });
});
