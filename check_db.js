import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const usersSnap = await getDocs(query(collection(db, 'users')));
  console.log("Users:");
  usersSnap.forEach(d => console.log(d.id, d.data().email, d.data().role));

  const tmSnap = await getDocs(collection(db, 'tenant_memberships'));
  console.log("\nTenant Memberships:");
  tmSnap.forEach(d => console.log(d.id, d.data()));

  const tSnap = await getDocs(collection(db, 'tenants'));
  console.log("\nTenants:");
  tSnap.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}
check();
