# Guide to Build Android APK | APK बनाने का आसान तरीका 📱

Aapki application me **Capacitor** (native mobile wrapping engine) fully integrated aur configured ho chuka hai. App built successfully with zero errors.

Aap build **do tareeqo** se bana sakte hain:

---

## Method 1: Cloud Build (GitHub se completely FREE aur automatic) - Recommended 🚀

Aapko apne computer par kuch bhi install karne ki zaroorat nahi hai. GitHub actions aapke liye auto-build karega:

1. **GitHub par Code Export karein**: AI Studio ke top-right settings menu me jaakar "Export to GitHub" par click karein aur repository connect karein.
2. **GitHub Repository me jayein**: Apni newly created repository me GitHub website par jayein.
3. **Actions Tab me jayein**: Vahan **"Actions"** tab par click karein.
4. **Select Workflow**: Left side me **"Build Android APK"** workflow select karein.
5. **Run Workflow**: **"Run workflow"** button par click karein.
6. **Download APK**: Kuch hi minutes me build complete ho jayegi. Green tick aane ke baad build summary ke niche **"app-debug-apk"** par click karke aap direct `.apk` file download kar sakte hain aur apne phone par install kar sakte hain!

---

## Method 2: Local Build (Apne Laptop/Computer par) 💻

Agar aap apne computer par build karna chahte hain, toh in steps ko follow karein:

### Prerequisites:
1. **Node.js** installed hona chahiye.
2. **Android Studio** installed hona chahiye (aur Android SDK configured ho).
3. **Java JDK 17** installed hona chahiye.

### Steps to Build:
1. **Project download karein**: ZIP file download karke extract karein.
2. **Terminal open karein** project folder me aur execute karein:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
3. **Android Studio me Open karein**:
   ```bash
   npx cap open android
   ```
   (Yeh automatic Android Studio open kar dega).
4. **APK Compile karein**:
   - Android Studio ke top menu me jayein: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   - Build complete hote hi niche prompt aayega "APK(s) generated successfully". **"Locate"** par click karein aur aapko aapki `.apk` file mil jayegi!
