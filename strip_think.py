import re

def repl(m):
    return m.group(0) + "\n        import re\n        if hasattr(response, 'content'):\n            response.content = re.sub(r'<think>.*?</think>\\s*', '', response.content, flags=re.DOTALL)\n"

for filename in ['ai-layer/main.py', 'ai-layer/ml_router.py', 'ai-layer/agents/reasoning_agent.py']:
    with open(filename, 'r') as f:
        content = f.read()
    content = re.sub(r'latency = int\(\(time\.time\(\) - start_time\) \* 1000\)', repl, content)
    with open(filename, 'w') as f:
        f.write(content)
print("Stripped think tags in Python")
