#!/bin/bash
cat << 'INNER_EOF' > temp_replace.js
  app.post("/api/admin/trigger-daily-auto-upload", async (req, res) => {
    try {
      console.log("[DAILY-AUTO-UPLOAD] Admin triggered manual daily check!");
      // Send response immediately to avoid Nginx proxy timeout (60s)
      res.json({ success: true, message: "डैली कोर्स जनरेशन बैकग्राउंड में शुरू हो गया है। इसे पूरा होने में 1-2 मिनट लग सकते हैं।" });
      
      // Run the generation asynchronously in the background
      setTimeout(async () => {
        try {
          // Temporarily bypass the "already uploaded in last 24 hours" check to make it 100% force run for testing!
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
          
          // Exclude topics that match existing course titles closely
          const unusedTopics = dailyTopicsPool.filter(topic => 
            !allCourses.some(c => (c.title || "").toLowerCase().includes(topic.toLowerCase()))
          );
          
          const finalTopic = unusedTopics.length > 0 
            ? unusedTopics[Math.floor(Math.random() * unusedTopics.length)] 
            : dailyTopicsPool[Math.floor(Math.random() * dailyTopicsPool.length)] + ` v${Math.floor(Math.random() * 5) + 1}`;
            
          console.log(`[DAILY-AUTO-UPLOAD] Admin Force Run: Selected topic: "${finalTopic}"`);
          const newCourse = await generateAICourseService(finalTopic, true);
          console.log(`[DAILY-AUTO-UPLOAD] Successfully auto-uploaded & published course: "${newCourse?.title}"!`);
        } catch (bgErr) {
          console.error("[DAILY-AUTO-UPLOAD] Background generation failed:", bgErr);
        }
      }, 0);
    } catch (err: any) {
      console.error("[DAILY-AUTO-UPLOAD] Manual trigger check failed:", err);
      // We shouldn't hit this catch block normally since we respond immediately, but just in case.
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message || String(err) });
      }
    }
  });
INNER_EOF
sed -i -e '865,906c\' -e "$(cat temp_replace.js)" server.ts
