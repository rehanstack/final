import Groq from 'groq-sdk'
import OpenAI from 'openai'

export const getAiForwardHeaders = (req) => {
  if (req?.headers?.['x-ai-gateway-url']) {
    return { headers: { 'x-ai-gateway-url': req.headers['x-ai-gateway-url'] } }
  }
  return {}
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
})

export const getLLMClient = (req) => {
  if (process.env.USE_LOCAL_LLM === 'true') {
    let gatewayUrl = process.env.CUSTOM_AI_API_URL;
    const userUrl = req?.headers?.['x-ai-gateway-url'];
    if (userUrl) {
      try {
        const urlObj = new URL(userUrl);
        if (urlObj.protocol === 'https:' || (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost')) {
          gatewayUrl = userUrl;
        }
      } catch (e) {}
    }

    const openai = new OpenAI({ baseURL: gatewayUrl, apiKey: process.env.CUSTOM_AI_API_KEY || '' });
    
    return {
      chat: { completions: {
          create: async (params) => {
            const start = Date.now();
            const newParams = { ...params, model: 'qwen3:8b' };
            try {
                const result = await openai.chat.completions.create(newParams);
                if (result?.choices?.[0]?.message?.content) {
                    result.choices[0].message.content = result.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
                }
                const latency = Date.now() - start;
                console.log(`\n[AI PROVIDER] OLLAMA (via Gateway)\n[MODEL] qwen3:8b\n[STATUS] SUCCESS\n[LATENCY] ${latency} ms\n`);
                return result;
            } catch(e) {
                const latency = Date.now() - start;
                console.log(`\n[AI PROVIDER] OLLAMA\n[STATUS] ERROR (${e.message})\n[LATENCY] ${latency} ms\n`);
                throw e;
            }
          }
      }}
    };
  }
  
  return {
    chat: { completions: {
        create: async (params) => {
          const start = Date.now();
          const targetModel = params.model || 'openai/gpt-oss-20b';
          try {
              const result = await groq.chat.completions.create(params);
              if (result?.choices?.[0]?.message?.content) {
                  result.choices[0].message.content = result.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
              }
              const latency = Date.now() - start;
              console.log(`\n[AI PROVIDER] GROQ\n[MODEL] ${targetModel}\n[STATUS] SUCCESS\n[LATENCY] ${latency} ms\n`);
              return result;
          } catch(e) {
              const latency = Date.now() - start;
              console.log(`\n[AI PROVIDER] GROQ\n[MODEL] ${targetModel}\n[STATUS] ERROR (${e.message})\n[LATENCY] ${latency} ms\n`);
              throw e;
          }
        }
    }}
  };
}
