import Groq from 'groq-sdk'
import OpenAI from 'openai'

export const getAiForwardHeaders = (req) => {
  if (req?.headers?.['x-ai-gateway-url']) {
    return { headers: { 'x-ai-gateway-url': req.headers['x-ai-gateway-url'] } }
  }
  return {}
}

const getGroqApiKey = (req) => {
  return (
    req?.headers?.['x-groq-api-key'] ||
    process.env.GROQ_API_KEY ||
    ''
  )
}

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
  
  // Dynamically instantiate Groq client using latest environment key
  const apiKey = getGroqApiKey(req);
  const groq = new Groq({ apiKey });

  return {
    chat: { completions: {
        create: async (params) => {
          const start = Date.now();
          // Normalize model: upgrade legacy/low-TPM models to llama-3.3-70b-versatile
          let targetModel = params.model || 'llama-3.3-70b-versatile';
          if (targetModel === 'openai/gpt-oss-20b' || targetModel === 'qwen/qwen3.6-27b') {
            targetModel = 'llama-3.3-70b-versatile';
          }

          // Cap max_tokens to prevent reserving entire TPM quota on Groq free tier
          const safeParams = {
            ...params,
            model: targetModel,
            max_tokens: Math.min(params.max_tokens || 1200, 1200)
          };

          try {
              const result = await groq.chat.completions.create(safeParams);
              if (result?.choices?.[0]?.message?.content) {
                  result.choices[0].message.content = result.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
              }
              const latency = Date.now() - start;
              console.log(`\n[AI PROVIDER] GROQ\n[MODEL] ${safeParams.model}\n[STATUS] SUCCESS\n[LATENCY] ${latency} ms\n`);
              return result;
          } catch(e) {
              const isRateLimit = e.status === 429 || (e.message && e.message.includes('429'));
              // Automatic Model Fallback on 429 Rate Limit
              if (isRateLimit && safeParams.model !== 'llama-3.1-8b-instant') {
                console.warn(`\n[AI PROVIDER] GROQ Rate Limit (429) hit on ${safeParams.model}. Automatically falling back to high-throughput llama-3.1-8b-instant...\n`);
                try {
                  const fallbackParams = {
                    ...safeParams,
                    model: 'llama-3.1-8b-instant',
                    max_tokens: Math.min(safeParams.max_tokens || 1000, 1000)
                  };
                  const fallbackResult = await groq.chat.completions.create(fallbackParams);
                  if (fallbackResult?.choices?.[0]?.message?.content) {
                    fallbackResult.choices[0].message.content = fallbackResult.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
                  }
                  const latency = Date.now() - start;
                  console.log(`\n[AI PROVIDER] GROQ (Fallback)\n[MODEL] llama-3.1-8b-instant\n[STATUS] SUCCESS\n[LATENCY] ${latency} ms\n`);
                  return fallbackResult;
                } catch(fallbackErr) {
                  console.error(`\n[AI PROVIDER] GROQ Fallback (llama-3.1-8b-instant) error:`, fallbackErr.message || fallbackErr);
                  throw fallbackErr;
                }
              }

              const latency = Date.now() - start;
              console.log(`\n[AI PROVIDER] GROQ\n[MODEL] ${safeParams.model}\n[STATUS] ERROR (${e.message})\n[LATENCY] ${latency} ms\n`);
              throw e;
          }
        }
    }}
  };
}
