import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
async function check() {
  const snapshot = await getDocs(collection(db, 'courses'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`${data.title}: ${data.videos?.length || 0} videos, ${data.attachments?.length || 0} attachments`);
  });
}
check().catch(console.error);
