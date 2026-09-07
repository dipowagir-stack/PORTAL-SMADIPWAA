import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function updateRoles() {
  try {
    const configPath = path.resolve('./firebase-applet-config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const firebaseConfig = JSON.parse(configData);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    console.log("Connected to Firestore. Updating roles...");

    const usersRef = collection(db, 'users');
    
    // Update offcdipowagir@gmail.com
    const q1 = query(usersRef, where('email', '==', 'offcdipowagir@gmail.com'));
    const snap1 = await getDocs(q1);
    
    if (snap1.empty) {
      console.log('User offcdipowagir@gmail.com not found. They might need to log in first.');
    } else {
      for (const d of snap1.docs) {
        await updateDoc(doc(db, 'users', d.id), { role: 'super_admin' });
        console.log(`Updated ${d.id} (offcdipowagir@gmail.com) to super_admin`);
      }
    }

    // Update romeoelins.2003
    const q2 = query(usersRef, where('email', '==', 'romeoelins.2003@gmail.com'));
    const snap2 = await getDocs(q2);
    
    if (snap2.empty) {
      console.log('User romeoelins.2003@gmail.com not found. They might need to log in first.');
    } else {
      for (const d of snap2.docs) {
        await updateDoc(doc(db, 'users', d.id), { role: 'platform_admin' });
        console.log(`Updated ${d.id} (romeoelins.2003@gmail.com) to platform_admin`);
      }
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating roles:", err);
    process.exit(1);
  }
}

updateRoles();
