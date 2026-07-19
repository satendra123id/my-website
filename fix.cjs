const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /app\.post\("\/api\/admin\/trigger-daily-auto-upload", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: err\.message \|\| String\(err\) \}\);\n    \}\n  \}\);/g;

const replacement = `app.post("/api/admin/trigger-daily-auto-upload", async (req, res) => {
    try {
      console.log("[DAILY-AUTO-UPLOAD] Admin triggered manual daily check!");
      res.json({ success: true, message: "डैली कोर्स जनरेशन बैकग्राउंड में शुरू हो गया है। इसे पूरा होने में 1-2 मिनट लग सकते हैं।" });
      
      setTimeout(async () => {
        try {
          const coursesSnapshot = await getDocs(collection(db, 'courses'));
          const allCourses = coursesSnapshot.docs.map(doc => doc.data());
          
          const dailyTopicsPool = [
            "Kali Linux Ethical Hacking Beginner Course",
            "Nmap Network Scanning and Vulnerability Guide",
            "Metasploit Framework Practical Masterclass",
            "Wireshark Packet Analysis & Network Pentesting",
            "Bug Bounty Hunting & Web Security Basics",
            "Termux Mobile Pentesting and Linux Commands",
            "Hydra Password Cracking and SSH Hardening",
            "SQLmap Automated SQL Injection Pentesting Course",
            "Social Engineering Defensive and Practical Guide",
            "ChatGPT & Prompt Engineering Masterclass",
            "Stock Market & Options Trading Basics",
            "Figma UI/UX Designing Essentials Course"
          ];
          
          const unusedTopics = dailyTopicsPool.filter(topic => 
            !allCourses.some(c => (c.title || "").toLowerCase().includes(topic.toLowerCase()))
          );
          
          const finalTopic = unusedTopics.length > 0 
            ? unusedTopics[Math.floor(Math.random() * unusedTopics.length)] 
            : dailyTopicsPool[Math.floor(Math.random() * dailyTopicsPool.length)] + \` v\${Math.floor(Math.random() * 5) + 1}\`;
            
          console.log(\`[DAILY-AUTO-UPLOAD] Admin Force Run: Selected topic: "\${finalTopic}"\`);
          const newCourse = await generateAICourseService(finalTopic, true);
          console.log(\`[DAILY-AUTO-UPLOAD] Successfully auto-uploaded & published course: "\${newCourse?.title}"!\`);
        } catch (bgErr) {
          console.error("[DAILY-AUTO-UPLOAD] Background generation failed:", bgErr);
        }
      }, 0);
    } catch (err: any) {
      console.error("[DAILY-AUTO-UPLOAD] Manual trigger check failed:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message || String(err) });
      }
    }
  });`;

if(code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Replaced trigger-daily-auto-upload");
} else {
  console.log("Could not find trigger-daily-auto-upload match");
}

const regex2 = /app\.post\("\/api\/admin\/generate-ai-course", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to generate AI course", details: error\?.message \|\| String\(error\) \}\);\n    \}\n  \}\);/g;

const replacement2 = `app.post("/api/admin/generate-ai-course", async (req, res) => {
    try {
      const { topic } = req.body;
      
      const topics = [
        "Ethical Hacking & Cyber Security",
        "Android App Development with Kotlin",
        "Complete Web Development BootCamp (MERN)",
        "Python Programming & Artificial Intelligence",
        "Stock Market & Options Trading Mastery",
        "Mastering Figma: Premium UI/UX Design Course",
        "Advanced Graphic Designing & Video Editing",
        "ChatGPT & Prompt Engineering for Professionals"
      ];
      
      const selectedTopic = topic || topics[Math.floor(Math.random() * topics.length)];
      
      res.json({ success: true, course: { title: selectedTopic + " (Generating...)", category: "PENDING" }, message: "Course generation started in background." });
      
      setTimeout(async () => {
        try {
          const generatedCourse = await generateAICourseService(selectedTopic, false);
          console.log(\`[MANUAL-AUTO-UPLOAD] Successfully auto-uploaded & published course: "\${generatedCourse?.title}"!\`);
        } catch (bgErr) {
          console.error("Error generating manual AI course background:", bgErr);
        }
      }, 0);
    } catch (error: any) {
      console.error("Error generating manual AI course:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate AI course", details: error?.message || String(error) });
      }
    }
  });`;

if(code.match(regex2)) {
  code = code.replace(regex2, replacement2);
  fs.writeFileSync('server.ts', code);
  console.log("Replaced generate-ai-course");
} else {
  console.log("Could not find generate-ai-course match");
}

