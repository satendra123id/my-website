import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function check() {
  const coursesRef = collection(db, 'courses');
  const snapshot = await getDocs(coursesRef);
  for (const d of snapshot.docs) {
    const c = d.data();
    if (c.modules) {
      for (const m of c.modules) {
        if (m.videos) {
          for (const v of m.videos) {
            if (v.videoUrl && v.videoUrl.includes('N_v9yU19Q1k')) {
              console.log('NEW VIDEO IS PRESENT IN DB:', c.title);
              process.exit(0);
            }
          }
        }
      }
    }
  }
  console.log('New video not found in DB');
  process.exit(0);
}
check();
