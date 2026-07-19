import { GoogleGenAI } from "@google/genai";
async function run() {
  const newMasterKey = "AQ.Ab8RN6IkkmvxTJOJuxjoqWCEsYwHvWqH56AznY0a6oaWcGi3KQ";
  const oldFallbackKey = "AQ.Ab8RN6Il3NM6do6TunzfVuxOz5EW2EO3k8iDVOnuHiHVuoYN1Q";

  console.log("--- Testing New Master Key ---");
  const aiMaster = new GoogleGenAI({ apiKey: newMasterKey });
  try {
    const res = await aiMaster.models.generateContent({ model: "gemini-3.5-flash", contents: "Hello" });
    console.log("Master Key Success:", res.text);
  } catch(e: any) {
    console.log("Master Key Failed:", e.message);
  }

  console.log("\n--- Testing Old Fallback Key ---");
  const aiFallback = new GoogleGenAI({ apiKey: oldFallbackKey });
  try {
    const res = await aiFallback.models.generateContent({ model: "gemini-3.5-flash", contents: "Hello" });
    console.log("Fallback Key Success:", res.text);
  } catch(e: any) {
    console.log("Fallback Key Failed:", e.message);
  }
}
run();
