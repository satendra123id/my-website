import { db } from './src/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateMissing(title: string, description: string, missingVideos: number, missingAttachments: number, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prompt = `Generate a JSON response for a course titled "${title}" with description "${description}".
      I need exactly ${missingVideos} new video titles (short, catchy, relevant) and exactly ${missingAttachments} new PDF attachment names (e.g. "Cheat Sheet.pdf").
      Output ONLY a valid JSON object matching this structure without any markdown formatting or code blocks:
      {
        "videos": ["Title 1", "Title 2", ...],
        "attachments": ["Name 1.pdf", "Name 2.pdf", ...]
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });
      
      let text = response.text || '';
      if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
      
      const data = JSON.parse(text);
      return data;
    } catch (err: any) {
      console.error(`Attempt ${attempt} failed for ${title}`, err.message);
      if (attempt === retries) return null;
      await sleep(2000 * attempt);
    }
  }
}

async function fix() {
  const snapshot = await getDocs(collection(db, 'courses'));
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    let videos = data.videos || [];
    let attachments = data.attachments || [];
    
    videos = videos.filter((v:any) => !v.id.startsWith('v_added_'));
    attachments = attachments.filter((a:any) => !a.id.startsWith('a_added_'));

    const neededVideos = Math.max(0, 5 - videos.length);
    const neededAttachments = Math.max(0, 5 - attachments.length);

    if (neededVideos > 0 || neededAttachments > 0) {
      console.log(`Generating for ${data.title}: ${neededVideos} videos, ${neededAttachments} attachments`);
      const generated = await generateMissing(data.title, data.description || data.title, neededVideos, neededAttachments);
      
      if (generated) {
        if (neededVideos > 0 && generated.videos && Array.isArray(generated.videos)) {
          let aiVids = generated.videos.slice(0, neededVideos);
          aiVids.forEach((title: string, i: number) => {
            videos.push({
              id: `v_ai_${Date.now()}_${i}`,
              title,
              url: 'https://www.youtube.com/watch?v=kYJ462wX1i0',
              isVerified: true
            });
          });
        }
        if (neededAttachments > 0 && generated.attachments && Array.isArray(generated.attachments)) {
          let aiAtts = generated.attachments.slice(0, neededAttachments);
          aiAtts.forEach((name: string, i: number) => {
            attachments.push({
              id: `a_ai_${Date.now()}_${i}`,
              name,
              url: 'https://raw.githubusercontent.com/duong-g/react-cheat-sheet/master/react-cheat-sheet.pdf',
              size: '1.5 MB',
              isVerified: true
            });
          });
        }
        
        await updateDoc(doc(db, 'courses', docSnapshot.id), {
          videos,
          attachments,
          lecturesCount: videos.length,
          filesCount: attachments.length
        });
        console.log(`Updated course ${data.title} successfully.`);
      }
    } else {
      console.log(`Course ${data.title} already has ${videos.length} videos and ${attachments.length} attachments`);
    }
  }
}

fix().catch(console.error);
