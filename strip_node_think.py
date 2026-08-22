import re

with open('backend/server.js', 'r') as f:
    content = f.read()

# I want to intercept the result.choices[0].message.content
# In getLLMClient proxy, I have:
# const result = await groq.chat.completions.create(params);
# I should just modify result.choices[0].message.content if it exists

replacement = """const result = await groq.chat.completions.create(params);
              if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
                  result.choices[0].message.content = result.choices[0].message.content.replace(/<think>[\\s\\S]*?<\\/think>\\s*/g, '');
              }"""
content = content.replace("const result = await groq.chat.completions.create(params);", replacement)

# And similarly for the openai fallback proxy:
# const result = await openai.chat.completions.create(newParams);
replacement2 = """const result = await openai.chat.completions.create(newParams);
                if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
                    result.choices[0].message.content = result.choices[0].message.content.replace(/<think>[\\s\\S]*?<\\/think>\\s*/g, '');
                }"""
content = content.replace("const result = await openai.chat.completions.create(newParams);", replacement2)

with open('backend/server.js', 'w') as f:
    f.write(content)
print("Stripped think tags in Node")
