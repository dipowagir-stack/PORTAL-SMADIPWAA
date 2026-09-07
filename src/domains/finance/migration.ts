import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinanceBilling, FinancePayment, FinanceLedger } from './types';

export async function migrateFinanceDomain() {
  console.log("Starting Finance Domain migration...");
  let batch = writeBatch(db);
  let count = 0;

  // 1. Migrate Billing Events -> Finance Billings
  const eventsSnap = await getDocs(collection(db, 'billing_events'));
  for (const d of eventsSnap.docs) {
    const data = d.data();
    const billingRef = doc(collection(db, 'finance_billings'));
    batch.set(billingRef, {
      ...data,
      // map legacy fields to new
      type: data.type || 'other',
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  // 2. Migrate Payments -> Finance Payments
  const paymentsSnap = await getDocs(collection(db, 'payments'));
  for (const d of paymentsSnap.docs) {
    const data = d.data();
    const paymentRef = doc(collection(db, 'finance_payments'));
    batch.set(paymentRef, {
      ...data,
      billingId: data.eventId || '',
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    count++;
    if (count % 100 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  // 3. Initialize default ledger accounts (Asset, Liability, Revenue, Expense)
  const defaultAccounts: Partial<FinanceLedger>[] = [
    { accountName: 'Kas Kecil', type: 'asset' },
    { accountName: 'Kas Bank', type: 'asset' },
    { accountName: 'Pendapatan SPP', type: 'revenue' },
    { accountName: 'Pendapatan Gedung', type: 'revenue' },
    { accountName: 'Beban Gaji', type: 'expense' }
  ];

  for (const acc of defaultAccounts) {
    const ledgerRef = doc(collection(db, 'finance_ledgers'));
    batch.set(ledgerRef, {
      accountId: acc.accountName!.replace(/\s+/g, '_').toLowerCase(),
      accountName: acc.accountName,
      type: acc.type,
      balance: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    count++;
  }

  if (count % 100 !== 0) {
    await batch.commit();
  }
  console.log(`Migration complete. Migrated ${count} finance records.`);
}

export async function rollbackFinanceDomain() {
  console.log("Starting Finance Domain rollback...");
  const cols = [
    'finance_billings', 'finance_payments', 'finance_invoices',
    'finance_ledgers', 'finance_journals', 'finance_cash_flows',
    'finance_scholarships', 'finance_payrolls'
  ];

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
  console.log("Finance Domain Rollback complete.");
}
