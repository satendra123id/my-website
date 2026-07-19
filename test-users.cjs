const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore/lite');
const fs = require('fs');
const configFile = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(configFile);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

getDocs(collection(db, 'app_users')).then(snap => {
  snap.forEach(doc => console.log(doc.id, doc.data()));
}).catch(console.error);
