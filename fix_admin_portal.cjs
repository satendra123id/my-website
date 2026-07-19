const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf-8');

const regex = /const contentType = res\.headers\.get\("content-type"\);\n[\s\S]*?throw new Error\(data\.error \|\| "कोर्स जनरेट करने में विफलता\।"\);\n      \}/g;

const replacement = `const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("सर्वर से अमान्य उत्तर प्राप्त हुआ। कृपया 5 सेकंड बाद पुनः प्रयास करें।");
      }
      
      const data = await res.json();
      if (data.success) {
        setAiGenSuccessMsg(data.message || \`सफलतापूर्वक AI द्वारा कोर्स पोस्ट किया गया: "\${data.course.title}" (Category: \${data.course.category})\`);
        setAiGenerationTopic('');
      } else {
        throw new Error(data.error || "कोर्स जनरेट करने में विफलता।");
      }`;

if(code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/components/AdminPortal.tsx', code);
  console.log("Replaced AdminPortal");
} else {
  console.log("Could not find AdminPortal match");
}
