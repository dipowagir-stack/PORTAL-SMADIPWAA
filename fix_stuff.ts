import { db } from './src/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

async function fixModules() {
  const defaultModules = ['admin', 'tu', 'website'];
  for (const code of defaultModules) {
    const modRef = doc(collection(db, 'platform_modules'));
    await setDoc(modRef, {
      id: modRef.id,
      code,
      name: code.charAt(0).toUpperCase() + code.slice(1),
      description: `Core ${code} module`,
      status: 'ACTIVE',
      version: '1.0.0',
      dependencies: [],
      defaultEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log(`Seeded module: ${code}`);
  }
}

async function fixTenants() {
  const snap = await getDocs(collection(db, 'tenants'));
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.timezone) {
      await updateDoc(d.ref, { timezone: 'Asia/Jakarta' });
      console.log(`Updated timezone for tenant: ${d.id}`);
    }
  }
}

async function run() {
  await fixModules();
  await fixTenants();
  console.log("Done");
}

run().catch(console.error);
