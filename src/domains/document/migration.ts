import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DocumentItem, DocumentTemplate } from './types';

export async function migrateDocumentDomain() {
  console.log("Starting Document Domain migration...");
  let batch = writeBatch(db);
  let count = 0;

  // 1. Migrate letter_templates -> doc_templates
  const templatesSnap = await getDocs(collection(db, 'letter_templates'));
  for (const d of templatesSnap.docs) {
    const data = d.data();
    
    // Extract variables naively by regex if not present
    let vars: string[] = [];
    if (data.content) {
      const matches = data.content.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        vars = matches.map((m: string) => m.replace(/[{}]/g, ''));
      }
    }

    const templateRef = doc(collection(db, 'doc_templates'));
    batch.set(templateRef, {
      name: data.name || 'Untitled Template',
      description: data.description || '',
      content: data.content || '',
      variables: vars,
      type: 'letter',
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
      updatedAt: Date.now()
    });
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  // 2. Migrate letters -> doc_items
  const lettersSnap = await getDocs(collection(db, 'letters'));
  for (const d of lettersSnap.docs) {
    const data = d.data();
    const itemRef = doc(collection(db, 'doc_items'));
    batch.set(itemRef, {
      title: data.title || 'Untitled Letter',
      type: 'letter',
      category: 'general',
      content: data.content || '',
      metadata: {
        nomor: data.nomor,
        tujuan: data.tujuan
      },
      ownerId: 'school',
      ownerType: 'school',
      isSigned: false,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.date || Date.now()),
      updatedAt: Date.now()
    });
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  // 3. Migrate teacher_documents -> doc_items
  const teacherDocsSnap = await getDocs(collection(db, 'teacher_documents'));
  for (const d of teacherDocsSnap.docs) {
    const data = d.data();
    const itemRef = doc(collection(db, 'doc_items'));
    batch.set(itemRef, {
      title: data.judul || data.fileName || 'Untitled Document',
      type: 'other',
      category: 'academic',
      url: data.fileUrl || data.link || '',
      metadata: {
        pertemuan: data.pertemuan,
        jenis: data.jenis,
        className: data.className,
        subject: data.subject
      },
      ownerId: data.teacherId || 'unknown',
      ownerType: 'teacher',
      isSigned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  if (count % 100 !== 0) {
    await batch.commit();
  }
  console.log(`Migration complete. Migrated ${count} document records.`);
}

export async function rollbackDocumentDomain() {
  console.log("Starting Document Domain rollback...");
  const cols = ['doc_items', 'doc_templates', 'doc_signatures'];

  for (const col of cols) {
    const snap = await getDocs(collection(db, col));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 100 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    if (count % 100 !== 0) {
      await batch.commit();
    }
    console.log(`Rolled back ${count} documents from ${col}`);
  }
  console.log("Document Domain Rollback complete.");
}
