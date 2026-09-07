const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = { projectId: "ai-studio-ace49a47-40ec-4c50-9cf0-e0bbd7ea490e" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  const users = [];
  snap.forEach(d => users.push({ id: d.id, ...d.data() }));
  
  const mRef = collection(db, 'tenant_memberships');
  const mSnap = await getDocs(mRef);
  const memberships = [];
  mSnap.forEach(d => memberships.push({ id: d.id, ...d.data() }));

  console.log("Users:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email, role: u.role })), null, 2));
  console.log("Memberships:", JSON.stringify(memberships.map(m => ({ id: m.id, userId: m.userId, tenantId: m.tenantId, roles: m.roles })), null, 2));
}
run();
