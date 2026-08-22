import re

with open('backend/server.js', 'r') as f:
    content = f.read()

replacement = """const getLLMClient = (req) => {
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
            const start = Date.now();
            const newParams = { ...params, model: 'qwen3:8b' };
            try {
                const result = await openai.chat.completions.create(newParams);
                const latency = Date.now() - start;
                console.log(`\\n[AI PROVIDER] OLLAMA (via Gateway)\\n[MODEL] qwen3:8b\\n[STATUS] SUCCESS\\n[LATENCY] ${latency} ms\\n`);
                return result;
            } catch(e) {
                const latency = Date.now() - start;
                console.log(`\\n[AI PROVIDER] OLLAMA (via Gateway)\\n[MODEL] qwen3:8b\\n[STATUS] ERROR (${e.message})\\n[LATENCY] ${latency} ms\\n`);
                throw e;
            }
          }
        }
      }
    };
  }
  
  return {
    chat: {
      completions: {
        create: async (params) => {
          const start = Date.now();
          const targetModel = params.model || 'openai/gpt-oss-20b';
          try {
              const result = await groq.chat.completions.create(params);
              const latency = Date.now() - start;
              console.log(`\\n[AI PROVIDER] GROQ\\n[MODEL] ${targetModel}\\n[STATUS] SUCCESS\\n[LATENCY] ${latency} ms\\n`);
              return result;
          } catch(e) {
              const latency = Date.now() - start;
              console.log(`\\n[AI PROVIDER] GROQ\\n[MODEL] ${targetModel}\\n[STATUS] ERROR (${e.message})\\n[LATENCY] ${latency} ms\\n`);
              throw e;
          }
        }
      }
    }
  };
}"""

# Replace the existing function
content = re.sub(r'const getLLMClient = \(req\) => \{.*?return groq; // Fallback to original Groq implementation\n\}', replacement, content, flags=re.DOTALL)

with open('backend/server.js', 'w') as f:
    f.write(content)
