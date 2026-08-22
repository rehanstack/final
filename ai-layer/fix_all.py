import re

def fix(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the block starting with from langchain_openai import ChatOpenAI up to base_url=gateway_url,
    # and adjust indentation so it matches the if statement.

    pattern = re.compile(
        r'^(\s*)if os\.environ\.get\("USE_LOCAL_LLM", "false"\)\.lower\(\) == "true":\n'
        r'\s*from langchain_openai import ChatOpenAI\n'
        r'\s*from context import request_gateway_url\n'
        r'(.*?)(llm = ChatOpenAI\()', re.DOTALL | re.MULTILINE
    )

    def repl(m):
        base_indent = m.group(1)
        inner_indent = base_indent + '    '
        
        middle = m.group(2)
        # Fix the middle lines to have inner_indent
        lines = middle.split('\n')
        fixed_lines = []
        for line in lines:
            if line.strip():
                fixed_lines.append(inner_indent + line.lstrip())
            else:
                fixed_lines.append('')
        
        fixed_middle = '\n'.join(fixed_lines)
        return f'{base_indent}if os.environ.get("USE_LOCAL_LLM", "false").lower() == "true":\n{inner_indent}from langchain_openai import ChatOpenAI\n{inner_indent}from context import request_gateway_url\n{fixed_middle}{inner_indent}{m.group(3)}'

    content = pattern.sub(repl, content)

    # There's also self.llm
    pattern2 = re.compile(
        r'^(\s*)if os\.environ\.get\("USE_LOCAL_LLM", "false"\)\.lower\(\) == "true":\n'
        r'\s*from langchain_openai import ChatOpenAI\n'
        r'\s*from context import request_gateway_url\n'
        r'(.*?)(self\.llm = ChatOpenAI\()', re.DOTALL | re.MULTILINE
    )

    content = pattern2.sub(repl, content)
    
    with open(filepath, 'w') as f:
        f.write(content)

fix('main.py')
fix('ml_router.py')
fix('agents/reasoning_agent.py')
print("Fixed files.")
