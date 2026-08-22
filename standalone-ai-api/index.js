import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const CUSTOM_AI_API_KEY = process.env.CUSTOM_AI_API_KEY;

if (!CUSTOM_AI_API_KEY) {
  console.error("CRITICAL: CUSTOM_AI_API_KEY is not set in environment variables.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({
      error: { message: "Unauthorized. Missing token." }
    });
  }

  if (token !== CUSTOM_AI_API_KEY) {
    return res.status(403).json({
      error: { message: "Forbidden. Invalid token." }
    });
  }

  next();
};

// Standalone AI Gateway endpoint (OpenAI compatible)
app.post('/v1/chat/completions', authenticateToken, async (req, res) => {
  try {
    const ollamaRequest = {
      model: req.body.model || 'qwen3:8b', // Always forward to qwen3:8b by default if not set
      messages: req.body.messages,
      stream: false // Streaming is not currently used by DBSenseAI workflows
    };

    // Forward temperature if present
    if (req.body.temperature !== undefined) {
      // In Ollama, options such as temperature go into the 'options' object
      ollamaRequest.options = {
        temperature: req.body.temperature
      };
    }

    // Forward JSON formatting if requested
    if (req.body.response_format && req.body.response_format.type === 'json_object') {
      ollamaRequest.format = 'json';
    }

    // Forward request to local Ollama instance (transparent proxy phase)
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, ollamaRequest, {
      headers: { 'Content-Type': 'application/json' }
    });

    // We must validate that if JSON was requested, it is actually valid JSON
    let content = response.data.message.content;
    if (req.body.response_format && req.body.response_format.type === 'json_object') {
      try {
        JSON.parse(content);
      } catch (err) {
        console.error("Warning: Ollama returned invalid JSON when json_object was requested.");
        // Deferring automated repair to a later phase as instructed.
        // We simply pass it through for now and let the application handle the failure.
      }
    }

    // Transform Ollama's response back to OpenAI's format
    const openAICompatibleResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: response.data.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: content
          },
          finish_reason: response.data.done_reason || "stop"
        }
      ],
      usage: {
        prompt_tokens: response.data.prompt_eval_count || 0,
        completion_tokens: response.data.eval_count || 0,
        total_tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      }
    };

    res.json(openAICompatibleResponse);
  } catch (error) {
    console.error("Gateway Error connecting to Ollama:", error.message);
    res.status(500).json({
      error: {
        message: "Failed to communicate with local Ollama runtime.",
        details: error.message
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 DBSenseAI Standalone Gateway running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication enabled. Ollama endpoint proxying to ${OLLAMA_BASE_URL}`);
});
