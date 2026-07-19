import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configFile = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
const firebaseConfig = JSON.parse(configFile);

const firebaseApp = initializeApp(firebaseConfig || {});
const db = getFirestore(firebaseApp, firebaseConfig?.firestoreDatabaseId);

async function test() {
  try {
    const docRef = doc(db, "settings", "gateway");
    const snap = await getDoc(docRef);
    console.log("Snap exists:", snap.exists());
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
