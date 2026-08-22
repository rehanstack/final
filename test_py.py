import os
import time
from dotenv import load_dotenv

load_dotenv()

os.environ["USE_LOCAL_LLM"] = "true"

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

start = time.time()
try:
    llm = ChatOpenAI(
        base_url=os.environ.get("CUSTOM_AI_API_URL"),
        api_key=os.environ.get("CUSTOM_AI_API_KEY", "super_secret_local_key_123"),
        model="qwen3:8b"
    )
    res = llm.invoke([HumanMessage(content="Say hello in 1 word")])
    print("Success:", res.content)
except Exception as e:
    print("Failure:", e)

print(f"Latency: {int((time.time() - start) * 1000)} ms")
