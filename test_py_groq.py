import os
import time
from dotenv import load_dotenv

load_dotenv()
os.environ["USE_LOCAL_LLM"] = "false"

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

start = time.time()
try:
    llm = ChatGroq(
        model="qwen/qwen3.6-27b",
        api_key=os.environ.get("GROQ_API_KEY")
    )
    res = llm.invoke([HumanMessage(content="Say hello in 1 word")])
    print("Success:", res.content)
except Exception as e:
    print("Failure:", e)

print(f"Latency: {int((time.time() - start) * 1000)} ms")
