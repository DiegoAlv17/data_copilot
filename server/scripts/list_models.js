const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // There isn't a direct listModels method in the high-level SDK easily accessible without looking at docs, 
    // but we can try to just run a simple generation to see if it works.
    
    console.log("Testing gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Testing gemini-pro...");
    const result2 = await model2.generateContent("Hello");
    console.log("Success with gemini-pro:", result2.response.text());
  } catch (error) {
    console.error("Error with gemini-pro:", error.message);
  }
}

listModels();
