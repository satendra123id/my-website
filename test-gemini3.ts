import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: "AIzaSyADiBcHCpW_wgH6FeAVKocZ855QekD0mKI" });
  try {
    const models = await ai.models.list();
    for await (const m of models) {
        console.log(m.name);
    }
  } catch(e) {
    console.log("List failed:", e.message);
  }
}
run();
