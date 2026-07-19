const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const start = code.indexOf('app.post("/api/admin/generate-ai-course"');
const end = code.indexOf('app.post("/api/admin/verify-single-link"', start) || code.indexOf('app.post("/api/admin/health-check"', start) || code.indexOf('// Health Check', start);
console.log(code.substring(start, end).substring(0, 1500));
