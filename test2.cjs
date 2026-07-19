const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const Razorpay = require('razorpay');

const configFile = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
const firebaseConfig = JSON.parse(configFile);
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'gateway'));
    const dbSettings = settingsDoc.exists() ? settingsDoc.data() : null;
    
    if (!dbSettings?.razorpayKeyId || !dbSettings?.razorpayKeySecret) {
        console.log("No Razorpay credentials");
        return;
    }

    const razorpay = new Razorpay({
        key_id: dbSettings.razorpayKeyId,
        key_secret: dbSettings.razorpayKeySecret,
    });

    const options = {
        amount: Math.round(100 * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    console.log("Success:", order);
  } catch (error) {
    console.log("Error type:", typeof error);
    console.log("Error keys:", Object.keys(error));
    console.log("Error:", error);
    console.log("Error msg:", error.message);
    if(error.error) console.log("Razorpay error:", error.error);
  }
}
run();
