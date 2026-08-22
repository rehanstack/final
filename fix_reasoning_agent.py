import re

with open('ai-layer/agents/reasoning_agent.py', 'r') as f:
    content = f.read()

broken_block = """            import time
            start_time = time.time()
            msg = self.llm.invoke([HumanMessage(content=prompt)])
            latency = int((time.time() - start_time) * 1000)
        import re
        if hasattr(response, 'content'):
            response.content = re.sub(r'<think>.*?</think>\\s*', '', response.content, flags=re.DOTALL)

            provider = "GROQ" if os.environ.get("USE_LOCAL_LLM", "false").lower() != "true" else "OLLAMA (via Gateway)"
            model_name = "qwen/qwen3.6-27b" if provider == "GROQ" else "qwen3:8b"
            print(f"\\n[AI PROVIDER] {provider}\\n[MODEL] {model_name}\\n[STATUS] SUCCESS\\n[LATENCY] {latency} ms\\n")"""

fixed_block = """            import time
            start_time = time.time()
            msg = self.llm.invoke([HumanMessage(content=prompt)])
            latency = int((time.time() - start_time) * 1000)
            
            import re
            if hasattr(msg, 'content'):
                msg.content = re.sub(r'<think>.*?</think>\\s*', '', msg.content, flags=re.DOTALL)
                
            provider = "GROQ" if os.environ.get("USE_LOCAL_LLM", "false").lower() != "true" else "OLLAMA (via Gateway)"
            model_name = "qwen/qwen3.6-27b" if provider == "GROQ" else "qwen3:8b"
            print(f"\\n[AI PROVIDER] {provider}\\n[MODEL] {model_name}\\n[STATUS] SUCCESS\\n[LATENCY] {latency} ms\\n")"""

content = content.replace(broken_block, fixed_block)

with open('ai-layer/agents/reasoning_agent.py', 'w') as f:
    f.write(content)
print("Fixed reasoning_agent.py")
