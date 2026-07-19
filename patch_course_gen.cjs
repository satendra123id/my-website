const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// I will extract the generate-ai-course route
const startMarker = `  app.post("/api/admin/generate-ai-course"`;
const endMarker = `  // Health Check Endpoint (Lightweight)`;
console.log(code.substring(code.indexOf(startMarker), code.indexOf(endMarker)));
