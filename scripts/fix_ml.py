import re

with open('ai-layer/ml_router.py', 'r') as f:
    content = f.read()

# The injection added this exact string:
bad_str = "\n        import re\n        if hasattr(response, 'content'):\n            response.content = re.sub(r'<think>.*?</think>\\s*', '', response.content, flags=re.DOTALL)\n"

# We remove it.
content = content.replace(bad_str, "")

# Now we re-apply it properly, using the matched indentation!
def repl(m):
    indent = m.group(1)
    return m.group(0) + f"\n{indent}import re\n{indent}if hasattr(response, 'content'):\n{indent}    response.content = re.sub(r'<think>.*?</think>\\\\s*', '', response.content, flags=re.DOTALL)\n"

content = re.sub(r'(\s*)latency = int\(\(time\.time\(\) - start_time\) \* 1000\)', repl, content)

with open('ai-layer/ml_router.py', 'w') as f:
    f.write(content)
