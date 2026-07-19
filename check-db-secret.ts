import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function check() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'gateway'));
    if (settingsDoc.exists()) {
      console.log("DB data:", settingsDoc.data());
    } else {
      console.log("No data found");
    }
  } catch (e) {
    console.error(e);
  }
}
check();
