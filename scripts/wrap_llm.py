import os
import glob
import re

def wrap_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find llm.invoke(...)
    content = re.sub(r'(\s*)([a-zA-Z0-9_\.]+) = (self\.)?llm\.invoke\((.*?)\)', 
        r'''\1import time\1start_time = time.time()\1\2 = \3llm.invoke(\4)\1latency = int((time.time() - start_time) * 1000)\1provider = "GROQ" if os.environ.get("USE_LOCAL_LLM", "false").lower() != "true" else "OLLAMA (via Gateway)"\1model_name = "qwen/qwen3.6-27b" if provider == "GROQ" else "qwen3:8b"\1print(f"\\n[AI PROVIDER] {provider}\\n[MODEL] {model_name}\\n[STATUS] SUCCESS\\n[LATENCY] {latency} ms\\n")''', content)

    with open(filepath, 'w') as f:
        f.write(content)

wrap_file('ai-layer/main.py')
wrap_file('ai-layer/ml_router.py')
wrap_file('ai-layer/agents/reasoning_agent.py')
print("Wrapped python files.")
