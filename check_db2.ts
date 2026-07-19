import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
  const snapshot = await getDocs(collection(db, 'courses'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Course: ${data.title}`);
    console.log(`Videos: ${data.videos?.map((v:any)=>v.title).join(', ')}`);
  });
}

check().catch(console.error);
