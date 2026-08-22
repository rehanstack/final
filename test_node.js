import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const openai = new OpenAI({
  baseURL: process.env.CUSTOM_AI_API_URL,
  apiKey: process.env.CUSTOM_AI_API_KEY || 'super_secret_local_key_123'
});

async function run() {
  console.log("Testing Node Qwen3...");
  const start = Date.now();
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'qwen3:8b',
      messages: [{ role: 'user', content: 'Say hello in 1 word' }]
    });
    console.log("Success:", JSON.stringify(chatCompletion.choices[0].message.content));
  } catch (err) {
    console.error("Failure:", err.message);
  }
  console.log("Latency:", Date.now() - start, "ms");
}

run();
