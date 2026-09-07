const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
// Need to init firebase with client config, wait, I can just use the backend firestore?
// No, I don't have the key. Let's just use a node script to query it using the client config from firebase.ts
