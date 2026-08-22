import re

with open('server.js', 'r') as f:
    content = f.read()

# Replace getLLMClient() calls
content = content.replace('getLLMClient()', 'getLLMClient(req)')

# Replace the factory definition
factory = '''// Provider Selection logic for Phase 4 Safe Dual-LLM
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
        // Invalid URL, fallback to default
      }
    }

    const openai = new OpenAI({
      baseURL: gatewayUrl,
      apiKey: process.env.CUSTOM_AI_API_KEY || ''
    });
    
    // Proxy to override model parameter for OpenAI
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
  return groq; // Fallback to original Groq implementation
}'''

# Match the old factory
old_factory_regex = re.compile(r'// Provider Selection logic for Phase 4 Safe Dual-LLM\nconst getLLMClient = \(\) => \{.*?return groq; // Fallback to original Groq implementation\n\}', re.DOTALL)
content = old_factory_regex.sub(factory, content)

with open('server.js', 'w') as f:
    f.write(content)

print("Patched server.js")
