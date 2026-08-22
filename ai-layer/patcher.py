def patch_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        if 'if os.environ.get("USE_LOCAL_LLM", "false").lower() == "true":' in line:
            indent = line[:line.find('if')]
            out.append(line)
            # Find next line (from langchain_openai import ChatOpenAI)
            i += 1
            out.append(lines[i]) # from langchain_openai import ChatOpenAI
            
            # Inject context getter
            inner_indent = indent + "    "
            out.append(inner_indent + "from context import request_gateway_url\n")
            out.append(inner_indent + "gateway_url = os.environ.get('CUSTOM_AI_API_URL')\n")
            out.append(inner_indent + "user_url = request_gateway_url.get()\n")
            out.append(inner_indent + "if user_url and (user_url.startswith('https://') or user_url.startswith('http://localhost')):\n")
            out.append(inner_indent + "    gateway_url = user_url\n")
            
            # Advance to the llm = ChatOpenAI( line
            while True:
                i += 1
                if 'llm = ChatOpenAI(' in lines[i]:
                    # Replace base_url line!
                    out.append(lines[i])
                    i += 1
                    # Ensure next line is base_url
                    out.append(inner_indent + "    base_url=gateway_url,\n")
                    break
        else:
            out.append(line)
        i += 1

    with open(filepath, 'w') as f:
        f.write("".join(out))

patch_file('main.py')
patch_file('ml_router.py')
patch_file('agents/reasoning_agent.py')
