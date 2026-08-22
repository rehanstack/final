import os
import sys
import time
from dotenv import load_dotenv

sys.path.append('ai-layer')
load_dotenv()
os.environ["USE_LOCAL_LLM"] = "true"

from context import request_gateway_url
request_gateway_url.set("https://inf-enquiry-reliance-ski.trycloudflare.com/v1")

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

start = time.time()
try:
    gateway_url = os.environ.get("CUSTOM_AI_API_URL")
    user_url = request_gateway_url.get()
    if user_url and (user_url.startswith("https://") or user_url.startswith("http://localhost")):
        gateway_url = user_url

    llm = ChatOpenAI(
        base_url=gateway_url,
        api_key=os.environ.get("CUSTOM_AI_API_KEY"),
        model="qwen3:8b"
    )
    res = llm.invoke([HumanMessage(content="Say hello in exactly 1 word.")])
    print("Success:", res.content)
except Exception as e:
    print("Failure:", e)

print(f"Latency: {int((time.time() - start) * 1000)} ms")
