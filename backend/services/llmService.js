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
          // Normalize model: use active Groq model with massive TPM (250,000 TPM limit)
          let targetModel = params.model || 'openai/gpt-oss-20b';
          if (targetModel.includes('llama')) {
            targetModel = 'openai/gpt-oss-20b';
          }

          // Cap max_tokens to 700 to strictly stay within all free-tier OTPM limits
          const safeParams = {
            ...params,
            model: targetModel,
            max_tokens: Math.min(params.max_tokens || 700, 700)
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
              const errorMsg = String(e.message || '');
              const shouldFallback = 
                e.status === 404 ||
                e.status === 429 ||
                e.status === 400 ||
                e.status === 413 ||
                e.code === 'model_not_found' ||
                e.code === 'rate_limit_exceeded' ||
                errorMsg.includes('does not exist') ||
                errorMsg.includes('model_not_found') ||
                errorMsg.includes('429') ||
                errorMsg.includes('tokens per minute') ||
                errorMsg.includes('OTPM') ||
                errorMsg.includes('TPM') ||
                errorMsg.includes('Request too large');

              // Automatic Model Fallback to qwen/qwen3.6-27b with safe 500 tokens
              const fallbackModel = safeParams.model === 'openai/gpt-oss-20b' ? 'qwen/qwen3.6-27b' : 'openai/gpt-oss-20b';
              if (shouldFallback && safeParams.model !== fallbackModel) {
                console.warn(`\n[AI PROVIDER] GROQ error on ${safeParams.model} (${errorMsg}). Automatically falling back to ${fallbackModel}...\n`);
                try {
                  const fallbackParams = {
                    ...safeParams,
                    model: fallbackModel,
                    max_tokens: Math.min(safeParams.max_tokens || 500, 500)
                  };
                  const fallbackResult = await groq.chat.completions.create(fallbackParams);
                  if (fallbackResult?.choices?.[0]?.message?.content) {
                    fallbackResult.choices[0].message.content = fallbackResult.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
                  }
                  const latency = Date.now() - start;
                  console.log(`\n[AI PROVIDER] GROQ (Fallback)\n[MODEL] ${fallbackModel}\n[STATUS] SUCCESS\n[LATENCY] ${latency} ms\n`);
                  return fallbackResult;
                } catch(fallbackErr) {
                  console.error(`\n[AI PROVIDER] GROQ Fallback (${fallbackModel}) error:`, fallbackErr.message || fallbackErr);
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
