import { useEffect } from 'react';

export function useScreenWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let active = true;
    let pending = false;
    let lock: WakeLockSentinel | undefined;
    const release = () => {
      const held = lock;
      lock = undefined;
      if (held) void held.release().catch(() => {});
    };
    const acquire = async () => {
      if (!active || pending || (lock && !lock.released) || document.visibilityState !== 'visible')
        return;
      pending = true;
      try {
        const held = await navigator.wakeLock.request('screen');
        if (!active || document.visibilityState !== 'visible') {
          await held.release();
          return;
        }
        lock = held;
        held.addEventListener('release', () => {
          if (lock === held) lock = undefined;
        });
      } catch {
        /* Wake Lock is optional: low battery or permissions may prevent it. */
      } finally {
        pending = false;
      }
    };
    const visibilityChanged = () => {
      if (document.visibilityState === 'visible') void acquire();
      else release();
    };
    void acquire();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', visibilityChanged);
      release();
    };
  }, []);
}
