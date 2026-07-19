import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function list() {
  try {
    const coursesRef = collection(db, 'courses');
    const snapshot = await getDocs(coursesRef);
    for (const d of snapshot.docs) {
      const c = d.data();
      console.log('Course:', c.title);
      if (c.modules) {
        for (const m of c.modules) {
          if (m.videos) {
            for (const v of m.videos) {
              console.log(' - Video:', v.title, v.videoUrl);
            }
          }
        }
      }
    }
  } catch(e) { console.error(e); }
  process.exit(0);
}
list();
