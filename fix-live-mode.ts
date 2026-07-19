import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function update() {
  try {
    const settingsDocRef = doc(db, 'settings', 'gateway');
    await updateDoc(settingsDocRef, {
      isLiveMode: true
    });
    console.log("Updated isLiveMode to true!");
  } catch (e) {
    console.error(e);
  }
}
update();
