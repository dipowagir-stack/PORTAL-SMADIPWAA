import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Result, ok, fail } from '../../foundation/core/Result';
import { ErrorCodes } from '../../foundation/shared/ErrorCatalog';
import { virtualDatabase } from '../../foundation/sandbox/VirtualDatabase';

export const isAcademicFrozen = async (): Promise<boolean> => {
  try {
    if (virtualDatabase.isActive()) {
      const data = await virtualDatabase.getDoc('settings', 'global');
      if (data) {
        return data.isAcademicFrozen === true;
      }
      return false;
    }
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      return snap.data().isAcademicFrozen === true;
    }
    return false;
  } catch (e) {
    console.error("Error checking freeze status:", e);
    return false;
  }
};
