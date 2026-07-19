const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/process\.env\.GEMINI_API_KEY \|\| "AQ\.Ab8RN6Il3NM6do6TunzfVuxOz5EW2EO3k8iDVOnuHiHVuoYN1Q" \|\| ".*?"/g, 'process.env.GEMINI_API_KEY || "AQ.Ab8RN6Il3NM6do6TunzfVuxOz5EW2EO3k8iDVOnuHiHVuoYN1Q"');
fs.writeFileSync('server.ts', code);
