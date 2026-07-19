import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: "AIzaSyADiBcHCpW_wgH6FeAVKocZ855QekD0mKI" });
  try {
    const res = await ai.models.generateContent({ model: "gemini-1.5-flash", contents: "Hello" });
    console.log("1.5 success:", res.text);
  } catch(e) {
    console.log("1.5 failed:", e.message);
  }
}
run();
