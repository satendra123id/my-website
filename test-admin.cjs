const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function testAdmin() {
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
    
    // Initialize
    const app = initializeApp({
      projectId: config.projectId,
      credential: applicationDefault()
    });
    
    // Try custom database
    const db = getFirestore(app, config.firestoreDatabaseId);
    
    console.log("Attempting to list collections in custom database...");
    const collections = await db.listCollections();
    console.log("Collections:", collections.map(c => c.id));
    
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testAdmin();
