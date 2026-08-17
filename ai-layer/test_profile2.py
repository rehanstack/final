import os
import json
import re
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '../.env')
load_dotenv(env_path)

api_key = os.environ.get("GROQ_API_KEY")
print("API KEY:", api_key[:5] if api_key else "None")

try:
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage
    
    llm = ChatGroq(model="qwen/qwen3.6-27b", api_key=api_key, temperature=0.2)
    prompt = """You are an expert Data Scientist. I have clustered some data into 3 clusters using features: ['Income', 'Spend'].
Here are the average values for each cluster:
[
  { "cluster": 0, "count": 10, "Income_avg": 20000, "Spend_avg": 500 },
  { "cluster": 1, "count": 15, "Income_avg": 80000, "Spend_avg": 5000 },
  { "cluster": 2, "count": 5, "Income_avg": 40000, "Spend_avg": 100 }
]
Please provide a short, catchy profile name and a 1-2 sentence description for each cluster summarizing what kind of data points belong there.
Respond ONLY with a valid JSON array of objects, strictly in this format:
[
  {"cluster": 0, "name": "Premium Customers", "description": "High income and AOV with strong purchasing activity."}
]
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    print("RAW RESPONSE:", response.content)
    
    json_match = re.search(r'\[.*\]', response.content, re.DOTALL)
    if json_match:
        profiles = json.loads(json_match.group())
        print("PARSED:", profiles)
    else:
        print("NO JSON MATCH")
except Exception as e:
    import traceback
    print("ERROR:", traceback.format_exc())
