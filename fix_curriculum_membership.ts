import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function run() {
  console.log("Fetching users...");
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  for (const d of snap.docs) {
    const user = d.data();
    console.log(`Checking user ${d.id} (${user.email}) with role ${user.role}`);
    
    // Check if membership exists
    const mRef = collection(db, 'tenant_memberships');
    const q = query(mRef, where('userId', '==', d.id), where('tenantId', '==', 'smas-diponegoro'));
    const mSnap = await getDocs(q);
    
    if (mSnap.empty) {
      console.log(`Creating membership for ${user.email} as ${user.role}`);
      const newRef = doc(mRef);
      await setDoc(newRef, {
        userId: d.id,
        tenantId: 'smas-diponegoro',
        roles: [user.role],
        permissions: [],
        status: 'ACTIVE',
        joinedAt: Date.now()
      });
    } else {
      console.log(`Membership already exists for ${user.email}`);
    }
  }
  console.log("Done.");
}
run().catch(console.error);
