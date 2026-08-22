import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
process.env.USE_LOCAL_LLM = 'false';

import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getLLMClient = (req) => {
  if (process.env.USE_LOCAL_LLM === 'true') {
    return null;
  }
  return groq;
}

async function run() {
  console.log("Testing Node Groq Fallback...");
  const start = Date.now();
  try {
    const chatCompletion = await getLLMClient({}).chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Say hello in 1 word' }]
    });
    console.log("Success:", JSON.stringify(chatCompletion.choices[0].message.content));
  } catch (err) {
    console.error("Failure:", err.message);
  }
  console.log("Latency:", Date.now() - start, "ms");
}

run();
