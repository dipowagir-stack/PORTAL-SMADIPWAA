import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { virtualDatabase } from './VirtualDatabase';

/**
 * Checks if virtual database mode is currently active.
 */
export function isVirtualActive(): boolean {
  return virtualDatabase.isActive();
}

/**
 * Universal Virtual-Aware GetDoc
 */
export async function vGetDoc(docRef: any, colName?: string, docId?: string): Promise<any> {
  const collectionName = colName || (docRef?.parent?.id || (docRef?._key?.path?.segments?.[0]));
  const id = docId || (docRef?.id || (docRef?._key?.path?.segments?.[1]));

  if (virtualDatabase.isActive() && collectionName && id) {
    const data = await virtualDatabase.getDoc(collectionName, id);
    return {
      exists: () => !!data,
      data: () => data,
      id: id
    };
  }

  // Fallback to real Firestore
  if (docRef) {
    return await getDoc(docRef);
  }
  return await getDoc(doc(db, collectionName, id));
}

/**
 * Universal Virtual-Aware GetDocs
 */
export async function vGetDocs(colRefOrQuery: any, colName?: string, filterPredicate?: (item: any) => boolean): Promise<any> {
  const collectionName = colName || (colRefOrQuery?.id || (colRefOrQuery?._query?.path?.segments?.[0]));

  if (virtualDatabase.isActive() && collectionName) {
    const items = await virtualDatabase.getDocs(collectionName, filterPredicate);
    return {
      docs: items.map(item => ({
        id: item.id,
        data: () => item,
        exists: () => true
      })),
      empty: items.length === 0,
      size: items.length,
      forEach: (callback: (d: any) => void) => {
        items.forEach(item => {
          callback({
            id: item.id,
            data: () => item,
            exists: () => true
          });
        });
      }
    };
  }

  // Fallback to real Firestore
  return await getDocs(colRefOrQuery);
}

/**
 * Universal Virtual-Aware SetDoc
 */
export async function vSetDoc(docRef: any, data: any, options?: { merge?: boolean }, colName?: string, docId?: string): Promise<void> {
  const collectionName = colName || (docRef?.parent?.id || (docRef?._key?.path?.segments?.[0]));
  const id = docId || (docRef?.id || (docRef?._key?.path?.segments?.[1]));

  if (virtualDatabase.isActive() && collectionName && id) {
    await virtualDatabase.setDoc(collectionName, id, data, options);
    return;
  }

  // Fallback to real Firestore
  if (options) {
    await setDoc(docRef || doc(db, collectionName, id), data, options);
  } else {
    await setDoc(docRef || doc(db, collectionName, id), data);
  }
}

/**
 * Universal Virtual-Aware AddDoc
 */
export async function vAddDoc(colRef: any, data: any, colName?: string): Promise<{ id: string }> {
  const collectionName = colName || (colRef?.id || (colRef?._path?.segments?.[0]));

  if (virtualDatabase.isActive() && collectionName) {
    const newId = await virtualDatabase.addDoc(collectionName, data);
    return { id: newId };
  }

  // Fallback to real Firestore
  const realRef = await addDoc(colRef || collection(db, collectionName), data);
  return { id: realRef.id };
}

/**
 * Universal Virtual-Aware UpdateDoc
 */
export async function vUpdateDoc(docRef: any, data: any, colName?: string, docId?: string): Promise<void> {
  const collectionName = colName || (docRef?.parent?.id || (docRef?._key?.path?.segments?.[0]));
  const id = docId || (docRef?.id || (docRef?._key?.path?.segments?.[1]));

  if (virtualDatabase.isActive() && collectionName && id) {
    await virtualDatabase.updateDoc(collectionName, id, data);
    return;
  }

  // Fallback to real Firestore
  await updateDoc(docRef || doc(db, collectionName, id), data);
}

/**
 * Universal Virtual-Aware DeleteDoc
 */
export async function vDeleteDoc(docRef: any, colName?: string, docId?: string): Promise<void> {
  const collectionName = colName || (docRef?.parent?.id || (docRef?._key?.path?.segments?.[0]));
  const id = docId || (docRef?.id || (docRef?._key?.path?.segments?.[1]));

  if (virtualDatabase.isActive() && collectionName && id) {
    await virtualDatabase.deleteDoc(collectionName, id);
    return;
  }

  // Fallback to real Firestore
  await deleteDoc(docRef || doc(db, collectionName, id));
}

/**
 * Universal Virtual-Aware onSnapshot
 */
export function vOnSnapshot(
  target: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void,
  colName?: string
): Unsubscribe {
  const collectionName = colName || target?.id || target?._path?.segments?.[0] || target?.parent?.id;

  if (virtualDatabase.isActive() && collectionName) {
    // Deliver initial state
    virtualDatabase.getDocs(collectionName).then(items => {
      onNext({
        docs: items.map(item => ({
          id: item.id,
          data: () => item,
          exists: () => true
        })),
        empty: items.length === 0,
        size: items.length,
        forEach: (callback: (d: any) => void) => {
          items.forEach(item => {
            callback({
              id: item.id,
              data: () => item,
              exists: () => true
            });
          });
        }
      });
    }).catch(err => {
      onError?.(err);
    });

    // Subscribe to sandbox change events
    const unsub = virtualDatabase.subscribe((col, _action) => {
      if (col === collectionName || col === '*') {
        virtualDatabase.getDocs(collectionName).then(items => {
          onNext({
            docs: items.map(item => ({
              id: item.id,
              data: () => item,
              exists: () => true
            })),
            empty: items.length === 0,
            size: items.length,
            forEach: (callback: (d: any) => void) => {
              items.forEach(item => {
                callback({
                  id: item.id,
                  data: () => item,
                  exists: () => true
                });
              });
            }
          });
        });
      }
    });

    return unsub;
  }

  // Fallback to real Firestore onSnapshot
  return onSnapshot(target, onNext, onError);
}
