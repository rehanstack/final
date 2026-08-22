import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const req = {
  headers: {
    'x-ai-gateway-url': 'https://straight-memo-securities-lincoln.trycloudflare.com/v1'
  }
};

const getLLMClient = (req) => {
  if (process.env.USE_LOCAL_LLM === 'true') {
    let gatewayUrl = process.env.CUSTOM_AI_API_URL;
    
    const userUrl = req?.headers?.['x-ai-gateway-url'];
    if (userUrl) {
      try {
        const urlObj = new URL(userUrl);
        if (urlObj.protocol === 'https:' || (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost')) {
          gatewayUrl = userUrl;
        }
      } catch (e) {
      }
    }

    const openai = new OpenAI({
      baseURL: gatewayUrl,
      apiKey: process.env.CUSTOM_AI_API_KEY || ''
    });
    
    return {
      chat: {
        completions: {
          create: async (params) => {
            const newParams = { ...params, model: 'qwen3:8b' };
            return await openai.chat.completions.create(newParams);
          }
        }
      }
    };
  }
  return null;
}

async function run() {
  console.log("Testing Node Override...");
  const start = Date.now();
  try {
    const chatCompletion = await getLLMClient(req).chat.completions.create({
      model: 'ignore_this',
      messages: [{ role: 'user', content: 'Say hello in 1 word' }]
    });
    console.log("Success:", JSON.stringify(chatCompletion.choices[0].message.content));
  } catch (err) {
    console.error("Failure:", err.message);
  }
  console.log("Latency:", Date.now() - start, "ms");
}

run();
