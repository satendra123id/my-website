import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function fix() {
  try {
    const coursesRef = collection(db, 'courses');
    const snapshot = await getDocs(coursesRef);
    let found = false;
    
    for (const d of snapshot.docs) {
      const course = d.data();
      let updated = false;
      if (course.videos) {
        for (let i = 0; i < course.videos.length; i++) {
          const video = course.videos[i];
          if (video.title && video.title.includes('Metasploit')) {
            console.log('Found video in course:', course.title);
            video.url = 'https://www.youtube.com/watch?v=N_v9yU19Q1k';
            updated = true;
            found = true;
          }
          if (video.url && video.url.includes('8mG_Nly_2wM')) {
            video.url = 'https://www.youtube.com/watch?v=N_v9yU19Q1k';
            updated = true;
            found = true;
          }
        }
      }
      if (updated) {
        await updateDoc(doc(db, 'courses', d.id), { videos: course.videos });
        console.log('Updated course:', course.title);
      }
    }
    if (!found) {
      console.log('Video not found in any course via this path');
    }
  } catch(e) {
    console.error(e);
  }
}
fix();
