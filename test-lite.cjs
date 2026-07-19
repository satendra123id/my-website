const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore/lite');
const fs = require('fs');

const configFile = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(configFile);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

getDoc(doc(db, 'settings', 'gateway')).then(doc => console.log(doc.data())).catch(console.error);
