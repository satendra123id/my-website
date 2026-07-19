const admin = require('firebase-admin');
const config = require('./firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(config)
  });
}
const db = admin.firestore();

async function fix() {
  const coursesRef = db.collection('courses');
  const snapshot = await coursesRef.get();
  let found = false;
  
  for (const doc of snapshot.docs) {
    const course = doc.data();
    let updated = false;
    if (course.modules) {
      for (const mod of course.modules) {
        if (mod.videos) {
          for (const video of mod.videos) {
            if (video.videoUrl && (video.videoUrl.includes('S0T0N190Z3s') || video.title.includes('Metasploit on Termux 2024'))) {
              console.log('Found broken video in course:', course.title);
              video.videoUrl = 'https://www.youtube.com/watch?v=N_v9yU19Q1k';
              updated = true;
              found = true;
            }
          }
        }
      }
    }
    if (updated) {
      await doc.ref.update({ modules: course.modules });
      console.log('Updated course:', course.title);
    }
  }
  if (!found) {
    console.log('Video not found in any course');
  }
}
fix().catch(console.error);
