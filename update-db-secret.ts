import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, initializeFirestore } from 'firebase/firestore';
import config from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function update() {
  try {
    const settingsDocRef = doc(db, 'settings', 'gateway');
    const settingsDoc = await getDoc(settingsDocRef);
    let data = settingsDoc.exists() ? settingsDoc.data() : {};
    
    data = {
      ...data,
      razorpayKeyId: 'rzp_live_T9VYFGs0wv50Fc',
      razorpayKeySecret: 'yG4z16yoBijp6qLM4hlvpC0y',
      razorpayWebhookSecret: 'sitaram12'
    };
    
    await setDoc(settingsDocRef, data);
    console.log("Updated DB with new Razorpay credentials successfully!");
  } catch (e) {
    console.error(e);
  }
}
update();
