import re

def insert_routing(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # regex for llm
    pattern = re.compile(r'(\n)(\s*)(self\.llm|llm)\s*=\s*ChatGroq\(model="qwen/qwen3.6-27b",\s*api_key=api_key,\s*(temperature=[\d\.]+(?:,\s*max_tokens=\d+)?)\)')
    
    def repl(m):
        nl = m.group(1)
        indent = m.group(2)
        var_name = m.group(3)
        temp_tokens = m.group(4)
        
        inner = indent + "    "
        replacement = f"""{nl}{indent}if os.environ.get("USE_LOCAL_LLM", "false").lower() == "true":
{inner}from langchain_openai import ChatOpenAI
{inner}from context import request_gateway_url
{inner}gateway_url = os.environ.get("CUSTOM_AI_API_URL")
{inner}user_url = request_gateway_url.get()
{inner}if user_url and (user_url.startswith("https://") or user_url.startswith("http://localhost")):
{inner}    gateway_url = user_url
{inner}{var_name} = ChatOpenAI(
{inner}    base_url=gateway_url,
{inner}    api_key=os.environ.get("CUSTOM_AI_API_KEY"),
{inner}    model="qwen3:8b",
{inner}    {temp_tokens}
{inner})
{indent}else:
{inner}{var_name} = ChatGroq(model="qwen/qwen3.6-27b", api_key=api_key, {temp_tokens})"""
        return replacement

    content = pattern.sub(repl, content)

    with open(filepath, 'w') as f:
        f.write(content)
    print("Patched", filepath)

insert_routing('main.py')
insert_routing('ml_router.py')
insert_routing('agents/reasoning_agent.py')
