import { Timestamp } from 'firebase/firestore';

import { FireDate } from '@api/types';

export function toMillis(v: FireDate): number | null {
  // v is only a Timestamp if it actually has toMillis()
  if (v && typeof (v as any).toMillis === 'function') {
    return (v as Timestamp).toMillis();
  }
  return null;
}
